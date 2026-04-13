import { clerkClient } from "@clerk/nextjs/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, judgeInvitations, judgeAssignments, judgeEvaluations, submissions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { apiError } from "@/lib/api-error";
import { createNotification } from "@/lib/services/notification";

const judgeOnboardingSchema = z.object({
  expertise: z.string().min(2),
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  yearsOfExperience: z.string().min(1),
  bio: z.string().max(500).optional(),
  linkedinUrl: z.string().optional(),
});

/**
 * POST /api/onboarding/judge
 * Complete judge onboarding — saves profile, sets role, and auto-assigns pending invitations.
 *
 * @auth Required (Clerk session)
 * @body { expertise, jobTitle, company, yearsOfExperience, bio?, linkedinUrl? }
 * @returns { success: true } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = judgeOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Judge validation failed:", parsed.error.issues);
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    const dbUser = await resolveOnboardingUser(userId);
    if (!dbUser) {
      console.error("Judge onboarding: failed to resolve user for:", userId);
      return NextResponse.json({ error: "Failed to resolve user. Please try again." }, { status: 500 });
    }

    if (dbUser.role && dbUser.role !== "judge") {
      return NextResponse.json({ error: `Role already assigned as "${dbUser.role}".` }, { status: 403 });
    }

    // Update user with judge role
    await db
      .update(users)
      .set({
        role: "judge",
        onboardingComplete: true,
        bio: data.bio || null,
        linkedinUrl: data.linkedinUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    // Update Clerk metadata
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          role: "judge",
          onboardingComplete: true,
          judgeProfile: {
            expertise: data.expertise,
            jobTitle: data.jobTitle,
            company: data.company,
            yearsOfExperience: data.yearsOfExperience,
          },
        },
      });
    } catch (clerkErr) {
      console.error("Judge onboarding: Clerk update failed:", clerkErr);
    }

    // AUTO-ASSIGN: Check for pending judge invitations for this email
    const assignedCompetitionIds: string[] = [];
    try {
      const pendingInvitations = await db
        .select()
        .from(judgeInvitations)
        .where(
          and(
            eq(judgeInvitations.judgeEmail, dbUser.email.toLowerCase()),
            eq(judgeInvitations.accepted, false)
          )
        );

      for (const invite of pendingInvitations) {
        try {
          await db.insert(judgeAssignments).values({
            judgeId: dbUser.id,
            competitionId: invite.competitionId,
            expertise: invite.expertise || data.expertise || null,
          });
          await db
            .update(judgeInvitations)
            .set({ accepted: true, acceptedAt: new Date() })
            .where(eq(judgeInvitations.id, invite.id));
          if (invite.competitionId) {
            assignedCompetitionIds.push(invite.competitionId);
          }
          // Notify the organizer who invited this judge
          if (invite.invitedBy) {
            await createNotification({
              userId: invite.invitedBy,
              type: "general",
              title: "Judge Accepted Invitation",
              message: `${dbUser.firstName || "A judge"} has accepted your invitation and joined as a judge.`,
              link: `/sponsor/competitions/${invite.competitionId}`,
            });
          }
        } catch {
          // Skip if already assigned
        }
      }
    } catch (assignErr) {
      console.error("Judge auto-assign failed:", assignErr);
      // Don't fail onboarding for this
    }

    // AUTO-DISTRIBUTE: Round-robin assign submissions to judges for each competition
    try {
      if (assignedCompetitionIds.length > 0) {
        for (const competitionId of assignedCompetitionIds) {
          // Fetch all judges assigned to this competition
          const allJudges = await db
            .select({ judgeId: judgeAssignments.judgeId })
            .from(judgeAssignments)
            .where(eq(judgeAssignments.competitionId, competitionId));

          if (allJudges.length === 0) continue;

          // Fetch eligible submissions for this competition
          const eligibleSubmissions = await db
            .select({ id: submissions.id })
            .from(submissions)
            .where(
              and(
                eq(submissions.competitionId, competitionId),
                inArray(submissions.status, ["submitted", "valid", "ai_evaluated"])
              )
            );

          if (eligibleSubmissions.length === 0) continue;

          // Round-robin distribute submissions across all judges
          const evaluationRows = eligibleSubmissions.map((sub, i) => ({
            judgeId: allJudges[i % allJudges.length].judgeId,
            submissionId: sub.id,
          }));

          await db
            .insert(judgeEvaluations)
            .values(evaluationRows)
            .onConflictDoNothing();
        }
      }
    } catch (distributeErr) {
      console.error("Judge auto-distribute evaluations failed:", distributeErr);
      // Don't fail onboarding for this
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Judge onboarding error:", error);
    return apiError(error, "Internal server error");
  }
}
