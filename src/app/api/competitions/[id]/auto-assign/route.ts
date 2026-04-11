import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  submissions,
  organizations,
  judgeAssignments,
  judgeEvaluations,
  teams,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { createNotification } from "@/lib/services/notification";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/competitions/[id]/auto-assign
 *
 * Distributes valid submissions equally among all judges assigned to this
 * competition (round-robin). Sends each judge a targeted notification
 * listing the submissions they should evaluate.
 *
 * Auth: competition organizer or admin only.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: competitionId } = await params;

    const dbUser = await resolveOnboardingUser(clerkId);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch competition + org to verify ownership
    const [competition] = await db
      .select({
        id: competitions.id,
        title: competitions.title,
        createdBy: competitions.createdBy,
        organizationId: competitions.organizationId,
        orgOwnerId: organizations.ownerId,
      })
      .from(competitions)
      .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
      .where(eq(competitions.id, competitionId));

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (dbUser.role !== "admin" && competition.orgOwnerId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all judges assigned to this competition
    const assignedJudges = await db
      .select({
        judgeId: judgeAssignments.judgeId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(judgeAssignments)
      .innerJoin(users, eq(judgeAssignments.judgeId, users.id))
      .where(eq(judgeAssignments.competitionId, competitionId));

    if (assignedJudges.length === 0) {
      return NextResponse.json(
        { error: "No judges assigned to this competition" },
        { status: 400 },
      );
    }

    // Fetch valid/AI-evaluated submissions eligible for judging
    const eligibleStatuses = ["submitted", "valid", "ai_evaluated"] as const;
    const eligibleSubmissions = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        teamName: teams.name,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(
        and(
          eq(submissions.competitionId, competitionId),
          inArray(submissions.status, [...eligibleStatuses]),
        ),
      );

    if (eligibleSubmissions.length === 0) {
      return NextResponse.json(
        { error: "No eligible submissions to assign (need status: submitted, valid, or ai_evaluated)" },
        { status: 400 },
      );
    }

    // Round-robin distribution: group submissions by judge
    const judgeSubmissions: Record<string, typeof eligibleSubmissions> = {};
    for (const judge of assignedJudges) {
      judgeSubmissions[judge.judgeId] = [];
    }

    eligibleSubmissions.forEach((sub, i) => {
      const judge = assignedJudges[i % assignedJudges.length];
      judgeSubmissions[judge.judgeId].push(sub);
    });

    // Persist submission-to-judge assignments in a single transaction, track new inserts
    const newAssignments: Record<string, string[]> = {};
    await db.transaction(async (tx) => {
      for (const [judgeId, subs] of Object.entries(judgeSubmissions)) {
        newAssignments[judgeId] = [];
        for (const sub of subs) {
          const [inserted] = await tx
            .insert(judgeEvaluations)
            .values({ judgeId, submissionId: sub.id })
            .onConflictDoNothing()
            .returning({ submissionId: judgeEvaluations.submissionId });
          if (inserted) newAssignments[judgeId].push(sub.id);
        }
      }
    });

    // Only notify judges who received NEW assignments (skip duplicates)
    const notificationPromises = assignedJudges
      .filter((j) => (newAssignments[j.judgeId]?.length ?? 0) > 0)
      .map((judge) => {
        const newSubIds = new Set(newAssignments[judge.judgeId]);
        const newSubs = judgeSubmissions[judge.judgeId].filter((s) => newSubIds.has(s.id));
        const subList = newSubs
          .map((s) => `• ${s.title} (by ${s.teamName})`)
          .join("\n");
        return createNotification({
          userId: judge.judgeId,
          type: "judge_assigned",
          title: `${newSubs.length} submission${newSubs.length !== 1 ? "s" : ""} assigned to you`,
          message: `You have been auto-assigned to evaluate the following in "${competition.title}":\n${subList}`,
          link: `/judge/assignments`,
        });
      });

    await Promise.all(notificationPromises);

    const totalNew = Object.values(newAssignments).reduce((sum, ids) => sum + ids.length, 0);
    return NextResponse.json({
      success: true,
      assigned: assignedJudges.length,
      submissions: eligibleSubmissions.length,
      newAssignments: totalNew,
      distribution: Object.fromEntries(
        assignedJudges.map((j) => [
          [j.firstName, j.lastName].filter(Boolean).join(" ") || j.judgeId,
          judgeSubmissions[j.judgeId]?.length ?? 0,
        ]),
      ),
    });
  } catch (error) {
    return apiError(error, "Auto-assign failed");
  }
}
