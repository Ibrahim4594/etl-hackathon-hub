import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod/v4";

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  university: z.string().max(200).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  skills: z.array(z.string().max(50)).max(20).optional(),
});

export async function PATCH(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawBody = await req.json();
    const parsed = profileUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body)) {
      updates[key] = value;
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
