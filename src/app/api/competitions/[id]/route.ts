import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, organizations, users, competitionSponsors } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod/v4";

const competitionUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  challengeStatement: z.string().optional(),
  requirements: z.any().optional(),
  resources: z.any().optional(),
  minTeamSize: z.number().int().min(1).optional(),
  maxTeamSize: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional().nullable(),
  allowSoloParticipation: z.boolean().optional(),
  eligibilityCriteria: z.string().optional().nullable(),
  registrationStart: z.string().optional().nullable(),
  registrationEnd: z.string().optional().nullable(),
  submissionStart: z.string().optional().nullable(),
  submissionEnd: z.string().optional().nullable(),
  judgingStart: z.string().optional().nullable(),
  judgingEnd: z.string().optional().nullable(),
  resultsDate: z.string().optional().nullable(),
  prizes: z.any().optional(),
  totalPrizePool: z.number().min(0).optional().nullable(),
  judgingCriteria: z.any().optional(),
  aiJudgingWeight: z.number().min(0).max(100).optional(),
  humanJudgingWeight: z.number().min(0).max(100).optional(),
  finalistCount: z.number().int().min(1).optional(),
  submissionRequirements: z.any().optional(),
  sponsors: z.array(z.object({
    companyName: z.string().min(1),
    logoUrl: z.string().url().optional().nullable(),
    website: z.string().url().optional().nullable(),
    contributionType: z.string().optional(),
    contributionTitle: z.string().optional(),
    contributionDescription: z.string().optional().nullable(),
    contributionAmount: z.number().optional().nullable(),
    contactPersonName: z.string().optional().nullable(),
    contactPersonEmail: z.string().email().optional().nullable(),
    contactPersonPhone: z.string().optional().nullable(),
    sponsorTier: z.string().optional(),
    featured: z.boolean().optional(),
  })).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params;

  const [competition] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      tagline: competitions.tagline,
      description: competitions.description,
      category: competitions.category,
      tags: competitions.tags,
      coverImageUrl: competitions.coverImageUrl,
      logoUrl: competitions.logoUrl,
      challengeStatement: competitions.challengeStatement,
      requirements: competitions.requirements,
      resources: competitions.resources,
      maxTeamSize: competitions.maxTeamSize,
      minTeamSize: competitions.minTeamSize,
      maxParticipants: competitions.maxParticipants,
      allowSoloParticipation: competitions.allowSoloParticipation,
      eligibilityCriteria: competitions.eligibilityCriteria,
      registrationStart: competitions.registrationStart,
      registrationEnd: competitions.registrationEnd,
      submissionStart: competitions.submissionStart,
      submissionEnd: competitions.submissionEnd,
      judgingStart: competitions.judgingStart,
      judgingEnd: competitions.judgingEnd,
      resultsDate: competitions.resultsDate,
      prizes: competitions.prizes,
      totalPrizePool: competitions.totalPrizePool,
      judgingCriteria: competitions.judgingCriteria,
      aiJudgingWeight: competitions.aiJudgingWeight,
      humanJudgingWeight: competitions.humanJudgingWeight,
      finalistCount: competitions.finalistCount,
      submissionRequirements: competitions.submissionRequirements,
      status: competitions.status,
      featured: competitions.featured,
      publishedAt: competitions.publishedAt,
      createdAt: competitions.createdAt,
      updatedAt: competitions.updatedAt,
      organizationId: competitions.organizationId,
      createdBy: competitions.createdBy,
      organizationName: organizations.name,
      organizationLogo: organizations.logoUrl,
      organizationSlug: organizations.slug,
      organizationWebsite: organizations.website,
    })
    .from(competitions)
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Draft and pending_review competitions are only visible to their creator or admin
  if (competition.status === "pending_review" || competition.status === "draft") {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId));
    if (!dbUser || (dbUser.role !== "admin" && competition.createdBy !== dbUser.id)) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
  }

  const sponsors = await db
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, id))
    .orderBy(asc(competitionSponsors.displayOrder));

  return NextResponse.json({ competition, sponsors });
  } catch (error) {
    return apiError(error, "Failed to fetch competition");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params;

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

  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    return NextResponse.json({ error: "Only organizers or admins can edit competitions" }, { status: 403 });
  }

  // Fetch the competition and verify ownership
  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Sponsors must own the competition; admins can edit any
  if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
    return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
  }

  if (competition.status !== "pending_review" && competition.status !== "draft") {
    return NextResponse.json(
      { error: "Only pending review competitions can be edited" },
      { status: 400 }
    );
  }

  const rawBody = await req.json();
  const parsed = competitionUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  // Date ordering validation — merge incoming dates with current competition dates
  const resolveDate = (incoming: string | null | undefined, current: Date | null): Date | null => {
    if (incoming === null || incoming === "") return null;
    if (incoming !== undefined) {
      const d = new Date(incoming);
      if (isNaN(d.getTime())) return null;
      return d;
    }
    return current;
  };
  const md = {
    registrationStart: resolveDate(body.registrationStart, competition.registrationStart),
    registrationEnd: resolveDate(body.registrationEnd, competition.registrationEnd),
    submissionStart: resolveDate(body.submissionStart, competition.submissionStart),
    submissionEnd: resolveDate(body.submissionEnd, competition.submissionEnd),
    judgingStart: resolveDate(body.judgingStart, competition.judgingStart),
    judgingEnd: resolveDate(body.judgingEnd, competition.judgingEnd),
    resultsDate: resolveDate(body.resultsDate, competition.resultsDate),
  };
  if (md.registrationStart && md.registrationEnd && md.registrationEnd <= md.registrationStart) {
    return NextResponse.json({ error: "Registration end must be after registration start" }, { status: 400 });
  }
  if (md.registrationEnd && md.submissionStart && md.submissionStart < md.registrationEnd) {
    return NextResponse.json({ error: "Submission start must be after registration ends" }, { status: 400 });
  }
  if (md.submissionStart && md.submissionEnd && md.submissionEnd <= md.submissionStart) {
    return NextResponse.json({ error: "Submission end must be after submission start" }, { status: 400 });
  }
  if (md.submissionEnd && md.judgingStart && md.judgingStart < md.submissionEnd) {
    return NextResponse.json({ error: "Judging cannot start before submission closes" }, { status: 400 });
  }
  if (md.judgingStart && md.judgingEnd && md.judgingEnd <= md.judgingStart) {
    return NextResponse.json({ error: "Judging end must be after judging start" }, { status: 400 });
  }
  if (md.judgingEnd && md.resultsDate && md.resultsDate < md.judgingEnd) {
    return NextResponse.json({ error: "Results date must be after judging ends" }, { status: 400 });
  }

  const dateFields = [
    "registrationStart",
    "registrationEnd",
    "submissionStart",
    "submissionEnd",
    "judgingStart",
    "judgingEnd",
    "resultsDate",
  ] as const;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const { sponsors: _sponsors, ...fields } = body;
  for (const [key, value] of Object.entries(fields)) {
    if (dateFields.includes(key as typeof dateFields[number])) {
      updateData[key] = value ? new Date(value as string) : null;
    } else {
      updateData[key] = value;
    }
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(competitions)
      .set(updateData)
      .where(eq(competitions.id, id))
      .returning();

    // If sponsors array is provided, replace all non-organizer sponsors
    if (body.sponsors !== undefined) {
      // Delete existing non-organizer sponsors
      await tx
        .delete(competitionSponsors)
        .where(
          eq(competitionSponsors.competitionId, id)
        );

      // Re-insert organizer sponsor
      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, competition.organizationId));

      if (org) {
        await tx.insert(competitionSponsors).values({
          competitionId: id,
          companyName: org.name,
          logoUrl: org.logoUrl,
          website: org.website,
          contributionType: "monetary",
          contributionTitle: "Primary Organizer",
          sponsorTier: "title",
          displayOrder: 0,
          isOrganizer: true,
          featured: true,
        });
      }

      // Insert updated sponsors
      if (body.sponsors.length > 0) {
        await tx.insert(competitionSponsors).values(
          body.sponsors.map((s: Record<string, unknown>, i: number) => ({
            competitionId: id,
            companyName: String(s.companyName ?? ""),
            logoUrl: s.logoUrl ? String(s.logoUrl) : null,
            website: s.website ? String(s.website) : null,
            contributionType: String(s.contributionType || "monetary") as "monetary" | "tech_credits" | "mentorship" | "internships" | "prizes_inkind" | "cloud_services" | "api_credits" | "other",
            contributionTitle: String(s.contributionTitle || "Sponsor"),
            contributionDescription: s.contributionDescription ? String(s.contributionDescription) : null,
            contributionAmount: s.contributionAmount ? Number(s.contributionAmount) : null,
            contactPersonName: s.contactPersonName ? String(s.contactPersonName) : null,
            contactPersonEmail: s.contactPersonEmail ? String(s.contactPersonEmail) : null,
            contactPersonPhone: s.contactPersonPhone ? String(s.contactPersonPhone) : null,
            sponsorTier: String(s.sponsorTier || "partner") as "title" | "gold" | "silver" | "bronze" | "partner",
            displayOrder: i + 1,
            featured: Boolean(s.featured),
            isOrganizer: false,
          }))
        );
      }
    }

    return updated;
  });

  return NextResponse.json({ competition: result });
  } catch (error) {
    return apiError(error, "Failed to update competition");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params;

  const { userId } = await serverAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId));

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Only the owner org or admin can delete; only drafts/cancelled can be deleted
  if (dbUser.role !== "admin") {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, competition.organizationId));

    if (!org || org.ownerId !== dbUser.id) {
      return NextResponse.json({ error: "Not authorized to delete this hackathon" }, { status: 403 });
    }

    if (!["draft", "pending_review", "cancelled"].includes(competition.status)) {
      return NextResponse.json(
        { error: "Only pending review or rejected competitions can be deleted" },
        { status: 400 }
      );
    }
  }

  await db.delete(competitions).where(eq(competitions.id, id));

  return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to delete competition");
  }
}
