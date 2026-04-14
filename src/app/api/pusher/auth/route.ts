import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { pusher } from "@/lib/services/pusher";

export async function POST(req: NextRequest) {
  try {
    if (!pusher) {
      return NextResponse.json(
        { error: "Pusher not configured" },
        { status: 500 }
      );
    }

    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const body = await req.formData();
    const socketId = body.get("socket_id") as string;
    const channel = body.get("channel_name") as string;

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // --- Channel authorization rules ---

    // private-user-{userId}: only the user themselves (or admin)
    if (channel.startsWith("private-user-")) {
      const channelUserId = channel.replace("private-user-", "");
      if (channelUserId !== dbUser.id && dbUser.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // private-participant-{userId}: only the participant themselves (or admin)
    if (channel.startsWith("private-participant-")) {
      const channelUserId = channel.replace("private-participant-", "");
      if (channelUserId !== dbUser.id && dbUser.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // private-organizer-{orgId}: only the org owner (or admin)
    if (channel.startsWith("private-organizer-")) {
      const channelOrgId = channel.replace("private-organizer-", "");
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, channelOrgId));

      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      if (org.ownerId !== dbUser.id && dbUser.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
