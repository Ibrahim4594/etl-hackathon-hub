"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Loader2, Medal, Award, Crown } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  title: string;
  teamName: string;
  finalScore: number | null;
  aiScore: number | null;
  humanScore: number | null;
}

interface Props {
  competitionId: string;
  submissions: Submission[];
}

const RANK_CONFIG = [
  { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "1st Place" },
  { icon: Medal, color: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/20", label: "2nd Place" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/20", label: "3rd Place" },
];

export function AnnounceWinnersDialog({ competitionId, submissions }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sort submissions by finalScore descending
  const ranked = [...submissions]
    .filter((s) => s.finalScore !== null)
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

  const topN = ranked.slice(0, 3);

  const handleAnnounce = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerIds: topN.map((s) => s.id),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to announce winners");

      toast.success("Winners announced successfully! Participants have been notified.");
      setOpen(false);
      // Soft refresh instead of full reload to avoid middleware redirect loop
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to announce winners");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">
          <Trophy className="mr-1.5 h-3.5 w-3.5" />
          Announce Winners
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Announce Winners
          </DialogTitle>
          <DialogDescription>
            Review the top submissions and confirm the winners. This action will
            notify all participants and mark the competition as completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {topN.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No scored submissions found. Ensure judging is complete before announcing winners.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Top {topN.length} Submissions by Final Score
              </p>
              {topN.map((sub, i) => {
                const cfg = RANK_CONFIG[i] ?? RANK_CONFIG[2];
                const Icon = cfg.icon;
                return (
                  <div
                    key={sub.id}
                    className={`flex items-center gap-3 rounded-lg border ${cfg.border} ${cfg.bg} p-3`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{sub.title}</p>
                      <p className="text-xs text-muted-foreground">{sub.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${cfg.color}`}>
                        {sub.finalScore?.toFixed(1) ?? "N/A"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAnnounce}
            disabled={loading || topN.length === 0}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
            )}
            Confirm & Announce Winners
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
