"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/shared/page-header";
import { SubmissionForm } from "@/components/submissions/submission-form";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TeamData {
  teamId: string;
  teamName: string;
  role: string;
  competitionTitle: string;
}

export default function NewSubmissionPage() {
  const params = useParams<{ competitionId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      if (!user) return;

      try {
        // Fetch teams for the current user via the teams API
        const res = await fetch(`/api/teams?competitionId=${params.competitionId}`);
        if (!res.ok) {
          setError("Failed to load team information");
          return;
        }

        const data = await res.json();

        if (!data.team) {
          setError("You need to be part of a team to submit. Register for this competition first.");
          return;
        }

        if (data.team.role !== "lead") {
          setError("Only the team lead can create submissions.");
          return;
        }

        setTeam(data.team);
      } catch {
        setError("Something went wrong loading your team.");
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, [user, params.competitionId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="space-y-8">
        <PageHeader title="New Submission" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-md">
              {error ?? "Unable to load team information."}
            </p>
            <Link href="/competitions"><Button variant="outline">Browse Competitions</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Submission"
        description={`Submitting as "${team.teamName}" for ${team.competitionTitle}`}
      />

      <SubmissionForm
        competitionId={params.competitionId}
        teamId={team.teamId}
      />
    </div>
  );
}
