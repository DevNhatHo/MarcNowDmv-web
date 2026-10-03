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
  // A row opens the quick look; the preview carries the link on to the full page.
  await page.locator("main ul li a").first().click();
  await page.waitForURL(/preview=/, { timeout: 30_000 });
  await page
    .getByRole("dialog", { name: /Quick look at/ })
    .getByRole("link", { name: /View train details/ })
    .click();
  await page.waitForURL(/\/trains\/.+/, { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function settled(page: Page, path: string) {
  await page.goto(path);
  // Not networkidle: a vector map streams tiles continuously, so the network never goes
  // idle on /map. Waiting for the document plus a settle window works for every screen.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

/**
 * Standalone controls only. A link inside a run of text keeps its natural line height, which
 * is what WCAG's inline exception allows and what keeps body text readable.
 *
 * "A run of text" is the container's own text around the control, not the `<p>` tag: a map's
 * attribution is a credit line of links separated by punctuation, which is prose by every
 * measure except its markup. A container holding only controls has no text of its own and is
 * still checked.
 */
async function undersizedControls(page: Page) {
  return page.evaluate(() => {
    const controls = [
      ...document.querySelectorAll(
        "a[href],button:not([disabled]),input,select,textarea,summary",
      ),
    ];
    const insideSentence = (element: Element) => {
      const container = element.closest("p") ?? element.parentElement;
      if (container === null) return false;
      const ownText = [...container.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
      return (
        ownText !== "" &&
        (container.textContent ?? "").trim() !== (element.textContent ?? "").trim()
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

test("the focused map meets the accessibility floor", async ({ page }) => {
  // Focus adds a panel, a toggle and two links to the map, none of which the plain /map
  // check above can see.
  await settled(page, "/map");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  if ((await first.count()) === 0) test.skip(true, "no drawn trains right now");
  await first.click();
  await page.waitForURL(/trainId=/, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  await expectNoAxeViolations(page);
  expect(await undersizedControls(page)).toEqual([]);
  expect(await page.getByRole("heading", { level: 1 }).count()).toBe(1);
});

test("focus can be entered and left from the keyboard alone", async ({ page }) => {
  await settled(page, "/map");
  const first = page.locator('[aria-label="Trains with reported positions"] li a').first();
  if ((await first.count()) === 0) test.skip(true, "no drawn trains right now");
  await first.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/trainId=/, { timeout: 30_000 });
  await expect(page.getByRole("region", { name: /Focused train/ })).toBeVisible();

  const exit = page.getByRole("link", { name: "Exit focus" });
  await exit.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.search.includes("trainId"), { timeout: 30_000 });
  await expect(page.getByRole("region", { name: /Focused train/ })).toHaveCount(0);
});

test("the quick look meets the accessibility floor", async ({ page }) => {
  // A modal dialog adds a focus trap, a backdrop and an Escape route that the plain list
  // check cannot see.
  await page.goto("/trains");
  await page.locator("main ul li a").first().waitFor({ timeout: 20_000 });
  await page.locator("main ul li a").first().click();
  await page.waitForURL(/preview=/, { timeout: 30_000 });
  await page.waitForTimeout(2000);
  await expectNoAxeViolations(page);
  expect(await undersizedControls(page)).toEqual([]);

  // Escape dismisses it and the URL stops claiming a preview is open.
  await page.keyboard.press("Escape");
  await page.waitForURL((url) => !url.search.includes("preview="), { timeout: 30_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

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
