import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlertsScreen from "../components/AlertsScreen";
import {
  causeLabel,
  effectLabel,
  periodLabel,
  preferredText,
  safeLink,
  selectorLabel,
} from "../lib/presentation/alerts";
import type { AlertSelector } from "../lib/types/alerts";
import { capturedBody, mutableBody } from "./fixtures/captures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/alerts",
}));

function serve(alerts: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = /\/api\/v1\/routes/.test(url)
        ? capturedBody("routes")
        : /\/api\/v1\/stops/.test(url)
          ? capturedBody("stops")
          : alerts;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

/** Marks the alerts feed healthy, so an empty list may make a no-alerts claim. */
function withFeedState(body: Record<string, unknown>, state: string) {
  const health = body.sourceHealth as Record<string, unknown>[];
  for (const source of health) {
    if (source.source === "MTA_SERVICE_ALERTS") source.state = state;
  }
  return body;
}

const names = { routes: new Map<string, string>(), stops: new Map<string, string>() };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("translations and sanitization", () => {
  it("prefers English, then the first usable translation", () => {
    expect(
      preferredText({
        translation: [
          { text: "Hola", language: "es" },
          { text: "Hello", language: "en" },
        ],
      }),
    ).toBe("Hello");
    // No English: the first nonempty alternative is used rather than nothing.
    expect(
      preferredText({ translation: [{ text: "Hola", language: "es" }] }),
    ).toBe("Hola");
    // A language-less translation is still usable content.
    expect(preferredText({ translation: [{ text: "Notice", language: null }] })).toBe(
      "Notice",
    );
    expect(preferredText(null)).toBeNull();
    expect(preferredText({ translation: [] })).toBeNull();
    // Blank text is absence, not content.
    expect(preferredText({ translation: [{ text: "   ", language: "en" }] })).toBeNull();
  });

  it("permits only http and https links", () => {
    expect(safeLink({ translation: [{ text: "https://mta.maryland.gov/x", language: null }] }))
      .toBe("https://mta.maryland.gov/x");
    expect(safeLink({ translation: [{ text: "http://example.org/", language: null }] }))
      .toBe("http://example.org/");
    for (const unsafe of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "not a url",
    ]) {
      expect(safeLink({ translation: [{ text: unsafe, language: null }] })).toBeNull();
    }
    expect(safeLink(null)).toBeNull();
  });

  it("labels documented effect and cause numbers and refuses to guess others", () => {
    expect(effectLabel(1)).toBe("No service");
    expect(effectLabel(7)).toBe("Other effect");
    expect(causeLabel(8)).toBe("Weather");
    // An undocumented number is reported as not described, never invented.
    expect(effectLabel(99)).toBe("Effect not described");
    expect(causeLabel(99)).toBe("Cause not described");
    expect(effectLabel(null)).toBeNull();
    expect(causeLabel(null)).toBeNull();
  });

  it("reports selector scope without overstating train relevance", () => {
    const empty: AlertSelector = {
      agencyId: null, routeId: null, routeType: null, stopId: null,
      directionId: null, trip: null,
    };
    expect(selectorLabel({ ...empty, stopId: "11985" }, names)).toBe("Stop 11985");
    expect(selectorLabel({ ...empty, routeId: "11007" }, names)).toBe("Line 11007");
    expect(selectorLabel({ ...empty, agencyId: "MARC" }, names)).toBe("All MARC services");
    expect(selectorLabel(empty, names)).toBe("Scope not described");
    // A resolved name is used when the catalog has one.
    const known = { routes: new Map([["11007", "PENN - WASHINGTON"]]), stops: new Map() };
    expect(selectorLabel({ ...empty, routeId: "11007" }, known)).toBe("PENN - WASHINGTON");
  });

  it("states an open-ended active period as open", () => {
    const at = (iso: string) => iso.slice(11, 16);
    expect(periodLabel({ start: "2026-09-30T12:00:00Z", end: null }, at)).toBe(
      "From 12:00, no end given",
    );
    expect(periodLabel({ start: null, end: "2026-09-30T18:00:00Z" }, at)).toBe("Until 18:00");
    expect(periodLabel({ start: null, end: null }, at)).toBe("No active period given");
    expect(periodLabel({ start: "2026-09-30T12:00:00Z", end: "2026-09-30T18:00:00Z" }, at))
      .toBe("12:00 to 18:00");
  });
});

