import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Thin wrapper around Clerk's auth().
 * All server components and API routes import this instead of Clerk directly.
 */
export async function serverAuth(): Promise<{ userId: string | null }> {
  const { userId } = await auth();
  return { userId };
}

type DbUser = typeof users.$inferSelect;

type AuthResult =
  | { dbUser: DbUser; error: null }
  | { dbUser: null; error: NextResponse };

/**
 * Authenticates the current request and looks up the DB user in one call.
 * Eliminates the repeated 6-line auth + DB lookup boilerplate across API routes.
 *
 * Usage:
 *   const { dbUser, error } = await getAuthenticatedDbUser();
 *   if (error) return error;
 *   // dbUser is guaranteed non-null here
 */
export async function getAuthenticatedDbUser(): Promise<AuthResult> {
  const { userId } = await serverAuth();
  if (!userId) {
    return {
      dbUser: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)));

  if (!dbUser) {
    return {
      dbUser: null,
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { dbUser, error: null };
}
