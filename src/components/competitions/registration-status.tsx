"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Rocket,
  Loader2,
  CheckCircle2,
  FileText,
  Users,
  Crown,
  Copy,
  Eye,
  Edit,
  Clock,
  Lock,
  BarChart3,
  Zap,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface RegistrationStatusProps {
  competitionId: string;
  competitionStatus: string;
  registrationEnd: string | null;
  submissionEnd: string | null;
  visibility?: string;
  // Populated from server if user is authenticated and registered
  registration: {
    teamId: string;
    teamName: string;
    role: string;
    inviteCode: string;
    memberCount: number;
  } | null;
  submission: {
    id: string;
    status: string;
    aiScore: number | null;
  } | null;
  isAuthenticated: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  validating: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  valid: "bg-green-500/10 text-green-400 border-green-500/20",
  invalid: "bg-red-500/10 text-red-400 border-red-500/20",
  flagged: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ai_evaluated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  judged: "bg-primary/10 text-primary border-primary/20",
  finalist: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  winner: "bg-green-500/10 text-green-400 border-green-500/20",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RegistrationStatus({
  competitionId,
  competitionStatus,
  registrationEnd,
  submissionEnd,
  visibility,
  registration,
  submission,
  isAuthenticated,
}: RegistrationStatusProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [regData, setRegData] = useState(registration);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const isPrivate = visibility === "private";

  const now = new Date();
  const regClosed = registrationEnd && new Date(registrationEnd) < now;
  const subClosed = submissionEnd && new Date(submissionEnd) < now;
  const isActive = competitionStatus === "active";
  const isJudging = competitionStatus === "judging";
  const isCompleted = competitionStatus === "completed";

  const handleRegister = async () => {
    if (isPrivate && !showAccessCodeInput) {
      setShowAccessCodeInput(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPrivate ? { accessCode: accessCodeInput } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.info("You're already registered!");
          router.refresh();
          return;
        }
        throw new Error(data.error || "Registration failed");
      }
      setJustRegistered(true);
      setRegData({
        teamId: data.team.id,
        teamName: data.team.name,
        role: "lead",
        inviteCode: data.team.inviteCode,
        memberCount: 1,
      });
      toast.success(`Registered! Your invite code: ${data.team.inviteCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (regData?.inviteCode) {
      navigator.clipboard.writeText(regData.inviteCode);
      toast.success("Invite code copied!");
    }
  };

  // State: Competition is judging or completed — show results link
  if (isJudging || isCompleted) {
    return (
      <div className="space-y-3">
        {regData && (
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Registered
            </Badge>
            <span className="text-sm text-muted-foreground">
              Team: {regData.teamName}
            </span>
          </div>
        )}
        {submission && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[submission.status] ?? ""}`}
              >
                {formatStatus(submission.status)}
              </span>
              {submission.aiScore !== null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-purple-400" />
                  AI: {submission.aiScore.toFixed(1)}
                </span>
              )}
            </div>
            <Link href={`/student/submissions/${submission.id}`}>
              <Button className="w-full" size="lg">
                <Eye className="mr-2 h-4 w-4" />
                View My Submission
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // State: Not authenticated
  if (!isAuthenticated) {
    return (
      <Link href="/sign-up">
        <Button
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          size="lg"
        >
          <Rocket className="mr-2 h-4 w-4" />
          Sign Up to Register
        </Button>
      </Link>
    );
  }

  // State: Registration closed, not registered
  if (regClosed && !regData) {
    return (
      <Button disabled className="w-full" size="lg" variant="outline">
        <Lock className="mr-2 h-4 w-4" />
        Registration Closed
      </Button>
    );
  }

  // State: Not registered, competition active, registration open
  if (!regData && isActive && !regClosed) {
    return (
      <div className="space-y-3">
        {showAccessCodeInput && isPrivate && (
          <div className="space-y-2">
            <Label htmlFor="accessCode" className="text-sm flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Access Code Required
            </Label>
            <Input
              id="accessCode"
              placeholder="Enter competition access code"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              className="font-mono"
            />
          </div>
        )}
        <Button
          onClick={handleRegister}
          disabled={loading || (showAccessCodeInput && isPrivate && !accessCodeInput)}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          size="lg"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isPrivate && !showAccessCodeInput ? (
            <Lock className="mr-2 h-4 w-4" />
          ) : (
            <Rocket className="mr-2 h-4 w-4" />
          )}
          {isPrivate && !showAccessCodeInput ? "Enter Access Code" : "Register Now"}
        </Button>
      </div>
    );
  }

  // State: Registered
  if (regData) {
    return (
      <div className="space-y-4">
        {/* Registration badge */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-emerald-500">Registered</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                <strong>{regData.teamName}</strong>
                <span className="text-muted-foreground"> · {regData.memberCount} member{regData.memberCount !== 1 ? "s" : ""}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {regData.role === "lead" ? "Team Leader" : "Team Member"}
              </span>
            </div>
          </div>
          {regData.role === "lead" && (
            <button
              onClick={copyInviteCode}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              <Copy className="h-3 w-3" />
              Invite Code: <span className="font-mono font-bold text-primary">{regData.inviteCode}</span>
            </button>
          )}
        </div>

        {/* Action buttons based on submission state */}
        {submission ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[submission.status] ?? ""}`}
              >
                {formatStatus(submission.status)}
              </span>
              {submission.aiScore !== null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-purple-400" />
                  AI: {submission.aiScore.toFixed(1)}
                </span>
              )}
            </div>
            <Link href={`/student/submissions/${submission.id}`}>
              <Button className="w-full" size="lg">
                <Eye className="mr-2 h-4 w-4" />
                View My Submission
              </Button>
            </Link>
            {!subClosed && (
              <Link href={`/student/submissions/new/${competitionId}`}>
                <Button variant="outline" className="w-full" size="lg">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Submission
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!subClosed ? (
              <Link href={`/student/submissions/new/${competitionId}`}>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  size="lg"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Project
                </Button>
              </Link>
            ) : (
              <Button disabled className="w-full" size="lg" variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Submission Deadline Passed
              </Button>
            )}
            <Link href="/student/teams">
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                View My Team
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return null;
}
