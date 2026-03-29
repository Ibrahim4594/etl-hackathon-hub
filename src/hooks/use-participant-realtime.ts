"use client";

import { useCallback, useReducer } from "react";
import { useRealtimeChannel } from "./use-realtime-channel";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type {
  ParticipantSubmissionStatusPayload,
  ParticipantScorePayload,
  ParticipantTeamUpdatePayload,
  ParticipantAchievementPayload,
  NotificationPayload,
} from "@/lib/services/pusher-channels";

// ── State shape ──

export interface ParticipantRealtimeState {
  /** Submission status updates keyed by submissionId */
  submissionUpdates: Map<string, ParticipantSubmissionStatusPayload>;
  /** Score updates keyed by submissionId */
  scoreUpdates: Map<string, ParticipantScorePayload>;
  /** Team updates (newest first) */
  teamUpdates: ParticipantTeamUpdatePayload[];
  /** New achievements */
  newAchievements: ParticipantAchievementPayload[];
  /** New notifications count since page load */
  newNotificationCount: number;
  /** Latest notification */
  latestNotification: NotificationPayload | null;
  /** Flash timestamp — changes trigger re-render animations */
  flashKey: number;
}

type Action =
  | { type: "SUBMISSION_STATUS"; payload: ParticipantSubmissionStatusPayload }
  | { type: "SCORE_AVAILABLE"; payload: ParticipantScorePayload }
  | { type: "TEAM_UPDATE"; payload: ParticipantTeamUpdatePayload }
  | { type: "ACHIEVEMENT"; payload: ParticipantAchievementPayload }
  | { type: "NOTIFICATION"; payload: NotificationPayload };

function reducer(state: ParticipantRealtimeState, action: Action): ParticipantRealtimeState {
  switch (action.type) {
    case "SUBMISSION_STATUS": {
      const next = new Map(state.submissionUpdates);
      next.set(action.payload.submissionId, action.payload);
      return { ...state, submissionUpdates: next, flashKey: Date.now() };
    }
    case "SCORE_AVAILABLE": {
      const next = new Map(state.scoreUpdates);
      next.set(action.payload.submissionId, action.payload);
      return { ...state, scoreUpdates: next, flashKey: Date.now() };
    }
    case "TEAM_UPDATE":
      return {
        ...state,
        teamUpdates: [action.payload, ...state.teamUpdates].slice(0, 20),
        flashKey: Date.now(),
      };
    case "ACHIEVEMENT":
      return {
        ...state,
        newAchievements: [...state.newAchievements, action.payload],
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

const initialState: ParticipantRealtimeState = {
  submissionUpdates: new Map(),
  scoreUpdates: new Map(),
  teamUpdates: [],
  newAchievements: [],
  newNotificationCount: 0,
  latestNotification: null,
  flashKey: 0,
};

/**
 * Subscribes to real-time events for a participant.
 * Call with the participant's DB user ID.
 */
export function useParticipantRealtime(userId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Participant-scoped channel
  useRealtimeChannel(channels.participant(userId), {
    [EVENTS.PARTICIPANT_SUBMISSION_STATUS]: (data: ParticipantSubmissionStatusPayload) =>
      dispatch({ type: "SUBMISSION_STATUS", payload: data }),
    [EVENTS.PARTICIPANT_SCORE_AVAILABLE]: (data: ParticipantScorePayload) =>
      dispatch({ type: "SCORE_AVAILABLE", payload: data }),
    [EVENTS.PARTICIPANT_TEAM_UPDATE]: (data: ParticipantTeamUpdatePayload) =>
      dispatch({ type: "TEAM_UPDATE", payload: data }),
    [EVENTS.PARTICIPANT_RANK_UPDATED]: (data: ParticipantScorePayload) =>
      dispatch({ type: "SCORE_AVAILABLE", payload: data }),
    [EVENTS.PARTICIPANT_ACHIEVEMENT]: (data: ParticipantAchievementPayload) =>
      dispatch({ type: "ACHIEVEMENT", payload: data }),
  });

  // User notification channel
  useRealtimeChannel(channels.user(userId), {
    [EVENTS.NOTIFICATION]: (data: NotificationPayload) =>
      dispatch({ type: "NOTIFICATION", payload: data }),
  });

  return state;
}
