import { clerkClient } from "@clerk/nextjs/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sponsorOnboardingSchema } from "@/lib/validators/auth";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { NextResponse } from "next/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * POST /api/onboarding/sponsor
 * Complete sponsor onboarding — creates organization and sets role.
 *
 * @auth Required (Clerk session)
 * @body { orgName, website?, description, industry, contactPersonName, contactEmail, contactPhone? }
 * @returns { success: true } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = sponsorOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Sponsor validation failed:", parsed.error.issues);
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    const dbUser = await resolveOnboardingUser(userId);
    if (!dbUser) {
      console.error("Sponsor onboarding: failed to resolve user for:", userId);
      return NextResponse.json({ error: "Failed to resolve user. Please try again." }, { status: 500 });
    }

    if (dbUser.onboardingComplete && dbUser.role && dbUser.role !== "sponsor") {
      return NextResponse.json({ error: `Role already assigned as "${dbUser.role}".` }, { status: 403 });
    }

    // Use transaction so user role + org creation are atomic
    const slug = slugify(data.orgName) + "-" + Date.now().toString(36);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: "sponsor", onboardingComplete: true, updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));

      await tx.insert(organizations).values({
        ownerId: dbUser.id,
        name: data.orgName,
        slug,
        website: data.website || null,
        description: data.description,
        industry: data.industry,
        contactPersonName: data.contactPersonName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
      });
    });

    // Update Clerk metadata
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { role: "sponsor", onboardingComplete: true },
      });
    } catch (clerkErr) {
      console.error("Sponsor onboarding: Clerk update failed:", clerkErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sponsor onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
