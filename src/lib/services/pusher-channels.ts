/**
 * Pusher channel naming conventions and event type constants.
 *
 * Channel patterns:
 *   global              – platform-wide events (new competitions, announcements)
 *   organizer-{orgId}   – events for a specific organization
 *   participant-{userId} – events for a specific participant
 *   competition-{compId} – events scoped to a competition
 *   user-{userId}       – private per-user events (notifications)
 */

// ── Channel builders ──

export const channels = {
  global: () => "global" as const,
  organizer: (orgId: string) => `organizer-${orgId}` as const,
  participant: (userId: string) => `participant-${userId}` as const,
  competition: (compId: string) => `competition-${compId}` as const,
  user: (userId: string) => `user-${userId}` as const,
};

// ── Event type constants ──

export const EVENTS = {
  // Global events
  COMPETITION_PUBLISHED: "competition:published",
  COMPETITION_COMPLETED: "competition:completed",

  // Competition-scoped events
  TEAM_REGISTERED: "team:registered",
  SUBMISSION_RECEIVED: "submission:received",
  SUBMISSION_VALIDATED: "submission:validated",
  SUBMISSION_FLAGGED: "submission:flagged",
  AI_EVALUATION_COMPLETE: "ai-evaluation:complete",
  JUDGE_EVALUATION_COMPLETE: "judge-evaluation:complete",
  RANKINGS_UPDATED: "rankings:updated",
  FINALIST_SELECTED: "finalist:selected",
  WINNER_ANNOUNCED: "winner:announced",
  SPONSOR_ADDED: "sponsor:added",
  SPONSOR_REMOVED: "sponsor:removed",

  // Organizer-scoped events
  ORG_SUBMISSION_RECEIVED: "org:submission-received",
  ORG_TEAM_REGISTERED: "org:team-registered",
  ORG_JUDGE_SCORED: "org:judge-scored",
  ORG_STATS_UPDATED: "org:stats-updated",
  ORG_COMPETITION_STATUS: "org:competition-status",

  // Participant-scoped events
  PARTICIPANT_SUBMISSION_STATUS: "participant:submission-status",
  PARTICIPANT_TEAM_UPDATE: "participant:team-update",
  PARTICIPANT_SCORE_AVAILABLE: "participant:score-available",
  PARTICIPANT_RANK_UPDATED: "participant:rank-updated",
  PARTICIPANT_ACHIEVEMENT: "participant:achievement",

  // User-scoped (notifications)
  NOTIFICATION: "notification:new",
} as const;

// ── Event payload types ──

export interface CompetitionPublishedPayload {
  competitionId: string;
  title: string;
  slug: string;
  organizationName: string;
  totalPrizePool: number | null;
}

export interface TeamRegisteredPayload {
  competitionId: string;
  teamId: string;
  teamName: string;
  memberCount: number;
}

export interface SubmissionReceivedPayload {
  competitionId: string;
  submissionId: string;
  teamName: string;
  title: string;
  timestamp: string;
}

export interface SubmissionValidatedPayload {
  competitionId: string;
  submissionId: string;
  teamName: string;
  status: "valid" | "invalid" | "flagged";
  title: string;
}

export interface AIEvaluationCompletePayload {
  competitionId: string;
  submissionId: string;
  teamName: string;
  aiScore: number;
  title: string;
}

export interface JudgeEvaluationCompletePayload {
  competitionId: string;
  submissionId: string;
  judgeName: string;
  teamName: string;
}

export interface RankingsUpdatedPayload {
  competitionId: string;
  topEntries: { teamName: string; rank: number; score: number }[];
}

export interface OrgStatsUpdatedPayload {
  orgId: string;
  totalSubmissions: number;
  totalParticipants: number;
  activeCompetitions: number;
}

export interface ParticipantSubmissionStatusPayload {
  competitionId: string;
  submissionId: string;
  status: string;
  title: string;
}

export interface ParticipantScorePayload {
  competitionId: string;
  submissionId: string;
  aiScore: number | null;
  finalScore: number | null;
  rank: number | null;
  title: string;
}

export interface ParticipantAchievementPayload {
  achievementId: string;
  name: string;
  icon: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export interface SponsorAddedPayload {
  competitionId: string;
  companyName: string;
  sponsorTier: string;
}

export interface CompetitionStatusPayload {
  competitionId: string;
  title: string;
  oldStatus: string;
  newStatus: string;
}

export interface ParticipantTeamUpdatePayload {
  teamId: string;
  teamName: string;
  competitionId: string;
  action: "member_joined" | "member_left" | "invite_sent";
  memberName?: string;
}
