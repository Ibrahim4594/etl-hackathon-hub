import { clerkClient } from "@clerk/nextjs/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { studentOnboardingSchema } from "@/lib/validators/auth";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { NextResponse } from "next/server";

/**
 * POST /api/onboarding/student
 * Complete student onboarding — saves profile and sets role.
 *
 * @auth Required (Clerk session)
 * @body { firstName, lastName, university, yearOfStudy, whatsapp, skills, bio?, githubUrl?, linkedinUrl? }
 * @returns { success: true } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = studentOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Student validation failed:", parsed.error.issues);
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    const dbUser = await resolveOnboardingUser(userId);
    if (!dbUser) {
      console.error("Student onboarding: failed to resolve user for:", userId);
      return NextResponse.json({ error: "Failed to resolve user. Please try again." }, { status: 500 });
    }

    if (dbUser.onboardingComplete && dbUser.role && dbUser.role !== "student") {
      return NextResponse.json({ error: `Role already assigned as "${dbUser.role}".` }, { status: 403 });
    }

    await db
      .update(users)
      .set({
        role: "student",
        firstName: data.firstName,
        lastName: data.lastName,
        university: data.university,
        yearOfStudy: data.yearOfStudy,
        whatsapp: data.whatsapp,
        skills: data.skills,
        bio: data.bio || null,
        githubUrl: data.githubUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { role: "student", onboardingComplete: true },
      });
    } catch (clerkErr) {
      console.error("Student onboarding: Clerk update failed:", clerkErr);
      // DB is already updated — don't fail the request, Clerk will sync on next login
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
