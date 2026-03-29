import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  teamMembers,
  teams,
  competitions,
  submissions,
} from "@/lib/db/schema";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { eq, desc, sql } from "drizzle-orm";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Medal,
  Github,
  Linkedin,
  GraduationCap,
  Mail,
  User,
  Phone,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { EditProfileForm } from "@/components/student/edit-profile-form";

const ACHIEVEMENT_LABELS: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  first_submission: {
    name: "First Submission",
    icon: "🚀",
    description: "Submitted your first project",
  },
  first_win: {
    name: "First Win",
    icon: "🏆",
    description: "Won your first competition",
  },
  team_lead: {
    name: "Team Leader",
    icon: "⭐",
    description: "Led a team in a competition",
  },
  five_competitions: {
    name: "Veteran Competitor",
    icon: "🔥",
    description: "Participated in 5+ competitions",
  },
  finalist: {
    name: "Finalist",
    icon: "🎯",
    description: "Reached the finals",
  },
};

const COMPETITION_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  judging: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  completed: "bg-muted text-muted-foreground border-border",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StudentProfilePage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);

  if (!dbUser || !dbUser.onboardingComplete) {
    redirect("/onboarding");
  }

  if (dbUser.role !== "student" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const competitionHistory = await db
    .select({
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionStatus: competitions.status,
      teamName: teams.name,
      submissionTitle: sql<string | null>`(
        SELECT ${submissions.title}
        FROM ${submissions}
        WHERE ${submissions.teamId} = ${teams.id}
          AND ${submissions.competitionId} = ${competitions.id}
        LIMIT 1
      )`,
      finalScore: sql<number | null>`(
        SELECT ${submissions.finalScore}
        FROM ${submissions}
        WHERE ${submissions.teamId} = ${teams.id}
          AND ${submissions.competitionId} = ${competitions.id}
        LIMIT 1
      )`,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(competitions, eq(teams.competitionId, competitions.id))
    .where(eq(teamMembers.userId, dbUser.id))
    .orderBy(desc(competitions.createdAt));

  const skills: string[] = dbUser.skills ?? [];
  const achievements: string[] = dbUser.achievements ?? [];
  const name =
    [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") ||
    "Participant";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ── PROFILE BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card via-card to-primary/5 p-8 md:p-10">
        {/* Teal blur orb */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          {dbUser.imageUrl ? (
            <Image
              src={dbUser.imageUrl}
              alt={name}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover shadow-xl ring-[3px] ring-primary ring-offset-2 ring-offset-background"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-4xl font-bold text-primary-foreground shadow-xl ring-[3px] ring-primary/30 ring-offset-2 ring-offset-background">
              {initials || "S"}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {dbUser.email}
                </p>
                {dbUser.university && (
                  <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {dbUser.university}
                  </p>
                )}
                {dbUser.whatsapp && (
                  <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {dbUser.whatsapp}
                  </p>
                )}
              </div>

              {/* Edit button — pill style, top-right */}
              <EditProfileForm
                user={{
                  bio: dbUser.bio,
                  skills: dbUser.skills ?? null,
                  githubUrl: dbUser.githubUrl,
                  linkedinUrl: dbUser.linkedinUrl,
                  whatsapp: dbUser.whatsapp,
                  university: dbUser.university,
                }}
              />
            </div>

            {/* Skills pills */}
            {skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {dbUser.bio && (
          <>
            <Separator className="my-6 bg-border/50" />
            <div className="relative rounded-xl bg-muted/30 border border-border/30 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                &ldquo;{dbUser.bio}&rdquo;
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── INFO GRID ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Links & Profiles */}
        <Card className="rounded-2xl border border-border/50 card-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/10">
                <ExternalLink className="h-4 w-4 text-blue-400" />
              </div>
              Links & Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href={dbUser.githubUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                dbUser.githubUrl
                  ? "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5"
                  : "border-dashed border-border/30 opacity-50 pointer-events-none"
              }`}
            >
              <div className="flex items-center gap-3 text-sm">
                <Github className="h-5 w-5" />
                <span className="font-medium">GitHub</span>
              </div>
              {dbUser.githubUrl ? (
                <span className="flex items-center gap-1 text-xs text-primary">
                  {dbUser.githubUrl.replace("https://github.com/", "")}
                  <ExternalLink className="h-3 w-3" />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}
            </a>

            <a
              href={dbUser.linkedinUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                dbUser.linkedinUrl
                  ? "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5"
                  : "border-dashed border-border/30 opacity-50 pointer-events-none"
              }`}
            >
              <div className="flex items-center gap-3 text-sm">
                <Linkedin className="h-5 w-5" />
                <span className="font-medium">LinkedIn</span>
              </div>
              {dbUser.linkedinUrl ? (
                <span className="flex items-center gap-1 text-xs text-primary">
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}
            </a>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="rounded-2xl border border-border/50 card-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/10">
                <Medal className="h-4 w-4 text-purple-400" />
              </div>
              Achievements & Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No achievements yet — participate in competitions to earn
                badges!
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {achievements.map((id) => {
                  const a = ACHIEVEMENT_LABELS[id];
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 transition-all hover:bg-primary/15 hover:border-primary/30"
                      title={a?.description}
                    >
                      <span className="text-lg">{a?.icon ?? "🏅"}</span>
                      <div>
                        <p className="text-xs font-semibold text-primary">
                          {a?.name ?? id}
                        </p>
                        {a?.description && (
                          <p className="text-[10px] text-primary/70">
                            {a.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── COMPETITION HISTORY ── */}
      <Card className="rounded-2xl border border-border/50 card-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/10">
              <Trophy className="h-4 w-4 text-yellow-400" />
            </div>
            Competition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitionHistory.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No competition history"
              description="Join a competition to start building your portfolio."
            />
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider font-medium">
                      Competition
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-medium">
                      Team
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-medium">
                      Status
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-medium">
                      Submission
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-medium text-right">
                      Score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitionHistory.map((entry) => (
                    <TableRow
                      key={`${entry.competitionId}-${entry.teamName}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {entry.competitionTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.teamName}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            COMPETITION_STATUS_COLORS[
                              entry.competitionStatus
                            ] ?? "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {formatStatus(entry.competitionStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.submissionTitle || "-"}
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {entry.finalScore !== null ? (
                          <span className="text-primary">
                            {Number(entry.finalScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
