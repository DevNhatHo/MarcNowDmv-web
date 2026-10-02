import { expect, test, type Page } from "@playwright/test";

/**
 * The local integration smoke test.
 *
 * This is the only suite that requires the Go backend to be running; everything else in the
 * repository is deterministic. It exercises the whole path a commuter takes — browser to
 * same-origin proxy to backend — across all four screens, the contract's pagination and its
 * error responses.
 *
 * It asserts *behaviour*, never particular trains or times, so it keeps working as the
 * retained data changes. Where the retained database cannot produce a state, the test says
 * so rather than pretending to cover it.
 */

async function settled(page: Page, path: string) {
  await page.goto(path);
  // Not networkidle: a vector map streams tiles continuously, so the network never settles
  // on /map.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
}

test("the backend is reachable through the same-origin proxy", async ({ request }) => {
  const health = await request.get("/api/backend/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok" });

  // The browser never needs CORS, because the request never leaves the frontend origin.
  expect(health.headers()["access-control-allow-origin"]).toBeUndefined();
});

test("the proxy forwards only the contract's paths", async ({ request }) => {
  for (const path of ["/api/v1/trains?limit=1", "/api/v1/routes", "/api/v1/alerts?limit=1"]) {
    expect((await request.get(`/api/backend${path}`)).status()).toBe(200);
  }
  for (const path of ["/api/v1/routes/not-a-route", "/metrics", "/api/v2/trains"]) {
    expect((await request.get(`/api/backend${path}`)).status()).toBe(404);
  }
  expect((await request.post("/api/backend/api/v1/trains")).status()).toBe(405);
});

test("the contract's own error responses reach the screen as copy", async ({ request, page }) => {
  // The backend rejects these itself; the proxy passes the status through untouched.
  expect((await request.get("/api/backend/api/v1/trains?limit=bad")).status()).toBe(400);
  expect((await request.get("/api/backend/api/v1/trains/not-a-real-token")).status()).toBe(404);

  // The cursor names must be checked against a real identifier: the backend resolves the
  // train before it validates the query, so an unknown id answers 404 first.
  const page1 = await request.get("/api/backend/api/v1/trains?limit=1");
  const { data } = (await page1.json()) as { data: { id: string }[] };
  const id = encodeURIComponent(data[0].id);
  expect((await request.get(`/api/backend/api/v1/trains/${id}?afterStop=1`)).status()).toBe(200);
  // The documented prose uses stopAfter; the handler only accepts afterStop.
  expect((await request.get(`/api/backend/api/v1/trains/${id}?stopAfter=1`)).status()).toBe(400);

  await settled(page, "/trains/not-a-real-token");
  await expect(page.getByText("That train isn't available")).toBeVisible();
  // Exactly one way back, not the same control twice.
  await expect(page.getByRole("link", { name: /Back to trains/ })).toHaveCount(1);
});

test("Pulse summarises the service date and links into the filtered list", async ({ page }) => {
  await settled(page, "/");
  const lines = page.getByRole("list", { name: "MARC lines" });
  await expect(lines).toBeVisible();
  expect(await lines.locator("> li").count()).toBeGreaterThan(0);
  // The scope is always stated, and no claim is made about trains running now.
  await expect(page.getByText(/^Based on \d+ scheduled trains? for/)).toBeVisible();
  await expect(page.getByText(/do not say how many trains are running now/)).toBeVisible();

  const first = lines.locator("a").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/^\/trains\?serviceDate=\d{8}&routeId=/);
  await first.click();
  await page.waitForURL(/\/trains\?serviceDate=/);
  await expect(page.getByRole("list", { name: "Scheduled trains" })).toBeVisible();
});

test("the train list paginates and keeps one schedule version", async ({ page }) => {
  await settled(page, "/trains");
  const rows = page.getByRole("list", { name: "Scheduled trains" }).locator("> li");
  const firstPage = await rows.count();
  expect(firstPage).toBeGreaterThan(0);

  const more = page.getByRole("button", { name: "Load more trains" });
  if ((await more.count()) > 0) {
    await more.click();
    await expect
      .poll(async () => rows.count(), { timeout: 20_000 })
      .toBeGreaterThan(firstPage);
    // A completed walk says so, rather than leaving a partial list looking complete.
    await expect(page.getByText(/scheduled trains for this date are shown/)).toBeVisible();
  } else {
    await expect(page.getByText(/scheduled trains for this date are shown/)).toBeVisible();
  }

  // Rows are chronological, whatever order the backend paginated them in.
  const times = (await rows.locator("a").allInnerTexts()).map((text) => text.split("\n")[0]);
  expect(times).toEqual([...times].sort());
});

test("filters survive navigation and the back link restores them", async ({ page }) => {
  await settled(page, "/");
  const line = page.getByRole("list", { name: "MARC lines" }).locator("a").first();
  await line.click();
  await page.waitForURL(/\/trains\?serviceDate=/);
  const listUrl = page.url();

  await page.getByRole("list", { name: "Scheduled trains" }).locator("a").first().click();
  await page.waitForURL(/\/trains\/.+/);
  const back = page.getByRole("link", { name: "Back to trains" });
  await expect(back).toBeVisible();
  await back.click();
  await page.waitForURL(/\/trains\?/);
  expect(new URL(page.url()).search).toBe(new URL(listUrl).search);
});

test("train detail separates scheduled, official and calculated information", async ({ page }) => {
  await settled(page, "/trains");
  await page.getByRole("list", { name: "Scheduled trains" }).locator("a").first().click();
  await page.waitForURL(/\/trains\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Each provenance names its own source, and neither borrows the other's authority.
  await expect(page.getByText(/^Official MTA ·/)).toBeVisible();
  await expect(page.getByText("MARC Now · observed movement")).toBeVisible();
  await expect(page.getByText("MARC Now · trend of official delays")).toBeVisible();
  await expect(
    page.getByText(/An official estimate is shown only where the operator/),
  ).toBeVisible();

  // Diagnostics stay closed and hold the raw vocabulary.
  const diagnostics = page.locator("details");
  await expect(diagnostics).toHaveAttribute("open", /^$/, { timeout: 1 }).catch(() => {});
  expect(await diagnostics.evaluate((node: HTMLDetailsElement) => node.open)).toBe(false);
});

test("alerts render the operator's advisories with safe links only", async ({ page }) => {
  await settled(page, "/alerts");
  const body = page.locator("main");
  await expect(body).toContainText(/MARC advisories|No active MARC alerts|Alert information/);
  const hrefs = await page
    .locator("main a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  // Nothing from feed content may become a non-HTTP link.
  expect(hrefs.filter((href) => /^(?!https?:|\/|#)/.test(href) && href !== "")).toEqual([]);
});

test("an explicit refresh replaces the content without losing the screen", async ({ page }) => {
  await settled(page, "/trains");
  const rows = page.getByRole("list", { name: "Scheduled trains" }).locator("> li");
  const before = await rows.count();
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect
    .poll(async () => rows.count(), { timeout: 20_000 })
    .toBe(before);
  await expect(page.getByText(/^Received /)).toBeVisible();
});

test("every screen reports honestly when the backend is unreachable", async ({ page }) => {
  await page.route("**/api/backend/**", (route) => route.abort());
  for (const path of ["/", "/trains", "/alerts"]) {
    await settled(page, path);
    await expect(page.getByText("Couldn't reach the service")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    // An unreachable service never reads as good news.
    await expect(page.locator("main")).not.toContainText("No active MARC alerts reported");
    await expect(page.locator("main")).not.toContainText("On time");
  }
});
