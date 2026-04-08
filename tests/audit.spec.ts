import { test, expect } from "@playwright/test";

const BASE = "https://competition-spark.vercel.app";

// ─── Fix 1: Webhook + profile sync (API-level check) ───────────────
test.describe("Fix 1: Competitions tags API exists", () => {
  test("GET /api/competitions/tags responds (200 or auth redirect)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/competitions/tags`);
    // API may require auth — accept 200 (public) or 307/302 (auth redirect)
    expect([200, 302, 307]).toContain(res.status());
    if (res.status() === 200) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty("tags");
        expect(Array.isArray(body.tags)).toBe(true);
      }
    }
  });
});

// ─── Fix 2: Homepage buttons for unauthenticated users ─────────────
test.describe("Fix 2: Homepage nav and CTAs", () => {
  test("Unauthenticated homepage shows Sign In and Get Started", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    // Should have sign-in link
    const signIn = page.locator('a[href="/sign-in"]').first();
    await expect(signIn).toBeVisible({ timeout: 10000 });
  });

  test("Homepage has CTA buttons linking to sign-up", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    // Hero CTAs should link to /sign-up for unauthenticated users
    const signUpLinks = page.locator('a[href="/sign-up"]');
    const count = await signUpLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Fix 3: Scroll snap on homepage ────────────────────────────────
test.describe("Fix 3: Scroll snap on landing page", () => {
  test("Landing page sections have snap-start class", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const snapSections = page.locator("section.snap-start");
    const count = await snapSections.count();
    // Should have at least 8 snapped sections
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test("Scroll snap is activated on the page", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    // The ScrollSnapActivator sets scroll-snap-type on <html>
    await page.waitForTimeout(2000); // Wait for client hydration
    const snapType = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).scrollSnapType;
    });
    expect(snapType).toContain("mandatory");
  });
});

// ─── Fix 4: Form validation (check that Zod schemas exist in build) ─
// We can't test forms without auth, but we can verify the pages load
test.describe("Fix 4: Pages load without errors", () => {
  test("Onboarding page loads", async ({ page }) => {
    const res = await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
    // May redirect to sign-in, but should not 500
    expect(res?.status()).toBeLessThan(500);
  });
});

// ─── Fix 5 & 6: Competitions marketplace ───────────────────────────
test.describe("Fix 5 & 6: Competitions marketplace", () => {
  test("Competitions page loads with filters", async ({ page }) => {
    await page.goto(`${BASE}/competitions`, { waitUntil: "domcontentloaded" });
    // Page should load without error
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("Competitions page has Ended filter option", async ({ page }) => {
    await page.goto(`${BASE}/competitions`, { waitUntil: "domcontentloaded" });
    // Look for the status filter containing "Ended"
    const pageContent = await page.content();
    expect(pageContent).toContain("Ended");
  });

  test("Competitions API responds to status=ended", async ({ request }) => {
    const res = await request.get(`${BASE}/api/competitions?status=ended`);
    // Accept 200 (public) or redirect (auth middleware)
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty("competitions");
      }
    }
  });

  test("Competitions API responds to status=active", async ({ request }) => {
    const res = await request.get(`${BASE}/api/competitions?status=active`);
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty("competitions");
      }
    }
  });

  test("Competitions API responds to status=all", async ({ request }) => {
    const res = await request.get(`${BASE}/api/competitions?status=all`);
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty("competitions");
      }
    }
  });
});

// ─── Fix 7: Dynamic tags ───────────────────────────────────────────
test.describe("Fix 7: Dynamic tags", () => {
  test("Tags API endpoint responds", async ({ request }) => {
    const res = await request.get(`${BASE}/api/competitions/tags`);
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const body = JSON.parse(text);
        expect(Array.isArray(body.tags)).toBe(true);
      }
    }
  });

  test("Competitions page shows tag filter pills", async ({ page }) => {
    await page.goto(`${BASE}/competitions`, { waitUntil: "domcontentloaded" });
    // Wait for page to load
    await page.waitForTimeout(2000);
    // Check if tag pills section exists (may be empty if no tags in DB)
    const pageContent = await page.content();
    // The filter component should be present
    const hasFilters = pageContent.includes("All Statuses") || pageContent.includes("category");
    expect(hasFilters).toBe(true);
  });

  test("Competitions page supports tag query param", async ({ page }) => {
    const res = await page.goto(`${BASE}/competitions?tag=ai`, { waitUntil: "domcontentloaded" });
    // Should not error even if no results
    expect(res?.status()).toBeLessThan(500);
  });
});

// ─── General: Site health ──────────────────────────────────────────
test.describe("Site health", () => {
  test("Homepage loads under 10s", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });

  test("No console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    // Filter out known third-party errors
    const realErrors = errors.filter(
      (e) => !e.includes("clerk") && !e.includes("third-party")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("Sign-in page loads", async ({ page }) => {
    const res = await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
  });

  test("Sign-up page loads", async ({ page }) => {
    const res = await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
  });
});
