import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PulseScreen from "../components/PulseScreen";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { resetResources } from "../lib/refresh/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("../components/map/RouteMap", () => ({
  default: ({ label }: { label: string }) => <div data-testid="map" aria-label={label} />,
}));

const wide = vi.hoisted(() => ({ value: true }));
vi.mock("../components/useWideViewport", () => ({
  useWideViewport: () => wide.value,
}));

function serve(trains: unknown = capturedBody("trains")) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const body = /\/api\/v1\/routes/.test(url)
        ? capturedBody("routes")
        : /\/api\/v1\/stops/.test(url)
          ? capturedBody("stops")
          : /\/api\/v1\/shapes/.test(url)
            ? capturedBody("shapes")
            : /\/api\/v1\/alerts/.test(url)
              ? capturedBody("alerts")
              : trains;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

const countOf = (calls: string[], pattern: RegExp) =>
  calls.filter((url) => pattern.test(url)).length;

beforeEach(() => {
  wide.value = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetResources();
});

describe("the desktop composition", () => {
  it("places status, map and trains together", async () => {
    serve();
    render(<PulseScreen />);
    await screen.findByTestId("map");
    expect(screen.getByRole("region", { name: "Where the MARC lines run" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Trains relevant now" })).toBeVisible();
    // The dedicated screens are still reachable, not replaced.
    expect(screen.getByRole("link", { name: /Open the full map/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /All \d+ today/ })).toBeVisible();
  });

  it("is not rendered at all below the breakpoint, and costs nothing there", async () => {
    wide.value = false;
    const calls = serve();
    render(<PulseScreen />);
    await screen.findByRole("list", { name: "MARC lines" });
    expect(screen.queryByTestId("map")).toBeNull();
    expect(screen.queryByRole("region", { name: "Trains relevant now" })).toBeNull();
    // No geometry read on a phone: the panels are absent, not hidden.
    expect(countOf(calls, /\/api\/v1\/shapes/)).toBe(0);
    expect(countOf(calls, /\/api\/v1\/stops/)).toBe(0);
  });

  it("reads each resource once, and never per train", async () => {
    const calls = serve();
    render(<PulseScreen />);
    await screen.findByTestId("map");
    await waitFor(() => expect(countOf(calls, /\/api\/v1\/shapes/)).toBe(1));
    // The trains panel adds nothing: it renders the page Pulse already fetched.
    expect(countOf(calls, /\/api\/v1\/trains(\?|$)/)).toBe(1);
    expect(countOf(calls, /\/api\/v1\/alerts/)).toBe(1);
    expect(countOf(calls, /\/api\/v1\/stops/)).toBe(1);
    // The catalog is read once, not once per panel: the map panel takes routes from the
    // screen rather than fetching them again.
    expect(countOf(calls, /\/api\/v1\/routes/)).toBe(1);
    // No detail fan-out of any kind.
    expect(countOf(calls, /\/api\/v1\/trains\/[^?]/)).toBe(0);
  });

  it("keeps one first-level heading across the whole composition", async () => {
    serve();
    render(<PulseScreen />);
    await screen.findByTestId("map");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("says what the trains panel selected, and never calls it running", async () => {
    serve();
    render(<PulseScreen />);
    const panel = await screen.findByRole("region", { name: "Trains relevant now" });
    const text = panel.textContent ?? "";
    expect(text).toMatch(/Scheduled to be running now, or still reporting|Nothing is inside its scheduled window/);
    // What is forbidden is an affirmative count, not the word "running" in a disclaimer.
    expect(text).not.toMatch(/\d+\s+trains?\s+(are|is)\s+running/);
    expect(text).not.toMatch(/currently running/);
  });

  it("explains an empty trains panel rather than showing the first of the day", async () => {
    const body = mutableBody("trains") as { data: { membership: Record<string, boolean> }[] };
    for (const row of body.data) {
      row.membership.scheduledActive = false;
      row.membership.positionFresh = false;
    }
    serve(body);
    render(<PulseScreen />);
    const panel = await screen.findByRole("region", { name: "Trains relevant now" });
    expect(
      within(panel).getByText(/not a statement about whether trains are running/),
    ).toBeVisible();
    expect(within(panel).queryByRole("listitem")).toBeNull();
  });

  it("keeps the rest of the screen when the geometry read fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (/\/api\/v1\/shapes/.test(url)) return new Response("{}", { status: 500 });
        const body = /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
          : /\/api\/v1\/stops/.test(url)
            ? capturedBody("stops")
            : /\/api\/v1\/alerts/.test(url)
              ? capturedBody("alerts")
              : capturedBody("trains");
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    render(<PulseScreen />);
    expect(await screen.findByText(/route geometry could not be read/)).toBeVisible();
    // The status and trains panels are unaffected.
    expect(screen.getByRole("list", { name: "MARC lines" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Trains relevant now" })).toBeVisible();
  });
});
