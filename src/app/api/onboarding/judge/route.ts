import { clerkClient } from "@clerk/nextjs/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, judgeInvitations, judgeAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

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

    if (dbUser.onboardingComplete && dbUser.role && dbUser.role !== "judge") {
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
        } catch {
          // Skip if already assigned
        }
      }
    } catch (assignErr) {
      console.error("Judge auto-assign failed:", assignErr);
      // Don't fail onboarding for this
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Judge onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
