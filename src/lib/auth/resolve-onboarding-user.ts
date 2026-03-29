import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolves a DB user for onboarding routes.
 * Handles:
 * 1. User exists by clerkId → return
 * 2. User exists by email (old session / webhook race) → update clerkId, return
 * 3. User doesn't exist → create from Clerk data, return
 */
export async function resolveOnboardingUser(clerkId: string) {
  // 1. Try by clerkId
  const [byClerkId] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (byClerkId) return byClerkId;

  // 2. Get email from Clerk
  let clerkUser;
  try {
    const client = await clerkClient();
    clerkUser = await client.users.getUser(clerkId);
  } catch (err) {
    console.error("resolveOnboardingUser: Clerk getUser failed for", clerkId, err);
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "";
  if (!email) {
    console.error("resolveOnboardingUser: No email found for Clerk user", clerkId);
    return null;
  }

  // 3. Try by email (handles old sessions / webhook race)
  const [byEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (byEmail) {
    await db
      .update(users)
      .set({ clerkId, updatedAt: new Date() })
      .where(eq(users.id, byEmail.id));
    return { ...byEmail, clerkId };
  }

  // 4. Create new user
  try {
    const [inserted] = await db
      .insert(users)
      .values({
        clerkId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      })
      .returning();
    return inserted;
  } catch (err) {
    console.error("resolveOnboardingUser: Insert failed for", email, err);
    // Race condition — try fetching by clerkId or email one more time
    const [raced] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return raced ?? null;
  }
}
