const GITHUB_REPO_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;

export function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | null {
  const match = url.trim().replace(/\.git$/, "").match(GITHUB_REPO_REGEX);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export async function checkGitHubRepo(
  url: string
): Promise<{
  exists: boolean;
  isPublic: boolean;
  hasCommits: boolean;
  error?: string;
}> {
  try {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return {
        exists: false,
        isPublic: false,
        hasCommits: false,
        error: "Invalid GitHub URL format",
      };
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CompetitionSpark-Validator",
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Check repo existence and visibility
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers }
    );

    if (repoRes.status === 404) {
      return {
        exists: false,
        isPublic: false,
        hasCommits: false,
        error: "Repository not found (may be private or deleted)",
      };
    }

    if (!repoRes.ok) {
      return {
        exists: false,
        isPublic: false,
        hasCommits: false,
        error: `GitHub API error: ${repoRes.status}`,
      };
    }

    const repoData = await repoRes.json();
    const isPublic = !repoData.private;

    // Check commits
    const commitsRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`,
      { headers }
    );

    const hasCommits = commitsRes.ok;

    return { exists: true, isPublic, hasCommits };
  } catch (error) {
    console.error("GitHub check failed:", error);
    return {
      exists: false,
      isPublic: false,
      hasCommits: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
