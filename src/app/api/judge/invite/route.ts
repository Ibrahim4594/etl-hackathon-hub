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

    const body = await req.json();
    const { email, name, competitionId, expertise } = body as {
      email?: string;
      name?: string;
      competitionId?: string;
      expertise?: string;
    };

    if (!email || !competitionId || !name) {
      return NextResponse.json({ error: "name, email, and competitionId are required" }, { status: 400 });
    }

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

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://competition-spark.vercel.app";

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
              <p>Dear <strong>${name}</strong>,</p>
              <p>You've been invited by <strong>${competition.orgName}</strong> to evaluate submissions for:</p>
              <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
                <h3 style="margin-top:0;color:#0d9488;">${competition.title}</h3>
                ${expertise ? `<p style="color:#666;margin-bottom:0;">Your expertise: ${expertise}</p>` : ""}
              </div>
              <p>To get started:</p>
              <ol style="color:#444;line-height:1.8;">
                <li>Click the button below to visit Spark</li>
                <li>Sign in with your Google account</li>
                <li>Select <strong>"Judge"</strong> and complete your profile</li>
                <li>Start reviewing submissions!</li>
              </ol>
              <div style="text-align:center;margin:30px 0;">
                <a href="${appUrl}" style="display:inline-block;padding:14px 32px;background:#0d9488;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                  Accept Invitation
                </a>
              </div>
              <p style="color:#999;font-size:13px;">This invitation was sent to ${email}.</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send judge invitation email:", emailError);
    }

    return NextResponse.json({
      message: existingUser
        ? "Judge assigned and notified"
        : "Invitation sent — judge will be assigned when they sign up",
    });
  } catch (error) {
    console.error("Judge invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite judge" },
      { status: 500 }
    );
  }
}
