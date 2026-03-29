import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, organizations, users, competitionSponsors } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { competitionCreateSchema } from "@/lib/validators/competition";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * GET /api/competitions
 * List active public competitions with search, category filter, sorting, and pagination.
 *
 * @auth None (public endpoint)
 * @query { search?, category?, page?, limit?, sort?: "newest" | "deadline" | "prize" }
 * @returns { competitions: [...], pagination: { page, limit, total, totalPages } }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const sort = searchParams.get("sort") || "newest";
    const offset = (page - 1) * limit;

    const conditions = [
      eq(competitions.status, "active"),
      eq(competitions.visibility, "public"),
    ];

    if (search) {
      conditions.push(ilike(competitions.title, `%${search}%`));
    }
    if (category) {
      conditions.push(eq(competitions.category, category));
    }

    let orderBy;
    switch (sort) {
      case "deadline":
        orderBy = asc(competitions.submissionEnd);
        break;
      case "prize":
        orderBy = desc(competitions.totalPrizePool);
        break;
      case "newest":
      default:
        orderBy = desc(competitions.createdAt);
        break;
    }

    const [items, countResult] = await Promise.all([
      db
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
          maxTeamSize: competitions.maxTeamSize,
          minTeamSize: competitions.minTeamSize,
          maxParticipants: competitions.maxParticipants,
          allowSoloParticipation: competitions.allowSoloParticipation,
          registrationStart: competitions.registrationStart,
          registrationEnd: competitions.registrationEnd,
          submissionStart: competitions.submissionStart,
          submissionEnd: competitions.submissionEnd,
          totalPrizePool: competitions.totalPrizePool,
          prizes: competitions.prizes,
          targetParticipants: competitions.targetParticipants,
          status: competitions.status,
          featured: competitions.featured,
          visibility: competitions.visibility,
          createdAt: competitions.createdAt,
          organizationName: organizations.name,
          organizationLogo: organizations.logoUrl,
          organizationSlug: organizations.slug,
        })
        .from(competitions)
        .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(competitions)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0].count);

    const response = NextResponse.json({
      competitions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("GET /api/competitions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch competitions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/competitions
 * Create a new competition in draft status. Auto-adds the organizer as title sponsor.
 *
 * @auth Required (Clerk session, role: sponsor)
 * @body CompetitionCreateSchema fields (title, description, dates, prizes, etc.)
 * @returns { competition: {...} } (201) or { error: string }
 */
export async function POST(req: Request) {
  try {
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
      return NextResponse.json({ error: "Only organizers can create competitions" }, { status: 403 });
    }

    // Find the sponsor's organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, dbUser.id));

    if (!org) {
      return NextResponse.json({ error: "No organization found. Complete organizer onboarding first." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = competitionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // Prize confirmation gate (skip for private competitions)
    if (data.visibility !== "private" && !data.prizeConfirmed) {
      return NextResponse.json(
        { error: "Prize money confirmation required." },
        { status: 400 }
      );
    }

    // Generate unique slug from title
    const slug = slugify(data.title) + "-" + Date.now().toString(36);

    const result = await db.transaction(async (tx) => {
      const [competition] = await tx
        .insert(competitions)
        .values({
          organizationId: org.id,
          createdBy: dbUser.id,
          title: data.title,
          slug,
          tagline: data.tagline || null,
          description: data.description,
          category: data.category || null,
          tags: data.tags,
          coverImageUrl: data.coverImageUrl || null,
          logoUrl: data.logoUrl || null,
          challengeStatement: data.challengeStatement || null,
          requirements: data.requirements || null,
          resources: data.resources,
          minTeamSize: data.minTeamSize,
          maxTeamSize: data.maxTeamSize,
          maxParticipants: data.maxParticipants || null,
          allowSoloParticipation: data.allowSoloParticipation,
          eligibilityCriteria: data.eligibilityCriteria || null,
          registrationStart: data.registrationStart ? new Date(data.registrationStart) : null,
          registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
          submissionStart: data.submissionStart ? new Date(data.submissionStart) : null,
          submissionEnd: data.submissionEnd ? new Date(data.submissionEnd) : null,
          judgingStart: data.judgingStart ? new Date(data.judgingStart) : null,
          judgingEnd: data.judgingEnd ? new Date(data.judgingEnd) : null,
          resultsDate: data.resultsDate ? new Date(data.resultsDate) : null,
          prizes: data.prizes,
          totalPrizePool: data.totalPrizePool,
          judgingCriteria: data.judgingCriteria,
          aiJudgingWeight: data.aiJudgingWeight,
          humanJudgingWeight: data.humanJudgingWeight,
          finalistCount: data.finalistCount,
          submissionRequirements: data.submissionRequirements,
          customSubmissionFields: data.customSubmissionFields || [],
          targetParticipants: data.targetParticipants,
          prizeConfirmed: data.prizeConfirmed,
          visibility: data.visibility || "public",
          accessCode: data.accessCode || null,
          status: "draft",
        })
        .returning();

      // Auto-add organizer as title sponsor
      await tx.insert(competitionSponsors).values({
        competitionId: competition.id,
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

      // Insert additional sponsors
      if (data.sponsors && data.sponsors.length > 0) {
        await tx.insert(competitionSponsors).values(
          data.sponsors.map((s, i) => ({
            competitionId: competition.id,
            companyName: s.companyName,
            logoUrl: s.logoUrl || null,
            website: s.website || null,
            contributionType: s.contributionType,
            contributionTitle: s.contributionTitle || "Sponsor",
            contributionDescription: s.contributionDescription || null,
            contributionAmount: s.contributionAmount || null,
            contactPersonName: s.contactPersonName || null,
            contactPersonEmail: s.contactPersonEmail || null,
            contactPersonPhone: s.contactPersonPhone || null,
            sponsorTier: s.sponsorTier,
            displayOrder: i + 1,
            featured: s.featured,
            isOrganizer: false,
          }))
        );
      }

      return competition;
    });

    return NextResponse.json({ competition: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/competitions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create competition" },
      { status: 500 }
    );
  }
}
