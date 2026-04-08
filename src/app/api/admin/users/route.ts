import { clerkClient } from "@clerk/nextjs/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

const VALID_ROLES = ["student", "sponsor", "judge", "admin"] as const;

export async function PATCH(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body as { userId?: string; role?: string };

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent admins from changing their own role (safety measure)
    if (userId === dbUser.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({ role: role as "student" | "sponsor" | "judge" | "admin", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, role: users.role, clerkId: users.clerkId });

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Sync role to Clerk metadata
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(updated.clerkId, {
        publicMetadata: { role },
      });
    } catch (clerkErr) {
      console.error("Admin role update: Clerk sync failed:", clerkErr);
      // DB is updated — don't fail the request
    }

    return NextResponse.json({ user: { id: updated.id, role: updated.role } });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return apiError(error, "Failed to update user role");
  }
}
