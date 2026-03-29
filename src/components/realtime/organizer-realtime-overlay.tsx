"use client";

import { useOrganizerRealtime } from "@/hooks/use-organizer-realtime";
import { LiveBadge } from "./live-badge";
import { RealtimeToast } from "./realtime-toast";
import { SlideInItem } from "./slide-in-item";
import { FileText, Users, Gavel, Sparkles } from "lucide-react";

interface OrganizerRealtimeOverlayProps {
  orgId: string;
  userId: string;
}

/**
 * Client component that overlays real-time updates on the organizer dashboard.
 * Shows live submission count deltas, new registrations, and activity.
 */
export function OrganizerRealtimeOverlay({ orgId, userId }: OrganizerRealtimeOverlayProps) {
  const state = useOrganizerRealtime(orgId, userId);

  const hasUpdates =
    state.newSubmissions.length > 0 ||
    state.newRegistrations.length > 0 ||
    state.judgeEvaluations.length > 0 ||
    state.statusChanges.length > 0;

  const latestSub = state.newSubmissions[0];
  const latestReg = state.newRegistrations[0];
  const latestJudge = state.judgeEvaluations[0];

  return (
    <>
      {/* Stats delta badges — show inline increments */}
      <div className="flex items-center gap-2">
        <LiveBadge hasUpdates={hasUpdates} />
        {state.statsDelta.submissions > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 animate-in fade-in duration-300">
            +{state.statsDelta.submissions} submission{state.statsDelta.submissions > 1 ? "s" : ""}
          </span>
        )}
        {state.statsDelta.participants > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 animate-in fade-in duration-300">
            +{state.statsDelta.participants} participant{state.statsDelta.participants > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Toasts */}
      {latestSub && (
        <RealtimeToast
          flashKey={state.flashKey}
          title="New Submission"
          description={`${latestSub.teamName} submitted "${latestSub.title}"`}
          type="success"
        />
      )}
      {latestReg && (
        <RealtimeToast
          flashKey={state.flashKey}
          title="New Registration"
          description={`Team "${latestReg.teamName}" joined (${latestReg.memberCount} members)`}
          type="info"
        />
      )}
      {latestJudge && (
        <RealtimeToast
          flashKey={state.flashKey}
          title="Judge Evaluation"
          description={`${latestJudge.judgeName} scored ${latestJudge.teamName}`}
          type="info"
        />
      )}

      {/* Live activity stream */}
      {hasUpdates && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <LiveBadge hasUpdates />
            <span className="text-xs font-semibold text-primary">Live Activity</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Interleave submissions and registrations by showing most recent */}
            {state.newSubmissions.slice(0, 5).map((sub) => (
              <SlideInItem key={`sub-${sub.submissionId}`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                    <FileText className="h-3 w-3 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{sub.teamName}</span>
                    <span className="text-muted-foreground"> submitted </span>
                    <span className="font-medium truncate">&quot;{sub.title}&quot;</span>
                  </div>
                </div>
              </SlideInItem>
            ))}

            {state.newRegistrations.slice(0, 5).map((reg) => (
              <SlideInItem key={`reg-${reg.teamId}`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                    <Users className="h-3 w-3 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{reg.teamName}</span>
                    <span className="text-muted-foreground">
                      {" "}registered ({reg.memberCount} members)
                    </span>
                  </div>
                </div>
              </SlideInItem>
            ))}

            {state.judgeEvaluations.slice(0, 3).map((j, i) => (
              <SlideInItem key={`judge-${j.submissionId}-${i}`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                    <Gavel className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{j.judgeName}</span>
                    <span className="text-muted-foreground"> evaluated </span>
                    <span className="font-medium">{j.teamName}</span>
                  </div>
                </div>
              </SlideInItem>
            ))}

            {state.aiEvaluations.slice(0, 3).map((ai) => (
              <SlideInItem key={`ai-${ai.submissionId}`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500/10">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-muted-foreground">AI scored </span>
                    <span className="font-medium">{ai.teamName}</span>
                    <span className="ml-auto font-semibold text-primary">
                      {ai.aiScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </SlideInItem>
            ))}

            {state.statusChanges.slice(0, 3).map((sc) => (
              <SlideInItem key={`status-${sc.competitionId}`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {sc.title}: {sc.oldStatus} → {sc.newStatus}
                  </span>
                </div>
              </SlideInItem>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
