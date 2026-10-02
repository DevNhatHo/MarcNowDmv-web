import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The accessibility floor for every screen, at both required viewports.
 *
 * Axe catches only part of what matters, so these also assert the things it does not: that
 * every standalone control meets the target size, that every keyboard stop shows a focus
 * ring, that every list in the main region is named, and that no page scrolls sideways.
 */

const routes = [
  ["Pulse", "/"],
  ["Trains", "/trains"],
  ["Map", "/map"],
  ["Alerts", "/alerts"],
] as const;

async function openDetail(page: Page) {
  await page.goto("/trains");
  await page.locator("main ul li a").first().waitFor({ timeout: 20_000 });
  await page.locator("main ul li a").first().click();
  await page.waitForURL(/\/trains\/.+/);
  await page.waitForTimeout(1500);
}

async function settled(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

/**
 * Standalone controls only. A link inside a sentence keeps its natural line height, which
 * is what WCAG's inline exception allows and what keeps body text readable.
 */
async function undersizedControls(page: Page) {
  return page.evaluate(() => {
    const controls = [
      ...document.querySelectorAll(
        "a[href],button:not([disabled]),input,select,textarea,summary",
      ),
    ];
    const insideSentence = (element: Element) => {
      const paragraph = element.closest("p");
      return (
        paragraph !== null &&
        (paragraph.textContent ?? "").trim() !== (element.textContent ?? "").trim()
      );
    };
    return controls
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.height > 0 && box.height < 44 && !insideSentence(element);
      })
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}:${(element.textContent ?? "").trim().slice(0, 30)}`,
      );
  });
}

for (const [name, path] of routes) {
  test(`${name} meets the accessibility floor`, async ({ page }) => {
    await settled(page, path);
    await expectNoAxeViolations(page);
    expect(await undersizedControls(page)).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Every list in the main region is named, so they can be told apart.
    const unnamed = await page.evaluate(
      () =>
        [...document.querySelectorAll("main ul")].filter(
          (list) => list.getAttribute("aria-label") === null,
        ).length,
    );
    expect(unnamed).toBe(0);
    // Exactly one first-level heading, naming what the page answers.
    expect(await page.getByRole("heading", { level: 1 }).count()).toBe(1);
  });
}

test("train detail meets the accessibility floor", async ({ page }) => {
  await openDetail(page);
  await expectNoAxeViolations(page);
  expect(await undersizedControls(page)).toEqual([]);
  expect(await page.getByRole("heading", { level: 1 }).count()).toBe(1);
});

test("every keyboard stop shows a focus ring", async ({ page }) => {
  await settled(page, "/alerts");
  await page.evaluate(() => document.body.focus());
  const missing: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (active === null || active === document.body) return null;
      const style = getComputedStyle(active);
      return {
        label: `${active.tagName.toLowerCase()}:${(active.textContent ?? "").trim().slice(0, 24)}`,
        ring: style.outlineWidth !== "0px" && style.outlineStyle !== "none",
      };
    });
    if (stop !== null && !stop.ring) missing.push(stop.label);
  }
  expect(missing).toEqual([]);
});

test("reduced motion disables the motion token", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await settled(page, "/");
  const duration = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--motion-duration").trim(),
  );
  expect(duration).toBe("0s");
  await context.close();
});

test("a failed refresh is announced politely and keeps its content", async ({ page }) => {
  await settled(page, "/trains");
  await page.locator("main ul li a").first().waitFor({ timeout: 20_000 });
  const before = await page.locator("main ul li a").count();
  await page.route("**/api/backend/api/v1/trains?*", (route) => route.abort());
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.waitForTimeout(2500);
  // The content stays; only its framing changes.
  expect(await page.locator("main ul li a").count()).toBe(before);
  const announcement = page.locator('[aria-live="polite"]');
  await expect(announcement).toContainText("Couldn't refresh");
  await expect(page.getByText(/Couldn’t refresh/)).toBeVisible();
});
