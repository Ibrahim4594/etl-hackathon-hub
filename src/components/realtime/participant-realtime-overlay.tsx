"use client";

import { useParticipantRealtime } from "@/hooks/use-participant-realtime";
import { LiveBadge } from "./live-badge";
import { RealtimeToast } from "./realtime-toast";
import { SlideInItem } from "./slide-in-item";

interface ParticipantRealtimeOverlayProps {
  userId: string;
}

const STATUS_LABELS: Record<string, string> = {
  valid: "Your submission passed validation",
  invalid: "Your submission has issues",
  flagged: "Your submission was flagged for review",
  ai_evaluated: "AI scoring complete",
  judged: "Judge scoring complete",
  finalist: "You're a finalist!",
  winner: "Congratulations! You won!",
};

/**
 * Client component that overlays real-time updates on the participant dashboard.
 * Renders toasts for events and a live activity feed panel.
 */
export function ParticipantRealtimeOverlay({ userId }: ParticipantRealtimeOverlayProps) {
  const state = useParticipantRealtime(userId);

  const hasUpdates =
    state.submissionUpdates.size > 0 ||
    state.scoreUpdates.size > 0 ||
    state.teamUpdates.length > 0 ||
    state.newAchievements.length > 0;

  // Build toast message from latest update
  const latestSubmission = [...state.submissionUpdates.values()].at(-1);
  const latestScore = [...state.scoreUpdates.values()].at(-1);
  const latestAchievement = state.newAchievements.at(-1);

  return (
    <>
      {/* Live indicator in the corner */}
      <div className="flex items-center gap-2">
        <LiveBadge hasUpdates={hasUpdates} />
      </div>

      {/* Toast for submission status changes */}
      {latestSubmission && (
        <RealtimeToast
          flashKey={state.flashKey}
          title={STATUS_LABELS[latestSubmission.status] ?? `Submission: ${latestSubmission.status}`}
          description={latestSubmission.title}
          type={
            latestSubmission.status === "valid" || latestSubmission.status === "winner"
              ? "success"
              : latestSubmission.status === "invalid"
                ? "error"
                : "info"
          }
        />
      )}

      {/* Toast for new scores */}
      {latestScore && (
        <RealtimeToast
          flashKey={state.flashKey}
          title={
            latestScore.finalScore
              ? `Final Score: ${latestScore.finalScore.toFixed(1)}`
              : latestScore.aiScore
                ? `AI Score: ${latestScore.aiScore.toFixed(1)}`
                : "Score Updated"
          }
          description={`${latestScore.title}${latestScore.rank ? ` • Rank #${latestScore.rank}` : ""}`}
          type="success"
        />
      )}

      {/* Toast for achievements */}
      {latestAchievement && (
        <RealtimeToast
          flashKey={state.flashKey}
          title={`${latestAchievement.icon} Achievement Unlocked!`}
          description={latestAchievement.name}
          type="success"
        />
      )}

      {/* Real-time activity feed (only shown when there are updates) */}
      {hasUpdates && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <LiveBadge hasUpdates />
            <span className="text-xs font-semibold text-primary">Live Updates</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {/* Submission status updates */}
            {[...state.submissionUpdates.values()].reverse().slice(0, 5).map((sub) => (
              <SlideInItem key={`sub-${sub.submissionId}`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${
                    sub.status === "valid" ? "bg-green-500" :
                    sub.status === "invalid" ? "bg-red-500" :
                    sub.status === "flagged" ? "bg-amber-500" :
                    "bg-primary"
                  }`} />
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[sub.status] ?? sub.status}:
                  </span>
                  <span className="font-medium truncate">{sub.title}</span>
                </div>
              </SlideInItem>
            ))}

            {/* Score updates */}
            {[...state.scoreUpdates.values()].reverse().slice(0, 3).map((s) => (
              <SlideInItem key={`score-${s.submissionId}`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium truncate">{s.title}</span>
                  {s.aiScore && (
                    <span className="ml-auto font-semibold text-primary">{s.aiScore.toFixed(1)}</span>
                  )}
                </div>
              </SlideInItem>
            ))}

            {/* Team updates */}
            {state.teamUpdates.slice(0, 3).map((t, i) => (
              <SlideInItem key={`team-${t.teamId}-${i}`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">
                    {t.action === "member_joined" ? `${t.memberName} joined` :
                     t.action === "member_left" ? `${t.memberName} left` :
                     "Invite sent"}
                  </span>
                  <span className="font-medium truncate">{t.teamName}</span>
                </div>
              </SlideInItem>
            ))}

            {/* Achievements */}
            {state.newAchievements.map((a) => (
              <SlideInItem key={`ach-${a.achievementId}`}>
                <div className="flex items-center gap-2 text-xs">
                  <span>{a.icon}</span>
                  <span className="font-medium text-primary">{a.name}</span>
                </div>
              </SlideInItem>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
