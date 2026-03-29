import { serverAuth } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureDbUser } from "@/lib/auth/ensure-db-user";
import { z } from "zod/v4";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  website: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await ensureDbUser(userId);
    if (!dbUser || dbUser.role !== "sponsor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, dbUser.id));

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    await db
      .update(organizations)
      .set({
        name: data.name,
        website: data.website || null,
        description: data.description || null,
        industry: data.industry || null,
        contactPersonName: data.contactPersonName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update organization" },
      { status: 500 }
    );
  }
}