describe("alerts screen", () => {
  it("renders the four captured advisories", async () => {
    serve(capturedBody("alerts"));
    render(<AlertsScreen />);
    const list = await screen.findByRole("list", { name: "MARC advisories" });
    // Direct children only: each card carries its own nested "Applies to" list.
    expect(list.querySelectorAll(":scope > li")).toHaveLength(4);
    // The real capture already contains repeated titles, which stay separate advisories.
    expect(screen.getAllByText(/Odenton Station update/).length).toBeGreaterThan(1);
    expect(screen.getByText(/All 4 retained MARC advisories are shown/)).toBeVisible();
  });

  it("keeps advisories distinct when their titles match", async () => {
    const body = mutableBody("alerts");
    const rows = body.data as Record<string, unknown>[];
    rows[1].headerText = rows[0].headerText;
    serve(body);
    render(<AlertsScreen />);
    const list = await screen.findByRole("list", { name: "MARC advisories" });
    const title = (rows[0].headerText as { translation: { text: string }[] }).translation[0].text;
    // Two advisories share a title; both remain present as separate items.
    expect(within(list).getAllByText(title)).toHaveLength(2);
    expect(list.querySelectorAll(":scope > li")).toHaveLength(4);
  });

  it("renders feed text as plain text, never as markup", async () => {
    const body = mutableBody("alerts");
    const rows = body.data as Record<string, unknown>[];
    rows[0].descriptionText = {
      translation: [{ text: "<img src=x onerror=alert(1)> and <b>bold</b>", language: "en" }],
    };
    serve(body);
    const { container } = render(<AlertsScreen />);
    await screen.findByRole("list", { name: "MARC advisories" });
    // The markup is visible as characters and produced no elements.
    expect(screen.getByText(/<img src=x onerror=alert\(1\)> and <b>bold<\/b>/)).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  it("does not render an unsafe link as a link", async () => {
    const body = mutableBody("alerts");
    const rows = body.data as Record<string, unknown>[];
    rows[0].url = { translation: [{ text: "javascript:alert(1)", language: null }] };
    serve(body);
    const { container } = render(<AlertsScreen />);
    await screen.findByRole("list", { name: "MARC advisories" });
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs.some((href) => href?.startsWith("javascript:"))).toBe(false);
  });

  it("claims no active alerts only when the feed is healthy", async () => {
    const empty = mutableBody("alerts");
    empty.data = [];
    empty.nextAfter = null;
    serve(withFeedState(structuredClone(empty), "HEALTHY"));
    const healthy = render(<AlertsScreen />);
    expect(await screen.findByText("No active MARC alerts reported")).toBeVisible();
    healthy.unmount();

    for (const state of ["DEGRADED", "STALE", "UNAVAILABLE"]) {
      serve(withFeedState(structuredClone(empty), state));
      const view = render(<AlertsScreen />);
      expect(await screen.findByText("Alert information is unavailable")).toBeVisible();
      // Absence of readable advisories is never presented as absence of disruption.
      expect(
        screen.getByText(/not evidence that MARC service is running without disruption/),
      ).toBeVisible();
      expect(screen.queryByText("No active MARC alerts reported")).toBeNull();
      view.unmount();
    }
  });

  it("keeps a degraded feed's advisories visible and labelled, not offline", async () => {
    serve(withFeedState(mutableBody("alerts"), "DEGRADED"));
    render(<AlertsScreen />);
    expect(await screen.findByText(/Alert source degraded/)).toBeVisible();
    // The content is still shown; degraded is not the same as unavailable.
    expect(
      screen.getByRole("list", { name: "MARC advisories" }).querySelectorAll(":scope > li"),
    ).toHaveLength(4);
  });

  it("frames a stale feed as last received", async () => {
    serve(withFeedState(mutableBody("alerts"), "STALE"));
    render(<AlertsScreen />);
    expect(await screen.findByText(/Alert information is out of date/)).toBeVisible();
    expect(screen.getByText(/what was last received/)).toBeVisible();
  });

  it("says an advisory without text is still an advisory", async () => {
    const body = mutableBody("alerts");
    body.data = [
      {
        id: "1", observationId: "1", provenance: "OFFICIAL_REALTIME",
        cause: null, effect: null, headerText: null, descriptionText: null,
        url: null, informedEntity: [], activePeriods: [],
      },
    ];
    serve(body);
    render(<AlertsScreen />);
    expect(await screen.findByText("Advisory published without a title")).toBeVisible();
    expect(screen.getByText(/No description was published/)).toBeVisible();
    expect(screen.getByText(/did not say what this advisory applies to/)).toBeVisible();
  });

  it("states the scope caveat once for the whole list, not per advisory", async () => {
    serve(capturedBody("alerts"));
    render(<AlertsScreen />);
    await screen.findByRole("list", { name: "MARC advisories" });
    expect(
      screen.getAllByText(/does not say which individual trains are affected/),
    ).toHaveLength(1);
  });

  it("continues with the snapshot and version the cursor came from", async () => {
    const first = mutableBody("alerts");
    first.nextAfter = "9";
    const second = mutableBody("alerts");
    second.nextAfter = null;
    const calls: string[] = [];
    let alertCall = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const body = /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
          : /\/api\/v1\/stops/.test(url)
            ? capturedBody("stops")
            : alertCall++ === 0
              ? first
              : second;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const { getByRole } = render(<AlertsScreen />);
    const button = await screen.findByRole("button", { name: "Load more advisories" });
    button.click();
    await screen.findByText(/All 8 retained MARC advisories are shown/);
    const continuation = calls.find((url) => url.includes("after="));
    expect(continuation).toContain("snapshot=3");
    expect(continuation).toContain("version=1");
    expect(getByRole("list", { name: "MARC advisories" })).toBeInTheDocument();
  });

  it("explains a failure and offers a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: "realtime_unavailable", message: "no" } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<AlertsScreen />);
    expect(await screen.findByText("Realtime information is unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
