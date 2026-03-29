"use client";

import { useReducer } from "react";
import { useRealtimeChannel } from "./use-realtime-channel";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type {
  SubmissionReceivedPayload,
  TeamRegisteredPayload,
  SubmissionValidatedPayload,
  AIEvaluationCompletePayload,
  JudgeEvaluationCompletePayload,
  OrgStatsUpdatedPayload,
  CompetitionStatusPayload,
  NotificationPayload,
} from "@/lib/services/pusher-channels";

// ── State ──

export interface OrgRealtimeState {
  /** New submissions since page load */
  newSubmissions: SubmissionReceivedPayload[];
  /** New team registrations */
  newRegistrations: TeamRegisteredPayload[];
  /** Validation results */
  validationResults: SubmissionValidatedPayload[];
  /** AI evaluations */
  aiEvaluations: AIEvaluationCompletePayload[];
  /** Judge evaluations */
  judgeEvaluations: JudgeEvaluationCompletePayload[];
  /** Stats overlay (incremental deltas) */
  statsDelta: {
    submissions: number;
    participants: number;
  };
  /** Competition status changes */
  statusChanges: CompetitionStatusPayload[];
  /** Notification count */
  newNotificationCount: number;
  latestNotification: NotificationPayload | null;
  /** Flash key for animations */
  flashKey: number;
}

type Action =
  | { type: "SUBMISSION"; payload: SubmissionReceivedPayload }
  | { type: "REGISTRATION"; payload: TeamRegisteredPayload }
  | { type: "VALIDATION"; payload: SubmissionValidatedPayload }
  | { type: "AI_EVAL"; payload: AIEvaluationCompletePayload }
  | { type: "JUDGE_EVAL"; payload: JudgeEvaluationCompletePayload }
  | { type: "STATS"; payload: OrgStatsUpdatedPayload }
  | { type: "COMP_STATUS"; payload: CompetitionStatusPayload }
  | { type: "NOTIFICATION"; payload: NotificationPayload };

function reducer(state: OrgRealtimeState, action: Action): OrgRealtimeState {
  switch (action.type) {
    case "SUBMISSION":
      return {
        ...state,
        newSubmissions: [action.payload, ...state.newSubmissions].slice(0, 50),
        statsDelta: {
          ...state.statsDelta,
          submissions: state.statsDelta.submissions + 1,
        },
        flashKey: Date.now(),
      };
    case "REGISTRATION":
      return {
        ...state,
        newRegistrations: [action.payload, ...state.newRegistrations].slice(0, 50),
        statsDelta: {
          ...state.statsDelta,
          participants: state.statsDelta.participants + action.payload.memberCount,
        },
        flashKey: Date.now(),
      };
    case "VALIDATION":
      return {
        ...state,
        validationResults: [action.payload, ...state.validationResults].slice(0, 50),
        flashKey: Date.now(),
      };
    case "AI_EVAL":
      return {
        ...state,
        aiEvaluations: [action.payload, ...state.aiEvaluations].slice(0, 50),
        flashKey: Date.now(),
      };
    case "JUDGE_EVAL":
      return {
        ...state,
        judgeEvaluations: [action.payload, ...state.judgeEvaluations].slice(0, 50),
        flashKey: Date.now(),
      };
    case "STATS":
      return state; // Full refresh handled by re-fetch, not partial state
    case "COMP_STATUS":
      return {
        ...state,
        statusChanges: [action.payload, ...state.statusChanges].slice(0, 20),
        flashKey: Date.now(),
      };
    case "NOTIFICATION":
      return {
        ...state,
        newNotificationCount: state.newNotificationCount + 1,
        latestNotification: action.payload,
        flashKey: Date.now(),
      };
    default:
      return state;
  }
}

const initialState: OrgRealtimeState = {
  newSubmissions: [],
  newRegistrations: [],
  validationResults: [],
  aiEvaluations: [],
  judgeEvaluations: [],
  statsDelta: { submissions: 0, participants: 0 },
  statusChanges: [],
  newNotificationCount: 0,
  latestNotification: null,
  flashKey: 0,
};

/**
 * Subscribes to real-time events for an organizer.
 * Call with the organization's DB ID and the owner's user ID.
 */
export function useOrganizerRealtime(orgId: string, userId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Organizer-scoped channel
  useRealtimeChannel(channels.organizer(orgId), {
    [EVENTS.ORG_SUBMISSION_RECEIVED]: (data: SubmissionReceivedPayload) =>
      dispatch({ type: "SUBMISSION", payload: data }),
    [EVENTS.ORG_TEAM_REGISTERED]: (data: TeamRegisteredPayload) =>
      dispatch({ type: "REGISTRATION", payload: data }),
    [EVENTS.ORG_JUDGE_SCORED]: (data: JudgeEvaluationCompletePayload) =>
      dispatch({ type: "JUDGE_EVAL", payload: data }),
    [EVENTS.ORG_STATS_UPDATED]: (data: OrgStatsUpdatedPayload) =>
      dispatch({ type: "STATS", payload: data }),
    [EVENTS.ORG_COMPETITION_STATUS]: (data: CompetitionStatusPayload) =>
      dispatch({ type: "COMP_STATUS", payload: data }),
  });

  // User notification channel
  useRealtimeChannel(channels.user(userId), {
    [EVENTS.NOTIFICATION]: (data: NotificationPayload) =>
      dispatch({ type: "NOTIFICATION", payload: data }),
  });

  return state;
}
