/**
 * AI evaluation service.
 *
 * Fetches a submission's GitHub README and file tree, builds a prompt
 * with the competition's judging criteria, sends it to GPT-4o, and
 * persists the scored result to ai_evaluations.
 */

import { db } from "@/lib/db";
import { submissions, aiEvaluations, competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseGitHubUrl } from "./github";

// ────────────────────────── types ──────────────────────────

interface AiScores {
  innovation: number;
  technical: number;
  impact: number;
  design: number;
}

interface AiResponse {
  summary: string;
  scores: AiScores;
  flags: string[];
}

// ────────────────────────── helpers ─────────────────────────

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "CompetitionSpark-AIJudge",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    {
      headers: {
        ...githubHeaders(),
        Accept: "application/vnd.github.v3.raw",
      },
    }
  );

  if (!res.ok) {
    return "(README not available)";
  }

  const text = await res.text();
  // Truncate to ~8 000 chars to stay within prompt limits
  return text.length > 8000 ? text.slice(0, 8000) + "\n...(truncated)" : text;
}

async function fetchFileTree(
  owner: string,
  repo: string
): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: githubHeaders() }
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.tree ?? []).map((entry: any) => entry.path as string);
}

function buildPrompt(
  readme: string,
  fileTree: string[],
  title: string,
  description: string,
  judgingCriteria: { name: string; description: string; weight: number; maxScore: number }[] | null
): string {
  const criteriaBlock =
    judgingCriteria && judgingCriteria.length > 0
      ? judgingCriteria
          .map(
            (c) =>
              `- ${c.name} (weight ${c.weight}%, max ${c.maxScore}): ${c.description}`
          )
          .join("\n")
      : `- Innovation: Novelty and originality of the idea
- Technical: Code quality, architecture, and technical execution
- Impact: Potential real-world impact and usefulness
- Design: UI/UX design quality and user experience`;

  return `You are an expert hackathon judge. Evaluate the following project submission.

## Project
Title: ${title}
Description: ${description}

## Judging criteria
${criteriaBlock}

## README
${readme}

## Repository file tree
${fileTree.slice(0, 200).join("\n")}

---

Score the project on four dimensions. Each score is an integer from 0 to 10.

Return your evaluation as a JSON object with exactly this shape:
{
  "summary": "<2-4 sentence evaluation>",
  "scores": {
    "innovation": <0-10>,
    "technical": <0-10>,
    "impact": <0-10>,
    "design": <0-10>
  },
  "flags": ["<optional concern strings>"]
}

Return ONLY the JSON object, no other text.`;
}

// ────────────────────────── main ───────────────────────────

export async function evaluateSubmission(
  submissionId: string
): Promise<void> {
  try {
    // 1. Fetch submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // 2. Fetch competition (for judging criteria)
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, submission.competitionId));

    if (!competition) {
      throw new Error(
        `Competition ${submission.competitionId} not found for submission ${submissionId}`
      );
    }

    // 3. Fetch GitHub data
    let readme = "(No GitHub URL provided)";
    let fileTree: string[] = [];

    if (submission.githubUrl) {
      const parsed = parseGitHubUrl(submission.githubUrl);
      if (parsed) {
        [readme, fileTree] = await Promise.all([
          fetchReadme(parsed.owner, parsed.repo),
          fetchFileTree(parsed.owner, parsed.repo),
        ]);
      }
    }

    // 4. Build prompt and call OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const prompt = buildPrompt(
      readme,
      fileTree,
      submission.title,
      submission.description,
      competition.judgingCriteria
    );

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert hackathon judge. Always respond with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const body = await openaiRes.text();
      throw new Error(`OpenAI API error (${openaiRes.status}): ${body}`);
    }

    const openaiData = await openaiRes.json();
    const rawContent: string =
      openaiData.choices?.[0]?.message?.content ?? "{}";

    // 5. Parse response
    const parsed: AiResponse = JSON.parse(rawContent);

    const { innovation, technical, impact, design } = parsed.scores;
    const compositeScore =
      ((innovation + technical + impact + design) / 4 / 10) * 100;

    // 6. Write to ai_evaluations
    await db.insert(aiEvaluations).values({
      submissionId,
      summary: parsed.summary,
      scores: parsed.scores,
      compositeScore,
      flags: parsed.flags ?? [],
      modelUsed: "gpt-4o",
      rawResponse: rawContent,
    });

    // 7. Update submission
    await db
      .update(submissions)
      .set({
        aiScore: compositeScore,
        status: "ai_evaluated",
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));
  } catch (error) {
    console.error(
      `AI evaluation failed for submission ${submissionId}:`,
      error
    );
    throw error;
  }
}
