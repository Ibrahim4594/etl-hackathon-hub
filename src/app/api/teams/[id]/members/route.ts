import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        imageUrl: users.imageUrl,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/teams/[id]/members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const memberUserId = searchParams.get("userId");
    if (!memberUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Verify caller is team lead
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team || team.leadId !== dbUser.id) {
      return NextResponse.json({ error: "Only team lead can remove members" }, { status: 403 });
    }

    // Cannot remove the lead
    if (memberUserId === dbUser.id) {
      return NextResponse.json({ error: "Cannot remove team lead" }, { status: 400 });
    }

    await db.delete(teamMembers).where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberUserId))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teams/[id]/members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove team member" },
      { status: 500 }
    );
  }
}
