import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

/**
 * DEV-ONLY: Simulates Pusher events for testing real-time UI.
 * POST /api/dev/pusher-simulate
 * Body: { channel, event, data } or { preset, targetId }
 *
 * Presets:
 *  - "submission" -> fires ORG_SUBMISSION_RECEIVED on organizer-{targetId}
 *  - "registration" -> fires ORG_TEAM_REGISTERED on organizer-{targetId}
 *  - "score" -> fires PARTICIPANT_SCORE_AVAILABLE on participant-{targetId}
 *  - "notification" -> fires NOTIFICATION on user-{targetId}
 *  - "achievement" -> fires PARTICIPANT_ACHIEVEMENT on participant-{targetId}
 *  - "validation" -> fires PARTICIPANT_SUBMISSION_STATUS on participant-{targetId}
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json();

  // Direct mode
  if (body.channel && body.event) {
    await triggerEvent(body.channel, body.event, body.data ?? {});
    return NextResponse.json({ ok: true, channel: body.channel, event: body.event });
  }

  // Preset mode
  const { preset, targetId } = body;
  if (!preset || !targetId) {
    return NextResponse.json(
      { error: "Provide { channel, event, data } or { preset, targetId }" },
      { status: 400 }
    );
  }

  const ts = new Date().toISOString();

  switch (preset) {
    case "submission":
      await triggerEvent(channels.organizer(targetId), EVENTS.ORG_SUBMISSION_RECEIVED, {
        competitionId: "demo-comp-id",
        submissionId: `sim-${Date.now()}`,
        teamName: "Demo Team Alpha",
        title: "AI-Powered Traffic Optimizer",
        timestamp: ts,
      });
      break;

    case "registration":
      await triggerEvent(channels.organizer(targetId), EVENTS.ORG_TEAM_REGISTERED, {
        competitionId: "demo-comp-id",
        teamId: `sim-team-${Date.now()}`,
        teamName: "Team Innovation",
        memberCount: 3,
      });
      break;

    case "score":
      await triggerEvent(channels.participant(targetId), EVENTS.PARTICIPANT_SCORE_AVAILABLE, {
        competitionId: "demo-comp-id",
        submissionId: `sim-${Date.now()}`,
        aiScore: 8.5,
        finalScore: null,
        rank: 3,
        title: "Your Project",
      });
      break;

    case "notification":
      await triggerEvent(channels.user(targetId), EVENTS.NOTIFICATION, {
        id: `sim-notif-${Date.now()}`,
        type: "general",
        title: "Test Notification",
        message: "This is a simulated real-time notification.",
        createdAt: ts,
      });
      break;

    case "achievement":
      await triggerEvent(channels.participant(targetId), EVENTS.PARTICIPANT_ACHIEVEMENT, {
        achievementId: "first_submission",
        name: "First Submission",
        icon: "🚀",
      });
      break;

    case "validation":
      await triggerEvent(channels.participant(targetId), EVENTS.PARTICIPANT_SUBMISSION_STATUS, {
        competitionId: "demo-comp-id",
        submissionId: `sim-${Date.now()}`,
        status: "valid",
        title: "Your Project Passed Validation",
      });
      break;

    default:
      return NextResponse.json({ error: `Unknown preset: ${preset}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, preset, targetId });
}
