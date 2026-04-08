import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await serverAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    if (!competition) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (competition.status !== "active") {
      return NextResponse.json({ error: "Only active competitions can move to judging" }, { status: 400 });
    }

    if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
      return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
    }

    const [updated] = await db.update(competitions)
      .set({ status: "judging", updatedAt: new Date() })
      .where(eq(competitions.id, id))
      .returning();

    return NextResponse.json({ competition: updated });
  } catch (error) {
    return apiError(error, "Failed to start judging");
  }
}
