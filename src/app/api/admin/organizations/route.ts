import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/services/notification";

export async function PATCH(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up DB user by clerkId
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { organizationId, verification, rejectionReason } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    if (!verification || !["verified", "rejected"].includes(verification)) {
      return NextResponse.json(
        { error: "verification must be 'verified' or 'rejected'" },
        { status: 400 }
      );
    }

    // Fetch the organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Update verification status
    const [updated] = await db
      .update(organizations)
      .set({
        verification,
        rejectionReason: verification === "rejected" ? (rejectionReason || null) : null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    // Notify the organization owner about the verification decision
    try {
      if (org.ownerId) {
        if (verification === "verified") {
          await createNotification({
            userId: org.ownerId,
            type: "general",
            title: "Organization Verified",
            message: `Your organization "${org.name}" has been verified! You can now publish competitions.`,
            link: "/sponsor/dashboard",
          });
        } else if (verification === "rejected") {
          await createNotification({
            userId: org.ownerId,
            type: "general",
            title: "Organization Rejected",
            message: `Your organization "${org.name}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ""} Please update your details and try again.`,
            link: "/sponsor/dashboard",
          });
        }
      }
    } catch (notifErr) {
      console.error("Admin organizations: notification failed:", notifErr);
    }

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error("PATCH /api/admin/organizations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update organization" },
      { status: 500 }
    );
  }
}
