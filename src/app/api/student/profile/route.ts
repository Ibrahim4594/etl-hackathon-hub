import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

export async function PATCH(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const allowed = [
      "firstName",
      "lastName",
      "university",
      "whatsapp",
      "bio",
      "githubUrl",
      "linkedinUrl",
      "skills",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    // Verify user exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.clerkId, clerkId))
      .returning();

    return NextResponse.json({ success: true, user: updated }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/student/profile error:", error);
    return apiError(error, "Failed to update profile");
  }
}
