import { db } from "@/lib/db";
import {
  submissions,
  submissionValidations,
  competitions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { checkGitHubRepo } from "./github";
import { validateVideoLink } from "./video-validator";
import { createNotification } from "./notification";

type ValidationResult = "pass" | "fail" | "warning";
type CheckName = "required_fields" | "github_repo" | "video_link" | "deadline";
type FinalStatus = "valid" | "invalid" | "flagged";

interface CheckResult {
  check: CheckName;
  result: ValidationResult;
  message: string;
  details?: string;
}

// ---------- individual checks ----------

function requiredFieldsCheck(
  submission: {
    title: string;
    description: string;
    githubUrl: string | null;
    videoUrl: string | null;
    deployedUrl: string | null;
    pitchDeckUrl: string | null;
  },
  requirements: {
    githubRequired: boolean;
    videoRequired: boolean;
    deployedUrlRequired: boolean;
    pitchDeckRequired: boolean;
    maxScreenshots: number;
  }
): CheckResult {
  const schema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    githubUrl: requirements.githubRequired
      ? z.string().url("Valid GitHub URL required")
      : z.string().nullable(),
    videoUrl: requirements.videoRequired
      ? z.string().url("Valid video URL required")
      : z.string().nullable(),
    deployedUrl: requirements.deployedUrlRequired
      ? z.string().url("Valid deployed URL required")
      : z.string().nullable(),
    pitchDeckUrl: requirements.pitchDeckRequired
      ? z.string().url("Valid pitch deck URL required")
      : z.string().nullable(),
  });

  const parsed = schema.safeParse(submission);

  if (parsed.success) {
    return {
      check: "required_fields",
      result: "pass",
      message: "All required fields present",
    };
  }

  const missing = parsed.error.issues.map((i) => i.message).join("; ");
  return {
    check: "required_fields",
    result: "fail",
    message: "Missing required fields",
    details: missing,
  };
}

async function githubCheck(url: string): Promise<CheckResult> {
  const result = await checkGitHubRepo(url);

  if (!result.exists) {
    return {
      check: "github_repo",
      result: "warning",
      message: "GitHub repository not accessible",
      details: result.error,
    };
  }

  if (!result.isPublic) {
    return {
      check: "github_repo",
      result: "warning",
      message: "GitHub repository is private",
      details: "Repository must be public for judges to review",
    };
  }

  if (!result.hasCommits) {
    return {
      check: "github_repo",
      result: "warning",
      message: "GitHub repository has no commits",
      details: "Repository appears to be empty",
    };
  }

  return {
    check: "github_repo",
    result: "pass",
    message: "GitHub repository is valid and public",
  };
}

async function videoCheck(url: string): Promise<CheckResult> {
  const result = await validateVideoLink(url);

  if (result.valid) {
    return {
      check: "video_link",
      result: "pass",
      message: `Video link valid (${result.platform})`,
    };
  }

  return {
    check: "video_link",
    result: "warning",
    message: "Video link could not be verified",
    details: result.error,
  };
}

function deadlineCheck(
  submittedAt: Date,
  submissionEnd: Date | null
): CheckResult {
  if (!submissionEnd) {
    return {
      check: "deadline",
      result: "pass",
      message: "No deadline configured",
    };
  }

  if (submittedAt <= submissionEnd) {
    return {
      check: "deadline",
      result: "pass",
      message: "Submitted before deadline",
    };
  }

  return {
    check: "deadline",
    result: "fail",
    message: "Submitted after deadline",
    details: `Submitted at ${submittedAt.toISOString()}, deadline was ${submissionEnd.toISOString()}`,
  };
}

// ---------- orchestrator ----------

export async function validateSubmission(
  submissionId: string
): Promise<FinalStatus> {
  try {
    // 1. Fetch submission and competition
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      console.error(`Submission ${submissionId} not found`);
      return "invalid";
    }

    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, submission.competitionId));

    if (!competition) {
      console.error(
        `Competition ${submission.competitionId} not found for submission ${submissionId}`
      );
      return "invalid";
    }

    // Mark as validating
    await db
      .update(submissions)
      .set({ status: "validating", updatedAt: new Date() })
      .where(eq(submissions.id, submissionId));

    const requirements = competition.submissionRequirements ?? {
      githubRequired: true,
      videoRequired: true,
      deployedUrlRequired: false,
      pitchDeckRequired: false,
      maxScreenshots: 5,
    };

    // 2. Run all checks
    const results: CheckResult[] = [];

    // Required fields check
    results.push(
      requiredFieldsCheck(
        {
          title: submission.title,
          description: submission.description,
          githubUrl: submission.githubUrl,
          videoUrl: submission.videoUrl,
          deployedUrl: submission.deployedUrl,
          pitchDeckUrl: submission.pitchDeckUrl,
        },
        requirements
      )
    );

    // GitHub check
    if (requirements.githubRequired && submission.githubUrl) {
      results.push(await githubCheck(submission.githubUrl));
    }

    // Video check
    if (requirements.videoRequired && submission.videoUrl) {
      results.push(await videoCheck(submission.videoUrl));
    }

    // Deadline check
    results.push(
      deadlineCheck(submission.createdAt, competition.submissionEnd)
    );

    // 3. Save each check result
    for (const r of results) {
      await db.insert(submissionValidations).values({
        submissionId,
        check: r.check,
        result: r.result,
        message: r.message,
        details: r.details ?? null,
      });
    }

    // 4. Determine final status
    const hasHardFail = results.some(
      (r) =>
        r.result === "fail" &&
        (r.check === "required_fields" || r.check === "deadline")
    );
    const hasSoftFail = results.some((r) => r.result === "warning");

    let finalStatus: FinalStatus;
    if (hasHardFail) {
      finalStatus = "invalid";
    } else if (hasSoftFail) {
      finalStatus = "flagged";
    } else {
      finalStatus = "valid";
    }

    // 5. Update submission status
    await db
      .update(submissions)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(submissions.id, submissionId));

    // 6. Notify user if invalid or flagged
    if (finalStatus !== "valid") {
      const notificationType =
        finalStatus === "invalid" ? "submission_invalid" : "submission_flagged";

      const failedChecks = results
        .filter((r) => r.result !== "pass")
        .map((r) => r.message)
        .join(", ");

      await createNotification({
        userId: submission.submittedBy,
        type: notificationType,
        title:
          finalStatus === "invalid"
            ? "Submission Invalid"
            : "Submission Flagged for Review",
        message: `Your submission "${submission.title}" has issues: ${failedChecks}`,
        link: `/submissions/${submissionId}`,
      });
    }

    // 7. Return final status
    return finalStatus;
  } catch (error) {
    console.error(`Validation failed for submission ${submissionId}:`, error);
    return "invalid";
  }
}
