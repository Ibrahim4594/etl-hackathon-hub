import { db } from "@/lib/db";
import { competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [competition] = await db
    .select({
      customSubmissionFields: competitions.customSubmissionFields,
      submissionRequirements: competitions.submissionRequirements,
      submissionEnd: competitions.submissionEnd,
    })
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
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
