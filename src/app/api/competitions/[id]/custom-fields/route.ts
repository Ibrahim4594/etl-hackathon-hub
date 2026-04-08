import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [competition] = await db
    .select({
      status: competitions.status,
      createdBy: competitions.createdBy,
      customSubmissionFields: competitions.customSubmissionFields,
      submissionRequirements: competitions.submissionRequirements,
      submissionEnd: competitions.submissionEnd,
    })
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Draft and pending_review are only accessible to owner or admin
  if (competition.status === "draft" || competition.status === "pending_review") {
    const { userId } = await serverAuth();
    if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [dbUser] = await db.select({ role: users.role, id: users.id }).from(users).where(eq(users.clerkId, userId));
    if (!dbUser || (dbUser.role !== "admin" && competition.createdBy !== dbUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    fields: competition.customSubmissionFields ?? [],
    requirements: competition.submissionRequirements ?? {
      githubRequired: true,
      videoRequired: true,
      deployedUrlRequired: false,
      pitchDeckRequired: false,
      maxScreenshots: 5,
    },
    submissionEnd: competition.submissionEnd?.toISOString() ?? null,
  });
}
