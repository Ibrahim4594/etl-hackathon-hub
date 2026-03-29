import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "sponsor",
  "judge",
  "admin",
]);

export const hackathonStatusEnum = pgEnum("hackathon_status", [
  "draft",
  "pending_review",
  "approved",
  "active",
  "judging",
  "completed",
  "cancelled",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "submitted",
  "validating",
  "valid",
  "invalid",
  "flagged",
  "ai_evaluated",
  "judged",
  "finalist",
  "winner",
]);

export const teamRoleEnum = pgEnum("team_role", [
  "lead",
  "member",
]);

export const orgVerificationEnum = pgEnum("org_verification", [
  "pending",
  "verified",
  "rejected",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "competition_approved",
  "competition_rejected",
  "team_invite",
  "team_joined",
  "submission_valid",
  "submission_invalid",
  "submission_flagged",
  "ai_evaluation_complete",
  "judge_assigned",
  "judge_evaluation_complete",
  "finalist_selected",
  "winner_announced",
  "payment_received",
  "general",
]);

export const validationCheckEnum = pgEnum("validation_check", [
  "required_fields",
  "github_repo",
  "video_link",
  "deadline",
]);

export const validationResultEnum = pgEnum("validation_result", [
  "pass",
  "fail",
  "warning",
]);

export const contributionTypeEnum = pgEnum("contribution_type", [
  "monetary",
  "tech_credits",
  "mentorship",
  "internships",
  "prizes_inkind",
  "cloud_services",
  "api_credits",
  "other",
]);

export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "title",
  "gold",
  "silver",
  "bronze",
  "partner",
]);

export const competitionVisibilityEnum = pgEnum("competition_visibility", [
  "public",
  "private",
]);
