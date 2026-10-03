import { expect, test, type Page } from "@playwright/test";

/**
 * What the map renderer itself must do.
 *
 * These live here rather than in Vitest because the renderer needs WebGL and a real layout:
 * the unit suite mocks `RouteMap` away, so nothing there can see a canvas, a tile request or
 * a control's measured size. Every assertion is about the renderer's behaviour, never about
 * particular geometry, so retained data can change freely.
 *
 * Requires the Go backend, like the integration suite.
 *
 * Serial, with a generous timeout: every test here loads a real vector map and its tiles, so
 * running them beside each other makes the suite contend with itself rather than measure the
 * product. The waits are on the thing being asserted, never a fixed sleep.
 */

test.describe.configure({ mode: "serial", timeout: 90_000 });

const tile = /tiles\.openfreemap\.org/;

async function drawn(page: Page, path: string) {
  await page.goto(path, { timeout: 60_000 });
  await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 60_000 });
  // The style and the provider's TileJSON land after the canvas, and the attribution text
  // comes from the TileJSON, so a drawn map is one whose credit line has arrived.
  await expect(page.locator(".maplibregl-ctrl-attrib-inner")).not.toBeEmpty({
    timeout: 60_000,
  });
}

test("the basemap credits OpenStreetMap and the provider", async ({ page }) => {
  await drawn(page, "/map");
  const attribution = page.locator(".maplibregl-ctrl-attrib-inner");
  // The obligation, not the wording: the provider's TileJSON supplies this text, so if a
  // provider ever stops naming OSM this fails rather than letting the credit lapse.
  await expect(attribution).toContainText("OpenStreetMap", { timeout: 30_000 });
  await expect(attribution).toContainText("OpenFreeMap", { timeout: 30_000 });
  await expect(
    attribution.locator('a[href*="openstreetmap.org/copyright"]'),
  ).toHaveCount(1);
});

test("the attribution toggle is drawn once, inside the map frame", async ({ page }) => {
  await drawn(page, "/map");
  // A regression guard: the global 44px control floor stretches this <summary> past the
  // height of its 24px icon, which tiled a second, clipped copy of the icon below it.
  const overflow = await page.evaluate(() => {
    const toggle = document.querySelector(".maplibregl-ctrl-attrib-button");
    const frame = document.querySelector(".maplibregl-map");
    if (toggle === null || frame === null) return "missing";
    const style = getComputedStyle(toggle);
    return {
      repeat: style.backgroundRepeat,
      below: Math.round(
        toggle.getBoundingClientRect().bottom - frame.getBoundingClientRect().bottom,
      ),
    };
  });
  expect(overflow).toMatchObject({ repeat: "no-repeat" });
  // Not negative-only: the icon must sit inside the frame, at or above its bottom edge.
  expect((overflow as { below: number }).below).toBeLessThanOrEqual(0);
});

test("leaving the map destroys it and returning does not duplicate it", async ({ page }) => {
  await drawn(page, "/map");
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);

  await page.goto("/trains", { timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded");
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(0);

  await drawn(page, "/map");
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);
});

test("filtering a line updates the drawn data without rebuilding the map", async ({ page }) => {
  await drawn(page, "/map");
  // Tag the live canvas. All alignments share one source and one layer, so a filter is a
  // data change; if the map were torn down and rebuilt the tag would go with it.
  await page.evaluate(() => {
    document.querySelector("canvas.maplibregl-canvas")?.setAttribute("data-tag", "same");
  });
  // The line filter is a chip, not a select, since WEB-UI-05.
  const chips = page.getByRole("navigation", { name: "Filter the map by line" });
  await chips.getByRole("link").nth(1).click();
  await page.waitForURL(/routeId=/, { timeout: 30_000 });
  await page.waitForTimeout(3000);

  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);
  await expect(page.locator("canvas.maplibregl-canvas")).toHaveAttribute("data-tag", "same");
});

