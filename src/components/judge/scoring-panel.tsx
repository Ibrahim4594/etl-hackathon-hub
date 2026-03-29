"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Gavel, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CriterionConfig {
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

interface ScoringPanelProps {
  submissionId: string;
  criteria?: CriterionConfig[];
  existingScores?: Record<string, number> | null;
  existingComments?: string | null;
  existingOverrideAi?: boolean;
}

const DEFAULT_CRITERIA: CriterionConfig[] = [
  { name: "innovation", description: "Originality and creativity of the solution", weight: 25, maxScore: 10 },
  { name: "technical", description: "Code quality, architecture, and complexity", weight: 25, maxScore: 10 },
  { name: "impact", description: "Potential real-world impact and usefulness", weight: 25, maxScore: 10 },
  { name: "design", description: "UI/UX, presentation, and user experience", weight: 25, maxScore: 10 },
];

function getScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct > 0.7) return "text-emerald-500";
  if (pct >= 0.4) return "text-amber-500";
  return "text-red-500";
}

function formatCriterionLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function ScoringPanel({
  submissionId,
  criteria,
  existingScores,
  existingComments,
  existingOverrideAi,
}: ScoringPanelProps) {
  const router = useRouter();
  const activeCriteria = criteria && criteria.length > 0 ? criteria : DEFAULT_CRITERIA;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState(existingComments ?? "");
  const [overrideAi, setOverrideAi] = useState(existingOverrideAi ?? false);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of activeCriteria) {
      const key = c.name.toLowerCase().replace(/\s+/g, "_");
      init[key] = existingScores?.[key] ?? Math.round(c.maxScore / 2);
    }
    return init;
  });

  const compositeScore = useMemo(() => {
    const totalWeight = activeCriteria.reduce((s, c) => s + c.weight, 0);
    if (totalWeight === 0) return 0;
    let weighted = 0;
    for (const c of activeCriteria) {
      const key = c.name.toLowerCase().replace(/\s+/g, "_");
      const normalized = (scores[key] ?? 0) / c.maxScore;
      weighted += normalized * c.weight;
    }
    return Math.round((weighted / totalWeight) * 100) / 10;
  }, [scores, activeCriteria]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/judge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          scores,
          comments,
          overrideAi,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit evaluation");
      }

      toast.success("Evaluation submitted successfully");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-xl border border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          Human Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Score sliders */}
          {activeCriteria.map((criterion) => {
            const key = criterion.name.toLowerCase().replace(/\s+/g, "_");
            const value = scores[key] ?? 0;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {formatCriterionLabel(criterion.name)}
                    {criterion.weight > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        ({criterion.weight}%)
                      </span>
                    )}
                  </Label>
                  <span className={`text-lg font-bold tabular-nums ${getScoreColor(value, criterion.maxScore)}`}>
                    {value}
                  </span>
                </div>
                {criterion.description && (
                  <p className="text-xs text-muted-foreground">
                    {criterion.description}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-3">0</span>
                  <input
                    type="range"
                    min={0}
                    max={criterion.maxScore}
                    step={1}
                    value={value}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="h-2 flex-1 accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground w-3">
                    {criterion.maxScore}
                  </span>
                </div>
              </div>
            );
          })}

          <Separator />

          {/* Composite */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <span className="text-sm font-medium">Weighted Score</span>
            <span className={`text-2xl font-black ${getScoreColor(compositeScore, 10)}`}>
              {compositeScore.toFixed(1)}
              <span className="text-sm text-muted-foreground font-normal">/10</span>
            </span>
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Add your evaluation notes, feedback, or reasoning..."
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Override AI */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={overrideAi}
              onChange={(e) => setOverrideAi(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <span className="text-sm font-medium">Override AI Evaluation</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check if you disagree with the AI scores and want your evaluation to take priority.
              </p>
            </div>
          </label>

          <Button
            type="submit"
            className="w-full rounded-full btn-interact"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : existingScores ? (
              "Update Evaluation"
            ) : (
              "Submit Evaluation"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
