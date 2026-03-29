import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/competitions(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite(.*)",
  "/api/webhooks(.*)",
  "/api/dev(.*)",
  "/api/invite(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isOnboardingApiRoute = createRouteMatcher(["/api/onboarding(.*)"]);

const isStudentRoute = createRouteMatcher(["/student(.*)"]);
const isSponsorRoute = createRouteMatcher(["/sponsor(.*)"]);
const isJudgeRoute = createRouteMatcher(["/judge(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes through
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require auth for all other routes
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Allow onboarding API routes through — they run their own auth() check
  // and must be reachable before the user has a role assigned.
  if (isOnboardingApiRoute(req)) {
    return NextResponse.next();
  }

  // --- Resolve role + onboardingComplete ---
  // Fast path: read from session JWT (requires a custom session-token
  // template in Clerk Dashboard that maps "metadata" → user.public_metadata).
  let role = (sessionClaims?.metadata as { role?: string })?.role;
  let onboardingComplete = (sessionClaims?.metadata as { onboardingComplete?: boolean })?.onboardingComplete;

  // Slow-path fallback: if the JWT doesn't carry metadata (template not
  // configured, or the token hasn't refreshed yet after a metadata update),
  // fetch the user record directly from Clerk so we always have the latest
  // publicMetadata.
  if (role === undefined) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    role = (user.publicMetadata as { role?: string })?.role;
    onboardingComplete = (user.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete;
  }

  // If no role or onboarding not complete, redirect to onboarding
  // But allow API routes through to prevent redirect loops
  if (!role || !onboardingComplete) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    if (!isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.next();
  }

  // If onboarding complete but on onboarding page, redirect to dashboard
  if (isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
  }

  // Role-based route protection
  if (isStudentRoute(req) && role !== "student" && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
  }
  if (isSponsorRoute(req) && role !== "sponsor" && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
  }
  if (isJudgeRoute(req) && role !== "judge" && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
  }
  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
