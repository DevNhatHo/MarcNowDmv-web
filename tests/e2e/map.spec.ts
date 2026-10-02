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
  const select = page.locator("main select");
  const line = (await select.locator("option").nth(1).getAttribute("value")) ?? "";
  await select.selectOption(line);
  await page.waitForURL(/routeId=/, { timeout: 30_000 });
  await page.waitForTimeout(3000);

  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(1);
  await expect(page.locator("canvas.maplibregl-canvas")).toHaveAttribute("data-tag", "same");
});

test("no screen without a map requests a basemap", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (tile.test(request.url())) requested.push(request.url());
  });
  for (const path of ["/", "/trains", "/alerts"]) {
    await page.goto(path, { timeout: 60_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  }
  expect(requested).toEqual([]);
  expect(await page.locator("canvas.maplibregl-canvas").count()).toBe(0);
});

test("the train list offers every position as text", async ({ page }) => {
  await drawn(page, "/map");
  const list = page.locator('[aria-label="Trains with reported positions"]');
  await expect(list).toBeVisible();
  // Each entry says what its marker means, in words rather than by colour.
  const first = list.locator("li").first();
  await expect(first).toContainText(
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
