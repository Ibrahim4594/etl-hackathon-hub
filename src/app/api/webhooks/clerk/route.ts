import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type WebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  switch (type) {
    case "user.created": {
      await db.insert(users).values({
        clerkId: data.id,
        email: data.email_addresses[0]?.email_address ?? "",
        firstName: data.first_name,
        lastName: data.last_name,
        imageUrl: data.image_url,
      });
      break;
    }

    case "user.updated": {
      const role = data.public_metadata?.role as string | undefined;
      const onboardingComplete = data.public_metadata?.onboardingComplete as boolean | undefined;

      await db
        .update(users)
        .set({
          email: data.email_addresses[0]?.email_address,
          firstName: data.first_name,
          lastName: data.last_name,
          imageUrl: data.image_url,
          ...(role && { role: role as "student" | "sponsor" | "judge" | "admin" }),
          ...(onboardingComplete !== undefined && { onboardingComplete }),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, data.id));
      break;
    }

    case "user.deleted": {
      await db.delete(users).where(eq(users.clerkId, data.id));
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
