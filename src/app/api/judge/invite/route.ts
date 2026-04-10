// TODO: Add rate limiting (@upstash/ratelimit) — currently unprotected
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  judgeInvitations,
  judgeAssignments,
  organizations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/email";
import { createNotification } from "@/lib/services/notification";
import { apiError } from "@/lib/api-error";
import { z } from "zod/v4";

const judgeInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  competitionId: z.string().uuid(),
  expertise: z.string().max(500).optional(),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * POST /api/judge/invite
 * Invite a judge to a competition by email. Auto-assigns if the judge already has an account.
 *
 * @auth Required (Clerk session, role: sponsor owner or admin)
 * @body { email, name, competitionId, expertise? }
 * @returns { message: string } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Only organizers or admins can invite judges" }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = judgeInviteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
    }
    const { email, name, competitionId, expertise } = parsed.data;

    // Fetch competition with org name
    const [competition] = await db
      .select({
        id: competitions.id,
        title: competitions.title,
        createdBy: competitions.createdBy,
        orgName: organizations.name,
      })
      .from(competitions)
      .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
      .where(eq(competitions.id, competitionId));

    if (!competition) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

    if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
      return NextResponse.json({ error: "You can only invite judges to your own competitions" }, { status: 403 });
    }

    // H9: Check if an invitation for this email+competition already exists
    const [existingInvitation] = await db
      .select({ id: judgeInvitations.id })
      .from(judgeInvitations)
      .where(and(
        eq(judgeInvitations.competitionId, competitionId),
        eq(judgeInvitations.judgeEmail, email.trim().toLowerCase())
      ));

    if (existingInvitation) {
      return NextResponse.json({ error: "An invitation has already been sent to this email for this competition" }, { status: 409 });
    }

    // Check if judge already has an account AND is already assigned
    const [existingUser] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));

    if (existingUser) {
      const [existingAssignment] = await db
        .select()
        .from(judgeAssignments)
        .where(and(eq(judgeAssignments.judgeId, existingUser.id), eq(judgeAssignments.competitionId, competitionId)));

      if (existingAssignment) {
        return NextResponse.json({ error: "This judge is already assigned to this competition" }, { status: 409 });
      }

      // User exists — assign directly
      await db.insert(judgeAssignments).values({
        judgeId: existingUser.id,
        competitionId,
        expertise: expertise?.trim() || null,
      });

      if (!existingUser.role || existingUser.role !== "judge") {
        await db.update(users).set({ role: "judge", updatedAt: new Date() }).where(eq(users.id, existingUser.id));
      }

      await createNotification({
        userId: existingUser.id,
        type: "judge_assigned",
        title: "Judge Invitation",
        message: `You have been invited to judge "${competition.title}".`,
        link: `/judge/dashboard`,
      });
    }

    // Create invitation record (for tracking + auto-assign on signup)
    await db.insert(judgeInvitations).values({
      competitionId,
      judgeName: name.trim(),
      judgeEmail: email.trim().toLowerCase(),
      expertise: expertise?.trim() || null,
      invitedBy: dbUser.id,
      accepted: !!existingUser,
      acceptedAt: existingUser ? new Date() : null,
    });

    // Send invitation email (HTML-escape user-supplied values)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://competition-spark.vercel.app";
    const safeName = escapeHtml(name.trim());
    const safeOrgName = escapeHtml(competition.orgName ?? "");
    const safeTitle = escapeHtml(competition.title);
    const safeExpertise = expertise ? escapeHtml(expertise.trim()) : null;
    const safeEmail = escapeHtml(email);

    let emailSent = false;
    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to judge: ${competition.title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="text-align:center;padding:30px 0;">
              <h1 style="color:#0d9488;margin:0;">SPARK</h1>
              <p style="color:#666;margin-top:5px;">Competition Platform</p>
            </div>
            <div style="padding:30px;background:#f8fafa;border-radius:12px;">
              <h2 style="margin-top:0;">Judge Invitation</h2>
              <p>Dear <strong>${safeName}</strong>,</p>
              <p>You've been invited by <strong>${safeOrgName}</strong> to evaluate submissions for:</p>
              <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
                <h3 style="margin-top:0;color:#0d9488;">${safeTitle}</h3>
                ${safeExpertise ? `<p style="color:#666;margin-bottom:0;">Your expertise: ${safeExpertise}</p>` : ""}
              </div>
              <p>To get started:</p>
              <ol style="color:#444;line-height:1.8;">
                <li>Click the button below to visit Spark</li>
                <li>Sign in with your Google account</li>
                <li>Select <strong>&quot;Judge&quot;</strong> and complete your profile</li>
                <li>Start reviewing submissions!</li>
              </ol>
              <div style="text-align:center;margin:30px 0;">
                <a href="${appUrl}" style="display:inline-block;padding:14px 32px;background:#0d9488;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                  Accept Invitation
                </a>
              </div>
              <p style="color:#999;font-size:13px;">This invitation was sent to ${safeEmail}.</p>
            </div>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send judge invitation email:", emailError);
    }

    return NextResponse.json({
      message: existingUser
        ? "Judge assigned and notified"
        : emailSent
          ? "Invitation sent — judge will be assigned when they sign up"
          : "Invitation created but email delivery failed. Please verify your RESEND_API_KEY is configured correctly.",
      emailSent,
    });
  } catch (error) {
    console.error("Judge invite error:", error);
    return apiError(error, "Failed to invite judge");
  }
}
