import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { competitions, teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { serverAuth } from "@/lib/auth/server-auth";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { autoAdvanceCompetitionStatus } from "@/lib/services/competition-status";
import { PageHeader } from "@/components/shared/page-header";
import { SubmissionForm } from "@/components/submissions/submission-form";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkt } from "@/lib/utils/timezone";

export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser) redirect("/onboarding");
  if (dbUser.role !== "student") redirect("/onboarding");

  // Fetch competition + advance status if dates have passed
  const [comp] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      status: competitions.status,
      submissionStart: competitions.submissionStart,
      submissionEnd: competitions.submissionEnd,
      judgingEnd: competitions.judgingEnd,
    })
    .from(competitions)
    .where(eq(competitions.id, competitionId));

  if (!comp) notFound();

  const liveStatus = await autoAdvanceCompetitionStatus({
    id: comp.id,
    status: comp.status,
    submissionEnd: comp.submissionEnd,
    judgingEnd: comp.judgingEnd,
  });
  comp.status = liveStatus as typeof comp.status;

  // Find user's team for this competition
  const [membership] = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, dbUser.id),
        eq(teams.competitionId, competitionId)
      )
    );

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader title="New Submission" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-md">
              You need to register and join a team for this competition first.
            </p>
            <Link href={`/competitions/${comp.slug}`}>
              <Button>Go to Competition</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (membership.role !== "lead") {
    return (
      <div className="space-y-8">
        <PageHeader title="New Submission" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-md">
              Only the team lead can create submissions for &ldquo;{membership.teamName}&rdquo;.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submission window gate — block UI before submissionStart and after submissionEnd
  const now = new Date();
  const subStart = comp.submissionStart ? new Date(comp.submissionStart) : null;
  const subEnd = comp.submissionEnd ? new Date(comp.submissionEnd) : null;

  if (subStart && now < subStart) {
    return (
      <div className="space-y-8">
        <PageHeader title="New Submission" description={comp.title} />
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Lock className="h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-semibold">Submission window not open yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Submissions open on {formatPkt(subStart, { dateStyle: "long", timeStyle: "short" })} (PKT).
              You can submit your project then.
            </p>
            <Link href={`/competitions/${comp.slug}`}>
              <Button variant="outline">Back to Competition</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subEnd && now > subEnd) {
    return (
      <div className="space-y-8">
        <PageHeader title="New Submission" description={comp.title} />
        <Card className="border-zinc-500/30 bg-zinc-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Clock className="h-10 w-10 text-zinc-400" />
            <h2 className="text-lg font-semibold">Submission deadline has passed</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Submissions closed on {formatPkt(subEnd, { dateStyle: "long", timeStyle: "short" })} (PKT).
            </p>
            <Link href={`/competitions/${comp.slug}`}>
              <Button variant="outline">Back to Competition</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Submission"
        description={`Submitting as "${membership.teamName}" for ${comp.title}`}
      />
      <SubmissionForm competitionId={competitionId} teamId={membership.teamId} />
    </div>
  );
}
