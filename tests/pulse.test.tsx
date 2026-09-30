import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PulseScreen from "../components/PulseScreen";
import {
  describeCoverage,
  describeLine,
  summarizeLines,
} from "../lib/presentation/pulse";
import type { Train } from "../lib/types/trains";
import { capturedBody, mutableBody } from "./fixtures/captures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

function serve(trains: unknown, alerts: unknown = capturedBody("alerts")) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = /\/api\/v1\/routes/.test(url)
        ? capturedBody("routes")
        : /\/api\/v1\/alerts/.test(url)
          ? alerts
          : trains;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

function train(routeId: string, status: string): Train {
  return {
    id: `${routeId}-${status}-${Math.random()}`,
    scheduleVersion: "1", tripId: "T", routeId, serviceDate: "20260930", status,
    scheduled: { provenance: "SCHEDULED", start: "2026-09-30T10:00:00Z", end: null },
    official: { source: "MARC_TRIP_UPDATES", observationId: null, sourceTimestamp: null,
      receivedAt: null, freshness: "UNAVAILABLE", conflict: false,
      provenance: "OFFICIAL_REALTIME", status, delaySeconds: null, scheduleRelationship: null },
    position: { source: "MARC_VEHICLE_POSITIONS", observationId: null, sourceTimestamp: null,
      receivedAt: null, freshness: "UNAVAILABLE", conflict: false,
      provenance: "OFFICIAL_REALTIME", latitude: null, longitude: null,
      speedMetersPerSecond: null, bearingDegrees: null, vehicleId: null },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("line summaries", () => {
  it("counts only what the operator actually reported", () => {
    const [line] = summarizeLines(
      [train("A", "UNKNOWN"), train("A", "STALE"), train("A", "ON_TIME"), train("A", "DELAYED")],
      new Map([["A", "Line A"]]),
    );
    expect(line).toMatchObject({ scheduled: 4, reported: 2, disrupted: 1 });
  });

  it("never turns absent evidence into a healthy line", () => {
    const [line] = summarizeLines([train("A", "UNKNOWN"), train("A", "STALE")], new Map());
    expect(line.reported).toBe(0);
    const text = describeLine(line);
    expect(text).toMatch(/not currently reporting status for any of them/);
    // The words that would be a lie here must never appear.
    expect(text).not.toMatch(/on time|normal|good|running well/i);
  });

  it("describes a partly reported line with its coverage, not a bare count", () => {
    const [line] = summarizeLines(
      [train("A", "ON_TIME"), train("A", "UNKNOWN"), train("A", "DELAYED")],
      new Map(),
    );
    expect(describeLine(line)).toBe(
      "2 of 3 scheduled trains have a current report, and 1 of those reports something other than on time.",
    );
  });

  it("says when reports exist and none shows a problem, without claiming the line is fine", () => {
    const [line] = summarizeLines([train("A", "ON_TIME"), train("A", "UNKNOWN")], new Map());
    expect(describeLine(line)).toBe(
      "1 of 2 scheduled trains have a current report, and none of those reports a problem.",
    );
  });

  it("states coverage and says when the view is partial", () => {
    expect(describeCoverage(96, true, "Wed, 30 Sept 2026")).toBe(
      "Based on 96 scheduled trains for Wed, 30 Sept 2026, the whole service date.",
    );
    expect(describeCoverage(50, false, "Wed, 30 Sept 2026")).toMatch(
      /More are scheduled than were loaded, so this is a partial view/,
    );
  });

  it("orders lines by name and falls back to the identifier", () => {
    const lines = summarizeLines(
      [train("B", "UNKNOWN"), train("A", "UNKNOWN")],
      new Map([["B", "Aardvark Line"]]),
    );
    expect(lines.map((l) => l.name ?? l.routeId)).toEqual(["A", "Aardvark Line"]);
  });
});

describe("pulse screen", () => {
  it("links each line to its filtered list for the same service date", async () => {
    serve(capturedBody("trains"));
    render(<PulseScreen />);
    const lines = await screen.findByRole("list", { name: "MARC lines" });
    for (const link of within(lines).getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/trains\?serviceDate=20260929&routeId=/);
    }
  });

  it("states its scope and refuses to claim how many trains are running", async () => {
    serve(capturedBody("trains"));
    render(<PulseScreen />);
    expect(await screen.findByText(/Based on 3 scheduled trains for/)).toBeVisible();
    // The capture has a cursor, so the view is partial and says so.
    expect(screen.getByText(/this is a partial view/)).toBeVisible();
    expect(
      screen.getByText(/do not say how many trains are running now/),
    ).toBeVisible();
  });

  it("reads the list once and never fans out into detail", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const body = /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
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
    await screen.findByRole("list", { name: "MARC lines" });
    // Exactly three reads: trains, routes, alerts. No per-train detail, no page walking.
    expect(calls).toHaveLength(3);
    expect(calls.filter((url) => /\/trains\/[^?]/.test(url))).toHaveLength(0);
    expect(calls.filter((url) => url.includes("after="))).toHaveLength(0);
  });

  it("previews advisories and points at the full list", async () => {
    serve(capturedBody("trains"));
    render(<PulseScreen />);
    const advisories = await screen.findByRole("list", { name: "Recent MARC advisories" });
    expect(within(advisories).getAllByRole("listitem")).toHaveLength(3);
    // Noun and verb agree for a single remaining advisory.
    expect(screen.getByText("1 more retained advisory is not shown here.")).toBeVisible();
    expect(screen.getByRole("link", { name: "See all MARC advisories" })).toHaveAttribute(
      "href",
      "/alerts",
    );
  });

  it("claims no advisories only when the alert feed is healthy", async () => {
    const empty = mutableBody("alerts");
    empty.data = [];
    const healthy = structuredClone(empty);
    for (const source of healthy.sourceHealth as Record<string, unknown>[]) {
      if (source.source === "MTA_SERVICE_ALERTS") source.state = "HEALTHY";
    }
    serve(capturedBody("trains"), healthy);
    const first = render(<PulseScreen />);
    expect(
      await screen.findByText(/reporting no active MARC advisories right now/),
    ).toBeVisible();
    first.unmount();

    serve(capturedBody("trains"), empty);
    render(<PulseScreen />);
    expect(
      await screen.findByText(/not evidence that there are no\s+disruptions/),
    ).toBeVisible();
  });

  it("does not prefix a report phrase with a second verb", async () => {
    serve(capturedBody("trains"));
    const { container } = render(<PulseScreen />);
    await screen.findByRole("list", { name: "MARC lines" });
    // The defect this guards against rendered "Received Reported just now".
    expect(container.textContent).not.toMatch(/Received Reported/);
  });

  it("uses plural wording when more than one advisory is hidden", async () => {
    const alerts = mutableBody("alerts");
    const rows = alerts.data as Record<string, unknown>[];
    alerts.data = [...rows, ...rows.map((r, i) => ({ ...r, id: `x${i}`, observationId: `y${i}` }))];
    serve(capturedBody("trains"), alerts);
    render(<PulseScreen />);
    expect(await screen.findByText("5 more retained advisories are not shown here."))
      .toBeVisible();
  });

  it("says plainly when nothing is scheduled", async () => {
    const page = mutableBody("trains");
    page.data = [];
    page.nextAfter = null;
    serve(page);
    render(<PulseScreen />);
    expect(
      await screen.findByText(/No trains are scheduled for this service date/),
    ).toBeVisible();
  });

  it("explains a failure and offers a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: "no_active_schedule", message: "none" } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<PulseScreen />);
    expect(await screen.findByText("No schedule is loaded")).toBeVisible();
  });
});
