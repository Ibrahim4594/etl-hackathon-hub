import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitionSponsors, competitions, users } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { competitionSponsorSchema } from "@/lib/validators/competition";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sponsors = await db
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, id))
    .orderBy(asc(competitionSponsors.displayOrder));

  return NextResponse.json({ sponsors });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await serverAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
  if (!dbUser || (dbUser.role !== "sponsor" && dbUser.role !== "admin")) {
    return NextResponse.json({ error: "Only organizers or admins can add sponsors" }, { status: 403 });
  }

  const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
    return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = competitionSponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  // Get current max displayOrder
  const existing = await db
    .select({ displayOrder: competitionSponsors.displayOrder })
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, id))
    .orderBy(asc(competitionSponsors.displayOrder));

  const maxOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.displayOrder ?? 0)) : 0;

  const [sponsor] = await db
    .insert(competitionSponsors)
    .values({
      competitionId: id,
      companyName: data.companyName,
      logoUrl: data.logoUrl || null,
      website: data.website || null,
      contributionType: data.contributionType,
      contributionTitle: data.contributionTitle || "Sponsor",
      contributionDescription: data.contributionDescription || null,
      contributionAmount: data.contributionAmount || null,
      contactPersonName: data.contactPersonName || null,
      contactPersonEmail: data.contactPersonEmail || null,
      contactPersonPhone: data.contactPersonPhone || null,
      sponsorTier: data.sponsorTier,
      displayOrder: maxOrder + 1,
      featured: data.featured,
      isOrganizer: false,
    })
    .returning();

  return NextResponse.json({ sponsor }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await serverAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
  if (!dbUser || (dbUser.role !== "sponsor" && dbUser.role !== "admin")) {
    return NextResponse.json({ error: "Only organizers or admins can remove sponsors" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sponsorId = searchParams.get("sponsorId");
  if (!sponsorId) {
    return NextResponse.json({ error: "sponsorId query parameter required" }, { status: 400 });
  }

  // Prevent deleting the organizer sponsor
  const [sponsor] = await db
    .select()
    .from(competitionSponsors)
    .where(
      and(
        eq(competitionSponsors.id, sponsorId),
        eq(competitionSponsors.competitionId, id)
      )
    );

  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  if (sponsor.isOrganizer) {
    return NextResponse.json({ error: "Cannot remove the primary organizer" }, { status: 400 });
  }

  await db.delete(competitionSponsors).where(eq(competitionSponsors.id, sponsorId));

  return NextResponse.json({ success: true });
}
