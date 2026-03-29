import { serverAuth } from "@/lib/auth/server-auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  competitions,
  organizations,
  submissions,
  teams,
  teamMembers,
  users,
  judgeAssignments,
  judgeEvaluations,
  competitionSponsors,
} from "@/lib/db/schema";
import { eq, and, count, sql, inArray, asc } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { CompetitionDetailTabs } from "@/components/sponsor/competition-detail-tabs";

export default async function SponsorCompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Fetch competition with org name
  const [competition] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      tagline: competitions.tagline,
      description: competitions.description,
      category: competitions.category,
      status: competitions.status,
      totalPrizePool: competitions.totalPrizePool,
      registrationStart: competitions.registrationStart,
      registrationEnd: competitions.registrationEnd,
      submissionStart: competitions.submissionStart,
      submissionEnd: competitions.submissionEnd,
      judgingStart: competitions.judgingStart,
      judgingEnd: competitions.judgingEnd,
      resultsDate: competitions.resultsDate,
      createdBy: competitions.createdBy,
      createdAt: competitions.createdAt,
      updatedAt: competitions.updatedAt,
      organizationName: organizations.name,
      maxTeamSize: competitions.maxTeamSize,
      minTeamSize: competitions.minTeamSize,
      maxParticipants: competitions.maxParticipants,
      aiJudgingWeight: competitions.aiJudgingWeight,
      humanJudgingWeight: competitions.humanJudgingWeight,
      tags: competitions.tags,
    })
    .from(competitions)
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(competitions.id, id));

  if (!competition) notFound();
  if (competition.createdBy !== dbUser.id) redirect("/sponsor/competitions");

  // Fetch submissions with team names
  const competitionSubmissions = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      status: submissions.status,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      finalScore: submissions.finalScore,
      createdAt: submissions.createdAt,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .where(eq(submissions.competitionId, id));

  // Fetch judges with evaluation progress
  const assignedJudges = await db
    .select({
      assignmentId: judgeAssignments.id,
      assignedAt: judgeAssignments.assignedAt,
      judgeId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      evaluationCount: sql<number>`(
        SELECT count(*)
        FROM ${judgeEvaluations}
        INNER JOIN ${submissions} ON ${judgeEvaluations.submissionId} = ${submissions.id}
        WHERE ${judgeEvaluations.judgeId} = ${users.id}
          AND ${submissions.competitionId} = ${competitions.id}
      )`,
    })
    .from(judgeAssignments)
    .innerJoin(users, eq(judgeAssignments.judgeId, users.id))
    .innerJoin(competitions, eq(judgeAssignments.competitionId, competitions.id))
    .where(eq(judgeAssignments.competitionId, id));

  // Count teams
  const [teamCountResult] = await db
    .select({ count: count() })
    .from(teams)
    .where(eq(teams.competitionId, id));

  // Count unique participants
  const [participantResult] = await db
    .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.competitionId, id));

  // Status counts for pipeline
  const statusCountsRaw = await db
    .select({
      status: submissions.status,
      count: count(),
    })
    .from(submissions)
    .where(eq(submissions.competitionId, id))
    .groupBy(submissions.status);

  const statusCounts = {
    submitted: 0,
    validating: 0,
    valid: 0,
    invalid: 0,
    flagged: 0,
    ai_evaluated: 0,
    judged: 0,
    finalist: 0,
    winner: 0,
  };
  for (const row of statusCountsRaw) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count;
    }
  }

  // Fetch sponsors
  const sponsors = await db
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, id))
    .orderBy(asc(competitionSponsors.displayOrder));

  // Serialize dates for client component
  const serialize = (d: Date | null) => (d ? d.toISOString() : null);

  const serializedSponsors = sponsors.map((s) => ({
    ...s,
    createdAt: s.createdAt?.toISOString() ?? null,
    updatedAt: s.updatedAt?.toISOString() ?? null,
  }));

  return (
    <CompetitionDetailTabs
      competition={{
        id: competition.id,
        title: competition.title,
        slug: competition.slug,
        tagline: competition.tagline,
        description: competition.description,
        category: competition.category,
        status: competition.status,
        totalPrizePool: competition.totalPrizePool,
        registrationStart: serialize(competition.registrationStart),
        registrationEnd: serialize(competition.registrationEnd),
        submissionStart: serialize(competition.submissionStart),
        submissionEnd: serialize(competition.submissionEnd),
        judgingStart: serialize(competition.judgingStart),
        judgingEnd: serialize(competition.judgingEnd),
        resultsDate: serialize(competition.resultsDate),
        createdAt: competition.createdAt.toISOString(),
        updatedAt: competition.updatedAt.toISOString(),
        organizationName: competition.organizationName,
        maxTeamSize: competition.maxTeamSize,
        minTeamSize: competition.minTeamSize,
        maxParticipants: competition.maxParticipants,
        aiJudgingWeight: competition.aiJudgingWeight,
        humanJudgingWeight: competition.humanJudgingWeight,
        tags: (competition.tags as string[]) ?? [],
      }}
      submissions={competitionSubmissions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))}
      judges={assignedJudges.map((j) => ({
        ...j,
        assignedAt: j.assignedAt.toISOString(),
      }))}
      statusCounts={statusCounts}
      totalTeams={teamCountResult?.count ?? 0}
      totalParticipants={participantResult?.count ?? 0}
      sponsors={serializedSponsors}
    />
  );
}
