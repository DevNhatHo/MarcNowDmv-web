import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainDetailScreen from "../components/TrainDetailScreen";
import {
  fetchDepartures,
  toHyphenatedServiceDate,
} from "../lib/api/departures";
import { parseDeparturePage } from "../lib/api/parse";
import { isAllowedPath } from "../lib/api/paths";
import { capturedBody, mutableBody } from "./fixtures/captures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/trains",
}));

const base = { baseUrl: "/api/backend" };

function serve(routes: Array<[RegExp, unknown, number?]>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      for (const [pattern, body, status] of routes) {
        if (pattern.test(url)) {
          return new Response(JSON.stringify(body), {
            status: status ?? 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      throw new Error(`unexpected request ${url}`);
    }),
  );
  return calls;
}

/** The detail screen's three existing reads plus the departures read. */
function detailRoutes(departures: unknown = capturedBody("departures")) {
  return [
    [/\/api\/v1\/departures/, departures],
    [/\/api\/v1\/trains\//, capturedBody("train-detail")],
    [/\/api\/v1\/stops/, capturedBody("stops")],
    [/\/api\/v1\/routes/, capturedBody("routes")],
  ] as Array<[RegExp, unknown, number?]>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("departures contract", () => {
  it("parses the real capture", () => {
    const page = parseDeparturePage(capturedBody("departures"));
    expect(page.provenance).toBe("SCHEDULED");
    expect(page.data.length).toBeGreaterThan(0);
    const first = page.data[0];
    expect(first.headsign).toBe("UNION STATION");
    expect(first.tripId).toBe("Train872");
    // The endpoint's own service-date form is preserved verbatim.
    expect(first.serviceDate).toBe("2026-09-30");
  });

  it("tolerates a null headsign and null times", () => {
    const body = mutableBody("departures");
    const rows = body.data as Record<string, unknown>[];
    rows[0].headsign = null;
    rows[0].arrivalTime = null;
    rows[0].scheduledArrival = null;
    const page = parseDeparturePage(body);
    expect(page.data[0].headsign).toBeNull();
    expect(page.data[0].arrivalTime).toBeNull();
  });

  it("converts the service date to the form this one endpoint requires", async () => {
    expect(toHyphenatedServiceDate("20260930")).toBe("2026-09-30");
    const calls = serve([[/\/api\/v1\/departures/, capturedBody("departures")]]);
    await fetchDepartures({ stopId: "11940", serviceDate: "20260930" }, base);
    expect(calls[0]).toContain("serviceDate=2026-09-30");
    expect(calls[0]).not.toContain("serviceDate=20260930");
  });

  it("refuses a date the endpoint would reject, without sending it", async () => {
    const calls = serve([[/\/api\/v1\/departures/, capturedBody("departures")]]);
    for (const serviceDate of ["2026-09-30", "20260931", "", "nonsense"]) {
      await expect(
        fetchDepartures({ stopId: "11940", serviceDate }, base),
      ).rejects.toMatchObject({ failure: { kind: "usage" } });
    }
    await expect(
      fetchDepartures({ stopId: "", serviceDate: "20260930" }, base),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
    expect(calls).toHaveLength(0);
  });

  it("is reachable through the proxy allowlist", () => {
    expect(isAllowedPath("/api/v1/departures")).toBe(true);
    expect(isAllowedPath("/api/v1/departures/11940")).toBe(false);
  });
});

describe("the destination on train detail", () => {
  it("leads with the operator's destination and keeps the identifier", async () => {
    const departures = mutableBody("departures");
    const rows = departures.data as Record<string, unknown>[];
    const detail = capturedBody("train-detail") as { data: { tripId: string } };
    rows[0].tripId = detail.data.tripId;
    rows[0].headsign = "PERRYVILLE";
    serve(detailRoutes(departures));
    render(<TrainDetailScreen id="token" />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "PERRYVILLE" }),
    ).toBeVisible();
    // The verbatim identifier stays available for support and diagnosis.
    expect(screen.getByText(detail.data.tripId)).toBeVisible();
    expect(screen.getByText(/does not describe where this train is now/)).toBeVisible();
  });

  it("anchors on a stop the train actually calls at, in one request", async () => {
    const calls = serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    await screen.findByRole("heading", { level: 1 });
    const departures = calls.filter((url) => url.includes("/departures"));
    expect(departures).toHaveLength(1);
    const detail = capturedBody("train-detail") as {
      scheduledStops: { stopId: string }[];
      data: { routeId: string };
    };
    expect(departures[0]).toContain(`stopId=${detail.scheduledStops[0].stopId}`);
    expect(departures[0]).toContain(`routeId=${detail.data.routeId}`);
  });

  it("falls back to the trip identifier when no destination is published", async () => {
    const departures = mutableBody("departures");
    departures.data = [];
    serve(detailRoutes(departures));
    render(<TrainDetailScreen id="token" />);
    const detail = capturedBody("train-detail") as { data: { tripId: string } };
    expect(
      await screen.findByRole("heading", { level: 1, name: detail.data.tripId }),
    ).toBeVisible();
    expect(screen.queryByText(/does not describe where this train is now/)).toBeNull();
  });

  it("keeps the screen when the departures read fails", async () => {
    serve([
      [/\/api\/v1\/departures/, { error: { code: "internal", message: "no" } }, 500],
      [/\/api\/v1\/trains\//, capturedBody("train-detail")],
      [/\/api\/v1\/stops/, capturedBody("stops")],
      [/\/api\/v1\/routes/, capturedBody("routes")],
    ]);
    render(<TrainDetailScreen id="token" />);
    // A missing label must never cost the commuter the status they came for.
    expect(await screen.findByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByText(/MARC Now · observed movement/)).toBeVisible();
  });

  it("never matches a destination to the wrong trip", async () => {
    const departures = mutableBody("departures");
    const rows = departures.data as Record<string, unknown>[];
    for (const row of rows) row.tripId = "SomeOtherTrain";
    serve(detailRoutes(departures));
    render(<TrainDetailScreen id="token" />);
    const detail = capturedBody("train-detail") as { data: { tripId: string } };
    // No trip matches, so the identifier stands rather than borrowing a neighbour's sign.
    expect(
      await screen.findByRole("heading", { level: 1, name: detail.data.tripId }),
    ).toBeVisible();
  });
});
