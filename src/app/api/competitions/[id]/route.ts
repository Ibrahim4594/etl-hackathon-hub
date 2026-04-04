import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, organizations, users, competitionSponsors } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const sponsors = await db
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, id))
    .orderBy(asc(competitionSponsors.displayOrder));

  return NextResponse.json({ competition, sponsors });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (dbUser.role !== "sponsor") {
    return NextResponse.json({ error: "Only organizers can edit competitions" }, { status: 403 });
  }

  // Fetch the competition and verify ownership
  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  if (competition.createdBy !== dbUser.id) {
    return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
  }

  if (competition.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft competitions can be edited" },
      { status: 400 }
    );
  }

  const body = await req.json();

  // Build partial update object from allowed fields
  const allowedFields = [
    "title",
    "tagline",
    "description",
    "category",
    "tags",
    "coverImageUrl",
    "logoUrl",
    "challengeStatement",
    "requirements",
    "resources",
    "minTeamSize",
    "maxTeamSize",
    "maxParticipants",
    "allowSoloParticipation",
    "eligibilityCriteria",
    "registrationStart",
    "registrationEnd",
    "submissionStart",
    "submissionEnd",
    "judgingStart",
    "judgingEnd",
    "resultsDate",
    "prizes",
    "totalPrizePool",
    "judgingCriteria",
    "aiJudgingWeight",
    "humanJudgingWeight",
    "finalistCount",
    "submissionRequirements",
  ] as const;

  const dateFields = [
    "registrationStart",
    "registrationEnd",
    "submissionStart",
    "submissionEnd",
    "judgingStart",
    "judgingEnd",
    "resultsDate",
  ];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  for (const field of allowedFields) {
    if (field in body) {
      if (dateFields.includes(field)) {
        updateData[field] = body[field] ? new Date(body[field]) : null;
      } else {
        updateData[field] = body[field];
      }
    }
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(competitions)
      .set(updateData)
      .where(eq(competitions.id, id))
      .returning();

    // If sponsors array is provided, replace all non-organizer sponsors
    if (Array.isArray(body.sponsors)) {
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
            companyName: s.companyName,
            logoUrl: s.logoUrl || null,
            website: s.website || null,
            contributionType: s.contributionType || "monetary",
            contributionTitle: s.contributionTitle || "Sponsor",
            contributionDescription: s.contributionDescription || null,
            contributionAmount: s.contributionAmount || null,
            contactPersonName: s.contactPersonName || null,
            contactPersonEmail: s.contactPersonEmail || null,
            contactPersonPhone: s.contactPersonPhone || null,
            sponsorTier: s.sponsorTier || "partner",
            displayOrder: i + 1,
            featured: s.featured || false,
            isOrganizer: false,
          }))
        );
      }
    }

    return updated;
  });

  return NextResponse.json({ competition: result });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!["draft", "cancelled"].includes(competition.status)) {
      return NextResponse.json(
        { error: "Only draft or cancelled hackathons can be deleted" },
        { status: 400 }
      );
    }
  }

  await db.delete(competitions).where(eq(competitions.id, id));

  return NextResponse.json({ success: true });
}
