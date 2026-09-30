import { expect, test } from "@playwright/test";

/**
 * Rendered checks for the shell, run at both required viewports.
 *
 * These assert behaviour a jsdom test cannot: real navigation, focus order, computed tap
 * target size and the absence of horizontal page scroll at 360px.
 */

const destinations = [
  { label: "Pulse", path: "/", heading: "MARC Pulse", title: "MARC Pulse · MARC Now DMV" },
  { label: "Trains", path: "/trains", heading: "Trains", title: "Trains · MARC Now DMV" },
  { label: "Alerts", path: "/alerts", heading: "Alerts", title: "Alerts · MARC Now DMV" },
];

test("navigates to every destination and marks the current one", async ({ page }) => {
  await page.goto("/");
  for (const { label, path, heading, title } of destinations) {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(title);
    const current = page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
      name: label,
    });
    await expect(current).toHaveAttribute("aria-current", "page");
  }
});

test("reaches main content with the keyboard before the navigation", async ({ page }) => {
  await page.goto("/trains");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  // The link is offscreen until focused, so a sighted keyboard user can see it.
  await expect(skip).toBeInViewport();
  // Measured while focused: the ring is what makes the offscreen link discoverable.
  const outline = await skip.evaluate((node) => getComputedStyle(node).outlineWidth);
  expect(outline).toBe("3px");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});

test("has no horizontal page scroll and keeps navigation targets tall enough", async ({
  page,
}) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  for (const { label } of destinations) {
    const box = await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: label })
      .boundingBox();
    // The design plan asks for a 44px minimum target.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("shows the independence notice verbatim, once, on every destination", async ({
  page,
}) => {
  const notice =
    "MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.";
  for (const { path } of destinations) {
    await page.goto(path);
    const matches = page.getByText(notice, { exact: true });
    await expect(matches).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toContainText(notice);
  }
});

test("survives a long unbroken identifier without overflowing", async ({ page }) => {
  await page.goto("/trains");
  // SYNTHETIC stress content, not application data: a base64-like run with no break
  // opportunity, of the kind an opaque train identifier produces.
  await page.evaluate(() => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "NzUwZmNmYjYtZGQwZS1jNWVlLTcxZTEtNWNkYWVhYTU4ZDE4fDIwMjYwOTI4";
    document.querySelector("main")?.append(paragraph);
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("reflows at 200% zoom without horizontal page scroll", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
