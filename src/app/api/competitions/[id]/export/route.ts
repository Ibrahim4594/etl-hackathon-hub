import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  submissions,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/competitions/[id]/export
 * Export submissions and participants as CSV.
 *
 * @auth Required (Clerk session, role: sponsor owner or admin)
 * @query type=submissions|participants (default: submissions)
 * @returns CSV file download
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [competition] = await db
      .select({ id: competitions.id, title: competitions.title, createdBy: competitions.createdBy })
      .from(competitions)
      .where(eq(competitions.id, id));

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (dbUser.role !== "admin" && competition.createdBy !== dbUser.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "submissions";

    if (type === "participants") {
      const members = await db
        .select({
          teamName: teams.name,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: teamMembers.role,
          joinedAt: teamMembers.joinedAt,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teams.competitionId, id));

      const header = "Team,First Name,Last Name,Email,Role,Joined At";
      const rows = members.map((m) =>
        [
          escapeCsv(m.teamName),
          escapeCsv(m.firstName),
          escapeCsv(m.lastName),
          escapeCsv(m.email),
          escapeCsv(m.role),
          escapeCsv(m.joinedAt?.toISOString() ?? ""),
        ].join(",")
      );

      const csv = [header, ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="participants-${id.slice(0, 8)}.csv"`,
        },
      });
    }

    // Default: submissions
    const subs = await db
      .select({
        title: submissions.title,
        teamName: teams.name,
        status: submissions.status,
        aiScore: submissions.aiScore,
        humanScore: submissions.humanScore,
        finalScore: submissions.finalScore,
        rank: submissions.rank,
        githubUrl: submissions.githubUrl,
        videoUrl: submissions.videoUrl,
        deployedUrl: submissions.deployedUrl,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(eq(submissions.competitionId, id));

    const header = "Title,Team,Status,AI Score,Human Score,Final Score,Rank,GitHub,Video,Deployed URL,Submitted At";
    const rows = subs.map((s) =>
      [
        escapeCsv(s.title),
        escapeCsv(s.teamName),
        escapeCsv(s.status),
        escapeCsv(s.aiScore),
        escapeCsv(s.humanScore),
        escapeCsv(s.finalScore),
        escapeCsv(s.rank),
        escapeCsv(s.githubUrl),
        escapeCsv(s.videoUrl),
        escapeCsv(s.deployedUrl),
        escapeCsv(s.createdAt?.toISOString() ?? ""),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="submissions-${id.slice(0, 8)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/competitions/[id]/export error:", error);
    return apiError(error, "Failed to export data");
  }
}
