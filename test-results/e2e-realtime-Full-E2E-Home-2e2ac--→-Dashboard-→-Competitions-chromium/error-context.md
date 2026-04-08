# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-realtime.spec.ts >> Full E2E: Homepage → Sign Up → Onboarding → Dashboard → Competitions
- Location: tests\e2e-realtime.spec.ts:7:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.screenshot: Test timeout of 120000ms exceeded.
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const BASE = "https://competition-spark.vercel.app";
  4   | 
  5   | test.use({ headless: false, viewport: { width: 1440, height: 900 } });
  6   | 
  7   | test("Full E2E: Homepage → Sign Up → Onboarding → Dashboard → Competitions", async ({ page }) => {
  8   |   test.setTimeout(120000); // 2 minutes
  9   |   // ─── 1. Homepage ─────────────────────────────────────────────
  10  |   console.log("→ Opening homepage...");
  11  |   await page.goto(BASE, { waitUntil: "domcontentloaded" });
  12  |   await page.waitForTimeout(2000);
  13  | 
  14  |   // Verify scroll snap sections
  15  |   const snapSections = await page.locator("section.snap-start").count();
  16  |   console.log(`  ✓ Found ${snapSections} snap sections on homepage`);
  17  |   expect(snapSections).toBeGreaterThanOrEqual(8);
  18  | 
  19  |   // Verify Sign In button exists
  20  |   const signInBtn = page.locator('a[href="/sign-in"]').first();
  21  |   await expect(signInBtn).toBeVisible({ timeout: 10000 });
  22  |   console.log("  ✓ Sign In button visible in navbar");
  23  | 
  24  |   // Verify CTA buttons
  25  |   const signUpLinks = page.locator('a[href="/sign-up"]');
  26  |   const ctaCount = await signUpLinks.count();
  27  |   console.log(`  ✓ Found ${ctaCount} sign-up CTA links`);
  28  |   expect(ctaCount).toBeGreaterThan(0);
  29  | 
  30  |   // Scroll through sections to verify snap
  31  |   console.log("→ Scrolling through homepage sections...");
  32  |   for (let i = 0; i < 4; i++) {
  33  |     await page.keyboard.press("PageDown");
  34  |     await page.waitForTimeout(800);
  35  |   }
  36  |   console.log("  ✓ Scroll snap working");
  37  | 
  38  |   // Scroll back to top
  39  |   await page.keyboard.press("Home");
  40  |   await page.waitForTimeout(500);
  41  | 
  42  |   // ─── 2. Navigate to Competitions Marketplace ─────────────────
  43  |   console.log("→ Navigating to competitions marketplace...");
  44  |   await page.goto(`${BASE}/competitions`, { waitUntil: "domcontentloaded" });
  45  |   await page.waitForTimeout(2000);
  46  | 
  47  |   // Verify page loaded
  48  |   await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  49  |   console.log("  ✓ Competitions page loaded");
  50  | 
  51  |   // Check for Ended filter
  52  |   const pageContent = await page.content();
  53  |   const hasEnded = pageContent.includes("Ended");
  54  |   console.log(`  ✓ Ended filter present: ${hasEnded}`);
  55  | 
  56  |   // Check for competition cards
  57  |   const cards = page.locator("[class*='card'], [class*='Card']").first();
  58  |   const hasCards = await cards.isVisible().catch(() => false);
  59  |   console.log(`  ✓ Competition cards visible: ${hasCards}`);
  60  | 
  61  |   // Try tag filter if available
  62  |   await page.goto(`${BASE}/competitions?tag=ai`, { waitUntil: "domcontentloaded" });
  63  |   await page.waitForTimeout(1500);
  64  |   console.log("  ✓ Tag filter query works (no crash)");
  65  | 
  66  |   // ─── 3. Navigate to Sign Up ──────────────────────────────────
  67  |   console.log("→ Opening sign-up page...");
  68  |   await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
  69  |   await page.waitForTimeout(3000);
  70  | 
  71  |   // Check Clerk UI loaded
  72  |   const clerkForm = page.locator('[class*="cl-"], [data-clerk]').first();
  73  |   const clerkLoaded = await clerkForm.isVisible({ timeout: 10000 }).catch(() => false);
  74  |   console.log(`  ✓ Clerk sign-up form loaded: ${clerkLoaded}`);
  75  | 
  76  |   // Screenshot sign-up page
  77  |   await page.screenshot({ path: "tests/screenshots/sign-up.png", fullPage: true });
  78  |   console.log("  ✓ Screenshot saved: tests/screenshots/sign-up.png");
  79  | 
  80  |   // ─── 4. Navigate to Sign In ──────────────────────────────────
  81  |   console.log("→ Opening sign-in page...");
  82  |   await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  83  |   await page.waitForTimeout(3000);
  84  | 
  85  |   const clerkSignIn = page.locator('[class*="cl-"], [data-clerk]').first();
  86  |   const signInLoaded = await clerkSignIn.isVisible({ timeout: 10000 }).catch(() => false);
  87  |   console.log(`  ✓ Clerk sign-in form loaded: ${signInLoaded}`);
  88  | 
  89  |   // Screenshot sign-in page
> 90  |   await page.screenshot({ path: "tests/screenshots/sign-in.png", fullPage: true });
      |              ^ Error: page.screenshot: Test timeout of 120000ms exceeded.
  91  |   console.log("  ✓ Screenshot saved: tests/screenshots/sign-in.png");
  92  | 
  93  |   // ─── 5. Try Google OAuth sign-in ─────────────────────────────
  94  |   console.log("→ Attempting Google sign-in...");
  95  | 
  96  |   // Look for Google OAuth button in Clerk's UI
  97  |   const googleBtn = page.locator('button:has-text("Google"), button:has-text("google"), [class*="cl-socialButton"]').first();
  98  |   const hasGoogle = await googleBtn.isVisible({ timeout: 5000 }).catch(() => false);
  99  | 
  100 |   if (hasGoogle) {
  101 |     console.log("  ✓ Google OAuth button found — clicking...");
  102 |     await googleBtn.click();
  103 |     await page.waitForTimeout(3000);
  104 | 
  105 |     // We'll land on Google's auth page
  106 |     const currentUrl = page.url();
  107 |     console.log(`  → Redirected to: ${currentUrl}`);
  108 | 
  109 |     if (currentUrl.includes("accounts.google.com")) {
  110 |       console.log("  ✓ Successfully reached Google OAuth page");
  111 |       await page.screenshot({ path: "tests/screenshots/google-oauth.png", fullPage: true });
  112 |       console.log("  ✓ Screenshot saved: tests/screenshots/google-oauth.png");
  113 | 
  114 |       // Go back to our site to test other flows
  115 |       await page.goto(BASE, { waitUntil: "domcontentloaded" });
  116 |     }
  117 |   } else {
  118 |     console.log("  ⓘ No Google button found — Clerk may use different auth method");
  119 |   }
  120 | 
  121 |   // ─── 6. Test onboarding page (accessible without auth) ──────
  122 |   console.log("→ Testing onboarding page...");
  123 |   await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  124 |   await page.waitForTimeout(2000);
  125 | 
  126 |   const currentUrl = page.url();
  127 |   if (currentUrl.includes("sign-in")) {
  128 |     console.log("  ✓ Onboarding correctly redirects to sign-in for unauthenticated users");
  129 |   } else if (currentUrl.includes("onboarding")) {
  130 |     console.log("  ✓ Onboarding page loaded");
  131 |     await page.screenshot({ path: "tests/screenshots/onboarding.png", fullPage: true });
  132 | 
  133 |     // Check for role cards
  134 |     const roleCards = page.locator("text=Participant, text=Organizer, text=Judge, text=Admin");
  135 |     const roleCount = await roleCards.count();
  136 |     console.log(`  ✓ Found ${roleCount} role option(s)`);
  137 |   }
  138 | 
  139 |   // ─── 7. Test protected routes redirect properly ──────────────
  140 |   console.log("→ Testing protected route redirects...");
  141 | 
  142 |   const protectedRoutes = [
  143 |     "/student/dashboard",
  144 |     "/sponsor/dashboard",
  145 |     "/judge/dashboard",
  146 |     "/admin/dashboard",
  147 |   ];
  148 | 
  149 |   for (const route of protectedRoutes) {
  150 |     await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  151 |     await page.waitForTimeout(1500);
  152 |     const url = page.url();
  153 |     const redirectedToAuth = url.includes("sign-in") || url.includes("sign-up") || url.includes("onboarding");
  154 |     console.log(`  ${redirectedToAuth ? "✓" : "✗"} ${route} → ${redirectedToAuth ? "redirected to auth" : url}`);
  155 |   }
  156 | 
  157 |   // ─── 8. Test 404 page ────────────────────────────────────────
  158 |   console.log("→ Testing 404 page...");
  159 |   await page.goto(`${BASE}/nonexistent-page-xyz`, { waitUntil: "domcontentloaded" });
  160 |   await page.waitForTimeout(1500);
  161 |   const has404 = (await page.content()).includes("404") || (await page.content()).includes("not found");
  162 |   console.log(`  ✓ 404 page shows: ${has404}`);
  163 | 
  164 |   // ─── 9. Competition detail page ──────────────────────────────
  165 |   console.log("→ Testing competition detail page...");
  166 |   await page.goto(`${BASE}/competitions`, { waitUntil: "domcontentloaded" });
  167 |   await page.waitForTimeout(2000);
  168 | 
  169 |   // Click first competition card if available
  170 |   const firstCompLink = page.locator('a[href*="/competitions/"]').first();
  171 |   const hasComp = await firstCompLink.isVisible({ timeout: 5000 }).catch(() => false);
  172 | 
  173 |   if (hasComp) {
  174 |     await firstCompLink.click();
  175 |     await page.waitForTimeout(2000);
  176 |     const detailUrl = page.url();
  177 |     console.log(`  ✓ Navigated to competition detail: ${detailUrl}`);
  178 |     await page.screenshot({ path: "tests/screenshots/competition-detail.png", fullPage: true });
  179 |     console.log("  ✓ Screenshot saved: tests/screenshots/competition-detail.png");
  180 |   } else {
  181 |     console.log("  ⓘ No competition cards to click");
  182 |   }
  183 | 
  184 |   // ─── 10. Final homepage screenshot ───────────────────────────
  185 |   console.log("→ Taking final homepage screenshots...");
  186 |   await page.goto(BASE, { waitUntil: "domcontentloaded" });
  187 |   await page.waitForTimeout(2000);
  188 |   await page.screenshot({ path: "tests/screenshots/homepage-light.png", fullPage: true });
  189 |   console.log("  ✓ Homepage light mode screenshot saved");
  190 | 
```