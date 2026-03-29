import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverAuth } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "admin@spark.com";
const ADMIN_PASSWORD = "spark@admin2026";

/**
 * POST /api/onboarding/admin
 * Elevate a signed-in user to admin role using hardcoded credentials.
 *
 * @auth Required (Clerk session)
 * @body { email, password }
 * @returns { success: true } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized — sign in first" }, { status: 401 });
    }

    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 403 });
    }

    // Try to find user by clerkId first
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      // User not found by clerkId — might exist under a different clerkId (old dev session).
      // Get email from Clerk and look up by email instead.
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";

        if (userEmail) {
          const [existingByEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, userEmail));

          if (existingByEmail) {
            // Update the old record to use the new clerkId
            await db
              .update(users)
              .set({ clerkId: userId, updatedAt: new Date() })
              .where(eq(users.id, existingByEmail.id));
            dbUser = { ...existingByEmail, clerkId: userId };
          } else {
            // Truly new user — create
            const [inserted] = await db
              .insert(users)
              .values({
                clerkId: userId,
                email: userEmail,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                imageUrl: clerkUser.imageUrl,
                role: "admin",
                onboardingComplete: true,
              })
              .returning();
            dbUser = inserted;
          }
        }
      } catch (err) {
        console.error("Admin onboard error:", err);
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: "Could not resolve user account" }, { status: 500 });
    }

    // Force override — delete old role, set admin
    await db
      .update(users)
      .set({
        role: "admin",
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    // Update Clerk metadata — wrapped separately so DB update isn't rolled back
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          role: "admin",
          onboardingComplete: true,
        },
      });
    } catch (clerkErr) {
      console.error("Admin onboarding: Clerk metadata update failed:", clerkErr);
      // DB is already updated — don't fail the request
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
