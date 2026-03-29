import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Ensures a DB user record exists for the given Clerk user ID.
 *
 * Handles the webhook race condition: when a user signs up (especially via
 * Google OAuth), the Clerk `user.created` webhook may be delayed.  Meanwhile
 * the middleware lets the request through (it checks Clerk BAPI, not the DB),
 * and the page's DB lookup fails — causing a redirect to "/".
 *
 * This function fixes that by creating the DB record on-the-spot from Clerk
 * data when it's missing.
 */
export async function ensureDbUser(clerkId: string) {
  // Fast path: user already exists in DB (99.9% of requests)
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (existing) return existing;

  // Dev users should always exist in DB (created by /api/dev/auth).
  // Never call Clerk API for them.
  if (clerkId.startsWith("dev_")) return null;

  // Slow path: webhook hasn't fired yet — create from Clerk data
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);

  const role = (clerkUser.publicMetadata as { role?: string })?.role as
    | "student"
    | "sponsor"
    | "judge"
    | "admin"
    | undefined;
  const onboardingComplete =
    (clerkUser.publicMetadata as { onboardingComplete?: boolean })
      ?.onboardingComplete ?? false;

  try {
    const [inserted] = await db
      .insert(users)
      .values({
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        ...(role ? { role } : {}),
        onboardingComplete,
      })
      .returning();

    return inserted;
  } catch {
    // Unique-constraint race: another request inserted between our SELECT
    // and INSERT.  Re-fetch the row that now exists.
    const [raced] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    return raced ?? null;
  }
}