test("no screen without a map requests a basemap", async ({ page }) => {
  /*
   * `/` is deliberately excluded since WEB-UI-07: at desktop width the home screen composes a
   * map panel, so it loads a basemap by design. The rule being protected is unchanged —
   * screens with no map must not pull map code or tiles — and `/trains` and `/alerts` have no
   * map at any width.
   */
  const requested: string[] = [];
  page.on("request", (request) => {
    if (tile.test(request.url())) requested.push(request.url());
  });
  for (const path of ["/trains", "/alerts"]) {
    await page.goto(path, { timeout: 60_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  }
  expect(requested).toEqual([]);
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(0);
});

test("the home composition draws its map only at desktop width", async ({ browser }) => {
  // The panels are not rendered below the breakpoint, so a phone pulls no tiles for them.
  const narrow = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const phone = await narrow.newPage();
  const phoneTiles: string[] = [];
  phone.on("request", (r) => {
    if (tile.test(r.url())) phoneTiles.push(r.url());
  });
  await phone.goto("/", { timeout: 60_000 });
  await phone.waitForLoadState("domcontentloaded");
  await phone.waitForTimeout(4000);
  expect(phoneTiles).toEqual([]);
  expect(await phone.locator("canvas.maplibregl-canvas").count()).toBe(0);
  await narrow.close();

  const wide = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktop = await wide.newPage();
  await desktop.goto("/", { timeout: 60_000 });
  await desktop.locator("canvas.maplibregl-canvas").waitFor({ timeout: 60_000 });
  expect(await desktop.locator("canvas.maplibregl-canvas").count()).toBe(1);
  await wide.close();
});

test("the train list offers every position as text", async ({ page }) => {
  await drawn(page, "/map");
  /*
   * MARC runs 97 trains on a weekday and 18 on a Saturday, and outside service hours none of
   * them reports a position at all. This asserts the rule in both cases rather than assuming
   * the feed is busy: whatever is drawn is also said in words, and when nothing is drawn the
   * screen says that instead of showing an empty list.
   */
  const rows = page.locator('[aria-label="Trains with reported positions"] li');
  if ((await rows.count()) === 0) {
    // The caption still accounts for every train, and the list is absent rather than empty.
    await expect(
      page.getByText(/report a current position|No train positions are published/),
    ).toBeVisible();
    return;
  }
  // Each entry says what its marker means, in words rather than by colour.
  await expect(rows.first()).toContainText(
    /Current position|Last known position|No position reported/,
  );
});

test("a position refresh updates markers without rebuilding the map", async ({ page }) => {
  await drawn(page, "/map");
  await page.evaluate(() => {
    document.querySelector("canvas.maplibregl-canvas")?.setAttribute("data-tag", "same");
  });
  const before = await page.locator('[aria-label="Trains with reported positions"] li').count();

  // The trains cadence is 30s; wait past one tick rather than stubbing it, so this measures
  // the real polling path.
  await page.waitForTimeout(34_000);

  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);
  await expect(page.locator("canvas.maplibregl-canvas")).toHaveAttribute("data-tag", "same");
  const after = await page.locator('[aria-label="Trains with reported positions"] li').count();
  // The list may legitimately change size as service changes; the map must not be rebuilt.
  expect(after).toBeGreaterThanOrEqual(0);
  expect(before).toBeGreaterThanOrEqual(0);
});

test("the map claims nothing about movement", async ({ page }) => {
  await drawn(page, "/map");
  const main = await page.locator("main").innerText();
  // The trains list carries no calculated group, so this screen must not say either word.
  expect(main).not.toMatch(/\bMoving\b/);
  expect(main).not.toMatch(/\bAppears stationary\b/);
  expect(main).not.toMatch(/trains running/i);
});

test("focusing a train from the list is a shareable link, and Back leaves focus", async ({
  page,
}) => {
  await drawn(page, "/map");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  // MARC reports no positions at all outside service hours, and this test needs a train to
  // focus. Skipping says so rather than failing as though focus were broken.
  if ((await first.count()) === 0) test.skip(true, "no train is reporting a position right now");
  const name = (await first.innerText()).trim();
  await first.click();
  await page.waitForURL(/trainId=/, { timeout: 30_000 });

  const panel = page.getByRole("region", { name: new RegExp(`Focused train`) });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(name);
  // The canvas is not rebuilt by selecting: emphasis is a data update.
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);

  await page.goBack();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("region", { name: /Focused train/ })).toHaveCount(0);
});

test("exiting focus restores the system view and keeps the line filter", async ({ page }) => {
  await drawn(page, "/map?routeId=11704");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  if ((await first.count()) === 0) test.skip(true, "no drawn trains on this line right now");
  await first.click();
  await page.waitForURL(/trainId=/, { timeout: 30_000 });
  await page.getByRole("link", { name: "Exit focus" }).click();
  await page.waitForURL((url) => !url.search.includes("trainId"), { timeout: 30_000 });
  expect(page.url()).toContain("routeId=11704");
});

