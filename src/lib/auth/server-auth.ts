import { auth } from "@clerk/nextjs/server";

/**
 * Thin wrapper around Clerk's auth().
 * All server components and API routes import this instead of Clerk directly.
 */
export async function serverAuth(): Promise<{ userId: string | null }> {
  const { userId } = await auth();
  return { userId };
}
