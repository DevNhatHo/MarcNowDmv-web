import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainDetailScreen from "../components/TrainDetailScreen";
import TrainListScreen from "../components/TrainListScreen";
import {
  dominantStatusLabel,
  officialStopDelay,
} from "../lib/presentation/status";
import { describeLine, summarizeLines } from "../lib/presentation/pulse";
import type { OfficialStopUpdate } from "../lib/types/trains";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { marcShapedStopDelaysWithoutTripStatus } from "./fixtures/synthetic";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/trains",
}));

function serve(detail: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      new Response(
        JSON.stringify(
          /\/api\/v1\/stops/.test(url)
            ? capturedBody("stops")
            : /\/api\/v1\/routes/.test(url)
              ? capturedBody("routes")
              : detail,
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

function update(
  sequence: number | null,
  arrival: number | null,
  departure: number | null = null,
  stopId: string | null = `stop-${sequence}`,
): OfficialStopUpdate {
  return {
    ordinal: sequence ?? 0,
    resolvedSequence: sequence,
    stopId,
    scheduleRelationship: null,
    officialEstimatedArrival: null,
    officialEstimatedDeparture: null,
    officialArrivalDelaySeconds: arrival,
    officialDepartureDelaySeconds: departure,
    resolution: "resolved",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dominant status wording", () => {
  it("narrows to the missing overall status when stop reports exist", () => {
    expect(dominantStatusLabel("UNKNOWN", true)).toEqual({
      text: "No overall status reported",
      tone: "unknown",
    });
    expect(dominantStatusLabel("STALE", true)).toEqual({
      text: "No current overall status",
      tone: "unknown",
    });
    // Both still refuse to imply the train is fine.
    for (const status of ["UNKNOWN", "STALE"] as const) {
      expect(dominantStatusLabel(status, true).text).not.toMatch(/on time|normal|fine/i);
      expect(dominantStatusLabel(status, true).tone).toBe("unknown");
    }
  });

  it("keeps the blunt wording when nothing at all was published", () => {
    expect(dominantStatusLabel("UNKNOWN", false).text).toBe("Realtime status unavailable");
    expect(dominantStatusLabel("STALE", false).text).toBe("Realtime status out of date");
  });

  it("never alters a status the operator did publish", () => {
    for (const status of ["ON_TIME", "DELAYED", "CANCELED", "EARLY"] as const) {
      expect(dominantStatusLabel(status, true)).toEqual(dominantStatusLabel(status, false));
    }
  });
});

describe("choosing which official stop delay to show", () => {
  it("prefers the delay at the calculated next stop", () => {
    const updates = [update(0, 62), update(1, -48), update(5, 182)];
    expect(officialStopDelay(updates, 5)).toEqual({
      seconds: 182,
      stopId: "stop-5",
      sequence: 5,
    });
  });

  it("falls back to the operator's furthest-ahead report", () => {
    const updates = [update(0, 62), update(1, -48), update(5, 182)];
    // No identified next stop, and a sequence the operator did not report.
    expect(officialStopDelay(updates, null)?.seconds).toBe(182);
    expect(officialStopDelay(updates, 99)?.seconds).toBe(182);
  });

  it("ignores updates with no delay or no resolved stop", () => {
    expect(officialStopDelay([update(0, null, null)], null)).toBeNull();
    expect(officialStopDelay([update(null, 60)], null)).toBeNull();
    expect(officialStopDelay([], null)).toBeNull();
  });

  it("uses a departure delay when no arrival delay was published", () => {
    expect(officialStopDelay([update(3, null, 120)], 3)?.seconds).toBe(120);
  });

  it("keeps a published zero as a real figure", () => {
    expect(officialStopDelay([update(2, 0)], 2)?.seconds).toBe(0);
  });
});

describe("the real MDOT shape on screen", () => {
  it("does not appear to contradict itself", async () => {
    serve(marcShapedStopDelaysWithoutTripStatus());
    const { container } = render(<TrainDetailScreen id="token" />);
    await screen.findByText("No overall status reported");
    // The dominant line no longer claims nothing is known...
    expect(screen.queryByText("Realtime status unavailable")).toBeNull();
    // ...and the delay beside it is named with the stop it belongs to.
    expect(screen.getByText(/Official MTA · 3 min 2 sec late at /)).toBeVisible();
    expect(
      screen.getByText(/publishes a delay for each stop rather than one for the whole trip/),
    ).toBeVisible();
    expect(container.textContent).not.toMatch(/No delay reported/);
  });

  it("names the stop a trend figure belongs to", async () => {
    serve(marcShapedStopDelaysWithoutTripStatus());
    render(<TrainDetailScreen id="token" />);
    await screen.findByText(/MARC Now · trend of official delays/);
    const basis = screen.queryByText(/against a published delay of/);
    // Either the basis matches the figure above and is suppressed, or it names its own
    // series so the two figures cannot read as one contradictory delay.
    if (basis !== null) expect(basis.textContent).toMatch(/Measured .+, against/);
  });

  it("still reports unavailable when the operator published nothing at all", async () => {
    const body = mutableBody("train-detail");
    (body.data as Record<string, unknown>).status = "UNKNOWN";
    const official = (body.data as Record<string, unknown>).official as Record<string, unknown>;
    official.delaySeconds = null;
    body.officialStopUpdates = [];
    serve(body);
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Realtime status unavailable")).toBeVisible();
  });
});

describe("the list and Pulse stay within what they can know", () => {
  it("does not claim there is no delay when the list cannot tell", async () => {
    serve(capturedBody("trains"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        new Response(
          JSON.stringify(
            /\/api\/v1\/routes/.test(url) ? capturedBody("routes") : capturedBody("trains"),
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<TrainListScreen />);
    await screen.findAllByRole("listitem");
    // The list response carries no stop updates, so it must not imply their absence.
    expect(screen.queryByText(/No delay reported/)).toBeNull();
  });

  it("says precisely what the Pulse summary cannot see", () => {
    const [line] = summarizeLines(
      [
        {
          id: "a", scheduleVersion: "1", tripId: "T", routeId: "A", serviceDate: "20260930",
          status: "UNKNOWN",
          scheduled: { provenance: "SCHEDULED", start: "2026-09-30T10:00:00Z", end: null,
            shapeId: null, directionId: null, headsign: null },
          official: {
            source: "MARC_TRIP_UPDATES", observationId: null, sourceTimestamp: null,
            receivedAt: null, freshness: "FRESH", conflict: false,
            provenance: "OFFICIAL_REALTIME", status: "UNKNOWN", delaySeconds: null,
            scheduleRelationship: null,
          },
          position: {
            source: "MARC_VEHICLE_POSITIONS", observationId: null, sourceTimestamp: null,
            receivedAt: null, freshness: "UNAVAILABLE", conflict: false,
            provenance: "OFFICIAL_REALTIME", latitude: null, longitude: null,
            speedMetersPerSecond: null, bearingDegrees: null, vehicleId: null,
          },
          membership: {
            scheduledActive: false, realtimeObserved: false, positionFresh: false,
          },
        },
      ],
      new Map(),
    );
    const text = describeLine(line);
    expect(text).toMatch(/not publishing an overall status for any of them/);
    // It must not claim the operator is reporting nothing, which would overstate.
    expect(text).not.toMatch(/not reporting anything|no information/i);
  });
});