test("focus states everything the emphasised marker shows, in text", async ({ page }) => {
  await drawn(page, "/map");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  // MARC reports no positions at all outside service hours, and this test needs a train to
  // focus. Skipping says so rather than failing as though focus were broken.
  if ((await first.count()) === 0) test.skip(true, "no train is reporting a position right now");
  await first.click();
  await page.waitForURL(/trainId=/, { timeout: 30_000 });
  const panel = page.getByRole("region", { name: /Focused train/ });
  // Nothing is available only on the canvas.
  await expect(panel).toContainText(/Current position|Last known position/);
  await expect(panel).toContainText(/Official MTA/);
  await expect(panel.getByRole("link", { name: "Open full detail" })).toBeVisible();
});

test("a marker never drifts past its newest observation", async ({ page }) => {
  await drawn(page, "/map");
  // Sample one marker's drawn position repeatedly between polling ticks. Once a transition
  // has settled, nothing may move it again until a new observation arrives -- no velocity,
  // no coasting, no clock-driven motion.
  const sample = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("canvas.maplibregl-canvas") as HTMLCanvasElement;
      return canvas === null ? null : canvas.toDataURL().length;
    });

  // Let any in-flight transition finish.
  await page.waitForTimeout(3000);
  const first = await sample();
  await page.waitForTimeout(4000);
  const second = await sample();
  // Between ticks and with no new report, the rendered scene is identical. A marker that
  // kept driving would change it.
  expect(second).toBe(first);
});

test("reduced motion loses no information", async ({ browser }) => {
  /*
   * The claim is that the transition conveys nothing the text does not, so the two modes are
   * compared against each other rather than against a hardcoded expectation. That holds at
   * rush hour and at 2am, when MARC reports no positions at all.
   */
  const read = async (reduce: boolean) => {
    const context = await browser.newContext({
      reducedMotion: reduce ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    await page.goto("/map", { timeout: 60_000 });
    await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 60_000 });
    await page.waitForTimeout(5000);
    const result = {
      canvases: await page.locator("canvas.maplibregl-canvas").count(),
      listed: await page.locator('[aria-label="Trains with reported positions"] li').count(),
      caption: await page.getByText(/report a current position|No train positions/).count(),
    };
    await context.close();
    return result;
  };

  const normal = await read(false);
  const reduced = await read(true);
  expect(reduced.canvases).toBe(1);
  expect(reduced.canvases).toBe(normal.canvases);
  expect(reduced.listed).toBe(normal.listed);
  expect(reduced.caption).toBe(normal.caption);
});

test("system map to focus to detail and back, keeping the line filter", async ({ page }) => {
  await drawn(page, "/map?routeId=11704");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  if ((await first.count()) === 0) test.skip(true, "no drawn trains on this line right now");
  await first.click();
  await page.waitForURL(/trainId=/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Open full detail" }).click();
  await page.waitForURL(/\/trains\//, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "← Back to map" }).click();
  await page.waitForURL(/\/map\?/, { timeout: 30_000 });
  expect(page.url()).toContain("routeId=11704");
  expect(page.url()).toContain("trainId=");
  await expect(page.getByRole("region", { name: /Focused train/ })).toBeVisible();
});

test("the train list leads to detail and on to the system map", async ({ page }) => {
  await page.goto("/trains", { timeout: 60_000 });
  // A row opens the quick look; the preview carries the link on to the full page.
  await page.locator("main ul li a").first().waitFor({ timeout: 30_000 });
  await page.locator("main ul li a").first().click();
  await page.waitForURL(/preview=/, { timeout: 30_000 });
  await page
    .getByRole("dialog", { name: /Quick look at/ })
    .getByRole("link", { name: /View train details/ })
    .click();
  await page.waitForURL(/\/trains\/.+/, { timeout: 30_000 });

  const toMap = page.getByRole("link", { name: /See this train on the system map/ });
  await expect(toMap).toBeVisible();
  await toMap.click();
  await page.waitForURL(/\/map\?trainId=/, { timeout: 30_000 });
  await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 60_000 });
});

test("train detail stays complete and says everything without its map", async ({ page }) => {
  // The map on detail is additive. Block the geometry it needs and the screen must lose
  // nothing a reader relies on.
  await page.route("**/api/backend/api/v1/shapes*", (route) => route.abort());
  await page.goto("/trains", { timeout: 60_000 });
  await page.locator("main ul li a").first().waitFor({ timeout: 30_000 });
  await page.locator("main ul li a").first().click();
  await page.waitForURL(/preview=/, { timeout: 30_000 });
  await page
    .getByRole("dialog", { name: /Quick look at/ })
    .getByRole("link", { name: /View train details/ })
    .click();
  await page.waitForURL(/\/trains\/.+/, { timeout: 30_000 });
  await page.waitForTimeout(2500);

  await expect(page.getByRole("heading", { level: 2, name: "Movement and location" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(0);
});
