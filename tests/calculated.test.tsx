import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainDetailScreen from "../components/TrainDetailScreen";
import {
  displayableStationarySeconds,
  distanceLabel,
  durationLabel,
  movementLabel,
  nextStopLabel,
  trendChangeLabel,
  trendLabel,
  trendScopeLabel,
} from "../lib/presentation/movement";
import type {
  CalculatedNextStop,
  ObservedMovement,
  OfficialDelayTrend,
} from "../lib/types/trains";
import { capturedBody, mutableBody } from "./fixtures/captures";
import {
  syntheticCalculatedDetail,
  syntheticEmptyDetail,
  syntheticLostTrackingWithHistoricDwell,
  syntheticStaleGpsWithLiveTrend,
} from "./fixtures/synthetic";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/trains",
}));

function serveDetail(detail: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = /\/api\/v1\/stops/.test(url)
        ? capturedBody("stops")
        : /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
          : detail;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("calculated vocabulary", () => {
  it("keeps movement physical and never implies punctuality", () => {
    expect(movementLabel("MOVING")).toEqual({ text: "Moving", tone: "information" });
    expect(movementLabel("MOVING").text).not.toMatch(/on time|late|delay/i);
    expect(movementLabel("STATIONARY")).toEqual({
      text: "Appears stationary",
      tone: "warning",
    });
    expect(movementLabel("UNKNOWN").tone).toBe("unknown");
    // A state this frontend has never seen degrades to unavailable, never to healthy.
    expect(movementLabel("DRIFTING")).toEqual({
      text: "Movement unavailable",
      tone: "unknown",
    });
  });

  it("shows a dwell only while the calculation is stationary", () => {
    const base = { stationarySeconds: 900 } as ObservedMovement;
    expect(displayableStationarySeconds({ ...base, state: "STATIONARY" })).toBe(900);
    // The value survives into UNKNOWN as history; it is not a current duration.
    expect(displayableStationarySeconds({ ...base, state: "UNKNOWN" })).toBeNull();
    expect(displayableStationarySeconds({ ...base, state: "MOVING" })).toBeNull();
    expect(
      displayableStationarySeconds({ state: "STATIONARY", stationarySeconds: null } as ObservedMovement),
    ).toBeNull();
  });

  it("words durations without inventing precision", () => {
    expect(durationLabel(45)).toBe("45 sec");
    expect(durationLabel(120)).toBe("2 min");
    expect(durationLabel(150)).toBe("2 min 30 sec");
    expect(durationLabel(3600)).toBe("1 hr");
    expect(durationLabel(5400)).toBe("1 hr 30 min");
  });

  it("offers no replacement for a passed final stop", () => {
    expect(nextStopLabel("IDENTIFIED").text).toBe("Next scheduled stop");
    expect(nextStopLabel("PASSED_FINAL").text).toBe("Passed its final scheduled stop");
    expect(nextStopLabel("PASSED_FINAL").tone).toBe("unknown");
    expect(nextStopLabel("UNKNOWN").text).toBe("Next stop unavailable");
    expect(nextStopLabel("SOMETHING_NEW").text).toBe("Next stop unavailable");
  });

  it("states a distance only when the backend said it is in metres", () => {
    const call = {
      alongRouteDistanceMeters: 1420.75,
      units: "meters",
    } as CalculatedNextStop;
    expect(distanceLabel(call)).toBe("1.4 km away along the route");
    expect(distanceLabel({ ...call, alongRouteDistanceMeters: 420 })).toBe(
      "420 m away along the route",
    );
    expect(distanceLabel({ ...call, alongRouteDistanceMeters: null })).toBeNull();
    // An undefined unit is never relabelled as metres.
    expect(distanceLabel({ ...call, units: "unknown" })).toBeNull();
  });

  it("describes a trend direction without a signed number", () => {
    expect(trendLabel("IMPROVING").tone).toBe("positive");
    expect(trendLabel("WORSENING").tone).toBe("warning");
    expect(trendLabel("UNKNOWN").tone).toBe("unknown");
    expect(trendLabel("OSCILLATING").text).toBe("Delay trend unavailable");
    const trend = { changeSeconds: 240 } as OfficialDelayTrend;
    expect(trendChangeLabel(trend)).toBe("4 min worse over the window");
    expect(trendChangeLabel({ ...trend, changeSeconds: -120 })).toBe(
      "2 min better over the window",
    );
    // Zero change is noise, not information.
    expect(trendChangeLabel({ ...trend, changeSeconds: 0 })).toBeNull();
    expect(trendChangeLabel({ ...trend, changeSeconds: null })).toBeNull();
  });

  it("names the series a trend was measured over", () => {
    expect(trendScopeLabel({ level: "TRIP" } as OfficialDelayTrend)).toBe(
      "across the whole trip",
    );
    expect(
      trendScopeLabel({ level: "STOP", stopSequence: 5, event: "ARRIVAL" } as OfficialDelayTrend),
    ).toBe("at stop 5's arrival");
    expect(
      trendScopeLabel({ level: "SEGMENT", stopSequence: null, event: null } as OfficialDelayTrend),
    ).toBe("over an unrecognised series");
  });
});

describe("calculated presentation on detail", () => {
  it("labels every calculated value as MARC Now, distinct from Official MTA", async () => {
    serveDetail(syntheticCalculatedDetail({}));
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText(/MARC Now · observed movement/)).toBeVisible();
    expect(screen.getByText(/MARC Now · next stop/)).toBeVisible();
    expect(screen.getByText(/MARC Now · trend of official delays/)).toBeVisible();
    // The official block keeps its own source and is not merged with these.
    expect(screen.getByText(/^Official MTA ·/)).toBeVisible();
  });

  it("shows a stationary dwell and says it is not an official status", async () => {
    serveDetail(syntheticCalculatedDetail({}));
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Appears stationary · 2 min")).toBeVisible();
    expect(screen.getByText(/It does not say why/)).toBeVisible();
    expect(screen.getByText(/not an official\s+service status/)).toBeVisible();
  });

  it("never presents a historic dwell as a current one", async () => {
    serveDetail(syntheticLostTrackingWithHistoricDwell());
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Movement unavailable")).toBeVisible();
    // The retained 900 seconds must not surface as a duration anywhere on the page.
    expect(screen.queryByText(/15 min/)).toBeNull();
    expect(screen.queryByText(/Appears stationary/)).toBeNull();
    expect(
      screen.getByText(/not the same as a stopped train/),
    ).toBeVisible();
  });

  it("keeps the official delay trend when the position is stale", async () => {
    serveDetail(syntheticStaleGpsWithLiveTrend());
    render(<TrainDetailScreen id="token" />);
    // Movement is unavailable, yet the independent trend is still reported.
    expect(await screen.findByText("Movement unavailable")).toBeVisible();
    expect(screen.getByText("Official delay improving")).toBeVisible();
    expect(screen.getByText("3 min better over the window")).toBeVisible();
    expect(screen.getByText("Last reported location")).toBeVisible();
  });

  it("reports a skipped candidate without advancing past it", async () => {
    serveDetail(
      syntheticCalculatedDetail({
        nextStop: { state: "IDENTIFIED", officiallySkipped: true, stopId: "11985" },
      }),
    );
    render(<TrainDetailScreen id="token" />);
    expect(
      await screen.findByText(/operator reported this scheduled stop skipped/),
    ).toBeVisible();
    // The identified call is still the one shown; no replacement is chosen.
    expect(screen.getByText("Next scheduled stop")).toBeVisible();
  });

  it("offers no substitute after the final scheduled stop", async () => {
    serveDetail(
      syntheticCalculatedDetail({
        nextStop: {
          state: "PASSED_FINAL",
          stopId: null,
          stopSequence: null,
          alongRouteDistanceMeters: null,
          officiallySkipped: null,
        },
      }),
    );
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Passed its final scheduled stop")).toBeVisible();
    expect(screen.getByText(/no next one to show/)).toBeVisible();
    expect(screen.queryByText(/away along the route/)).toBeNull();
  });

  it("reports moving without implying the train is on time", async () => {
    serveDetail(
      syntheticCalculatedDetail({
        movement: { state: "MOVING", stationarySeconds: null, reasons: [] },
      }),
    );
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Moving")).toBeVisible();
    expect(screen.queryByText("On time")).toBeNull();
  });

  it("degrades an unrecognized calculated state safely", async () => {
    serveDetail(
      syntheticCalculatedDetail({
        movement: { state: "DRIFTING" },
        nextStop: { state: "APPROACHING" },
        trend: { state: "OSCILLATING" },
      }),
    );
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Movement unavailable")).toBeVisible();
    expect(screen.getByText("Next stop unavailable")).toBeVisible();
    expect(screen.getByText("Delay trend unavailable")).toBeVisible();
  });

  it("says movement is unavailable when the backend sent no calculations", async () => {
    serveDetail(syntheticEmptyDetail());
    render(<TrainDetailScreen id="token" />);
    expect(
      await screen.findByText(/Movement data isn’t available for this train yet/),
    ).toBeVisible();
    expect(screen.queryByText(/MARC Now/)).toBeNull();
  });

  it("reports the real retained capture as unavailable on every calculation", async () => {
    serveDetail(capturedBody("train-detail"));
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Movement unavailable")).toBeVisible();
    expect(screen.getByText("Next stop unavailable")).toBeVisible();
    expect(screen.getByText("Delay trend unavailable")).toBeVisible();
  });

  it("keeps technical reasons and thresholds inside diagnostics", async () => {
    serveDetail(syntheticLostTrackingWithHistoricDwell());
    const { container } = render(<TrainDetailScreen id="token" />);
    await screen.findByText("Movement unavailable");
    const diagnostics = container.querySelector("details");
    expect(diagnostics?.open).toBe(false);
    expect(diagnostics?.textContent).toContain("source_stale");
    // The raw reason never appears in the commuter-facing part of the page.
    const visible = container.textContent?.replace(diagnostics?.textContent ?? "", "");
    expect(visible).not.toContain("source_stale");
    expect(visible).not.toMatch(/radiusMeters|toleranceSeconds/);
  });

  it("states the same official delay once, not in two cards", async () => {
    const body = syntheticCalculatedDetail({ trend: { officialDelaySeconds: 420 } });
    const official = (body.data as Record<string, unknown>).official as Record<string, unknown>;
    official.delaySeconds = 420;
    official.freshness = "FRESH";
    serveDetail(body);
    render(<TrainDetailScreen id="token" />);
    await screen.findByText(/MARC Now · trend of official delays/);
    // The trend's basis is the delay already shown above, so it is not restated.
    expect(screen.getAllByText(/7 min late/)).toHaveLength(1);
    expect(screen.queryByText(/Measured against the operator/)).toBeNull();
  });

  it("names the trend's basis when it differs from the delay shown above", async () => {
    const body = syntheticCalculatedDetail({ trend: { officialDelaySeconds: 420 } });
    const official = (body.data as Record<string, unknown>).official as Record<string, unknown>;
    official.delaySeconds = 60;
    official.freshness = "FRESH";
    serveDetail(body);
    render(<TrainDetailScreen id="token" />);
    expect(
      await screen.findByText(/Measured against the operator’s published delay of 7 min late/),
    ).toBeVisible();
    expect(screen.getByText(/Official · 1 min late|1 min late/)).toBeVisible();
  });
});

describe("list stays free of calculated values", () => {
  it("shows no MARC Now calculation on a list row", () => {
    const page = mutableBody("trains");
    expect(JSON.stringify(page)).not.toContain("observedMovement");
    expect(JSON.stringify(page)).not.toContain("calculated");
  });
});
