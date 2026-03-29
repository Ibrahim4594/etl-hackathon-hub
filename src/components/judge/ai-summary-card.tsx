import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot } from "lucide-react";

interface AiScores {
  innovation: number;
  technical: number;
  impact: number;
  design: number;
}

interface AiSummaryCardProps {
  summary: string | null;
  scores: AiScores | null;
  compositeScore: number | null;
  flags: string[] | null;
  modelUsed: string | null;
}

const scoreLabels: { key: keyof AiScores; label: string }[] = [
  { key: "innovation", label: "Innovation" },
  { key: "technical", label: "Technical" },
  { key: "impact", label: "Impact" },
  { key: "design", label: "Design" },
];

function getScoreColor(score: number): string {
  if (score > 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score > 7) return "text-green-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
}

export function AiSummaryCard({
  summary,
  scores,
  compositeScore,
  flags,
  modelUsed,
}: AiSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Evaluation
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Bot className="mr-1 h-3 w-3" />
            {modelUsed ?? "AI-Generated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {summary && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Summary
            </h4>
            <p className="text-sm whitespace-pre-wrap">{summary}</p>
          </div>
        )}

        {/* Composite Score */}
        {compositeScore !== null && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Composite Score</span>
              <span className="text-2xl font-bold text-primary">
                {compositeScore.toFixed(1)}
                <span className="text-sm text-muted-foreground font-normal">
                  /10
                </span>
              </span>
            </div>
          </>
        )}

        {/* Score Breakdown */}
        {scores && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Score Breakdown
              </h4>
              {scoreLabels.map(({ key, label }) => {
                const score = scores[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className={`font-semibold ${getScoreTextColor(score)}`}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(score)}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Flags */}
        {flags && flags.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Flags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {flags.map((flag, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* No data fallback */}
        {!summary && !scores && compositeScore === null && (
          <p className="text-sm text-muted-foreground py-2">
            AI evaluation has not been run for this submission yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
