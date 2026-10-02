import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapScreen from "../components/map/MapScreen";
import {
  currentCount,
  drawableTrains,
  followTarget,
  mapStations,
  mapTrains,
  routeNameMap,
} from "../lib/presentation/markers";
import { parseTrainListPage } from "../lib/api/parse";
import type { Stop } from "../lib/types/catalogs";
import type { Train } from "../lib/types/trains";
import { capturedBody, mutableBody } from "./fixtures/captures";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/map",
}));

vi.mock("../components/map/RouteMap", () => ({
  default: ({ label }: { label: string }) => <div data-testid="map" aria-label={label} />,
}));

const now = new Date("2026-10-02T12:00:00Z");
const names = new Map([["R1", "PENN - WASHINGTON"]]);

/**
 * An explicitly SYNTHETIC train. The retained captures cannot produce every freshness and
 * membership combination on demand, and inventing one is only honest when it is labelled.
 */
function synthetic(overrides: Partial<Train> = {}): Train {
  return {
    id: "SYNTHETIC-1",
    scheduleVersion: "1",
    tripId: "Train999",
    routeId: "R1",
    serviceDate: "20261002",
    status: "UNKNOWN",
    scheduled: {
      provenance: "SCHEDULED",
      start: "2026-10-02T11:00:00Z",
      end: "2026-10-02T13:00:00Z",
      shapeId: "S1",
      directionId: 0,
      headsign: "WASHINGTON",
    },
    official: {
      source: "MARC_TRIP_UPDATES",
      observationId: "1",
      sourceTimestamp: "2026-10-02T11:59:00Z",
      receivedAt: "2026-10-02T11:59:01Z",
      freshness: "FRESH",
      conflict: false,
      provenance: "OFFICIAL_REALTIME",
      status: "UNKNOWN",
      delaySeconds: null,
      scheduleRelationship: null,
    },
    position: {
      source: "MARC_VEHICLE_POSITIONS",
      observationId: "2",
      sourceTimestamp: "2026-10-02T11:59:30Z",
      receivedAt: "2026-10-02T11:59:31Z",
      freshness: "FRESH",
      conflict: false,
      provenance: "OFFICIAL_REALTIME",
      latitude: 39.0,
      longitude: -76.6,
      speedMetersPerSecond: null,
      bearingDegrees: 180,
      vehicleId: "V1",
    },
    membership: { scheduledActive: true, realtimeObserved: true, positionFresh: true },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
});

describe("train markers", () => {
  it("draws a fresh position as current and a retained one as last known", () => {
    const [fresh, stale] = mapTrains(
      [
        synthetic(),
        synthetic({
          id: "SYNTHETIC-2",
          membership: {
            scheduledActive: true,
            realtimeObserved: true,
            positionFresh: false,
          },
        }),
      ],
      names,
      now,
    );
    expect(fresh.place?.trust).toBe("CURRENT");
    expect(stale.place?.trust).toBe("LAST_KNOWN");
  });

  it("trusts the backend's freshness, not the presence of a coordinate", () => {
    // A coordinate the backend does not call fresh is never promoted to a current position,
    // however recent its timestamp looks.
    const [train] = mapTrains(
      [
        synthetic({
          position: { ...synthetic().position, sourceTimestamp: "2026-10-02T11:59:59Z" },
          membership: {
            scheduledActive: true,
            realtimeObserved: true,
            positionFresh: false,
          },
        }),
      ],
      names,
      now,
    );
    expect(train.place?.trust).toBe("LAST_KNOWN");
  });

  it("gives a train with no coordinate no marker but keeps it listed", () => {
    const [train] = mapTrains(
      [
        synthetic({
          position: { ...synthetic().position, latitude: null, longitude: null },
          membership: {
            scheduledActive: true,
            realtimeObserved: false,
            positionFresh: false,
          },
        }),
      ],
      names,
      now,
    );
    expect(train.place).toBeNull();
    expect(drawableTrains([train])).toHaveLength(0);
    // Still a list entry: an unreported train is not an absent one.
    expect(train.label).toBe("WASHINGTON");
  });

  it("never counts a last-known marker as a current one", () => {
    const trains = mapTrains(
      [
        synthetic(),
        synthetic({
          id: "SYNTHETIC-2",
          membership: {
            scheduledActive: true,
            realtimeObserved: true,
            positionFresh: false,
          },
        }),
      ],
      names,
      now,
    );
    expect(currentCount(trains)).toBe(1);
    expect(drawableTrains(trains)).toHaveLength(2);
  });

  it("keeps membership as three facts and invents no active flag", () => {
    const [train] = mapTrains([synthetic()], names, now);
    expect(train.membership).toEqual({
      scheduledActive: true,
      realtimeObserved: true,
      positionFresh: true,
    });
    expect(train).not.toHaveProperty("active");
  });

  it("falls back to the identifier and says so when no headsign is published", () => {
    const [train] = mapTrains(
      [synthetic({ scheduled: { ...synthetic().scheduled, headsign: null } })],
      names,
      now,
    );
    expect(train.label).toBe("Train999");
    expect(train.labelIsIdentifier).toBe(true);
  });

  it("omits a bearing the operator did not report rather than deriving one", () => {
    const [train] = mapTrains(
      [synthetic({ position: { ...synthetic().position, bearingDegrees: null } })],
      names,
      now,
    );
    expect(train.bearingDegrees).toBeNull();
  });

  it("paints current markers over last-known ones at the same place", () => {
    const stale = synthetic({
      id: "stale",
      membership: { scheduledActive: true, realtimeObserved: true, positionFresh: false },
    });
    const drawn = drawableTrains(mapTrains([synthetic(), stale], names, now));
    expect(drawn[drawn.length - 1].place?.trust).toBe("CURRENT");
  });

  it("orders equally trusted markers by report time, oldest first", () => {
    const older = synthetic({
      id: "older",
      position: { ...synthetic().position, sourceTimestamp: "2026-10-02T11:50:00Z" },
    });
    const drawn = drawableTrains(mapTrains([synthetic(), older], names, now));
    expect(drawn.map((t) => t.id)).toEqual(["older", "SYNTHETIC-1"]);
  });

  it("carries no movement state, because the list publishes none", () => {
    const [train] = mapTrains([synthetic()], names, now);
    expect(train).not.toHaveProperty("movement");
    expect(JSON.stringify(train)).not.toContain("MOVING");
    expect(JSON.stringify(train)).not.toContain("STATIONARY");
  });

  it("reads the real captured list without inventing anything", () => {
    const page = parseTrainListPage(capturedBody("trains"));
    const trains = mapTrains(page.data, names, now);
    expect(trains).toHaveLength(page.data.length);
    for (const train of trains) {
      // Every drawn coordinate is one the backend published, unchanged.
      if (train.place === null) continue;
      const source = page.data.find((row) => row.id === train.id);
      expect(train.place.longitude).toBe(source?.position.longitude);
      expect(train.place.latitude).toBe(source?.position.latitude);
    }
  });
});

describe("stations", () => {
  const stop = (overrides: Partial<Stop>): Stop => ({
    id: "S1",
    code: null,
    name: "ODENTON",
    description: null,
    latitude: 39.08,
    longitude: -76.7,
    zoneId: null,
    url: null,
    locationType: 0,
    parentId: null,
    timezone: null,
    wheelchairBoarding: null,
    levelId: null,
    platformCode: null,
    ...overrides,
  });

  it("leaves out a stop with no coordinate rather than guessing one", () => {
    expect(mapStations([stop({ latitude: null })])).toHaveLength(0);
  });

  it("names a stop by its id when the feed publishes no name", () => {
    expect(mapStations([stop({ name: null })])[0].name).toBe("S1");
  });

  it("draws the real captured stops", () => {
    const body = capturedBody("stops") as { data: Stop[] };
    expect(mapStations(body.data).length).toBeGreaterThan(0);
  });
});

describe("route names", () => {
  it("prefers a long name and falls back to a short one", () => {
    const map = routeNameMap([
      { id: "a", shortName: "P", longName: "PENN", sortOrder: null } as never,
      { id: "b", shortName: "C", longName: null, sortOrder: null } as never,
    ]);
    expect(map.get("a")).toBe("PENN");
    expect(map.get("b")).toBe("C");
  });
});

describe("the map screen's train list", () => {
  function serve(trains: unknown) {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const body = /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
          : /\/api\/v1\/stops/.test(url)
            ? capturedBody("stops")
            : /\/api\/v1\/trains/.test(url)
              ? trains
              : capturedBody("shapes");
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    return calls;
  }

  it("lists exactly what the map draws, and loses nothing", async () => {
    serve(capturedBody("trains"));
    render(<MapScreen />);
    const page = parseTrainListPage(capturedBody("trains"));
    const drawn = page.data.filter((row) => row.position.latitude !== null);
    const unreported = page.data.filter((row) => row.position.latitude === null);

    // The visible list mirrors the markers, so the text equivalent equals the map.
    const list = await screen.findByRole("list", { name: "Trains with reported positions" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(drawn.length);

    // Nothing is dropped: the rest are counted and reachable, just not inline.
    const hidden = screen.getByRole("list", {
      name: "Scheduled trains with no reported position",
    });
    expect(within(hidden).getAllByRole("listitem")).toHaveLength(unreported.length);
    expect(
      screen.getByText(new RegExp(`${unreported.length} scheduled trains?`)),
    ).toBeVisible();
  });

  it("does not call an unreported train absent, cancelled or not running", async () => {
    serve(capturedBody("trains"));
    render(<MapScreen />);
    // Present in the document, inside the closed disclosure, and visible once it is opened.
    const note = await screen.findByText(/not a statement about whether they are running/);
    expect(note).toBeInTheDocument();
    await userEvent.click(
      screen.getByText(/scheduled trains? ha(?:ve|s) reported no position/),
    );
    expect(note).toBeVisible();
    const main = document.body.textContent ?? "";
    expect(main).not.toMatch(/\bcancelled\b/i);
  });

  it("reads positions from one bounded list request, never per train", async () => {
    const calls = serve(capturedBody("trains"));
    render(<MapScreen />);
    await screen.findByRole("list", { name: "Trains with reported positions" });
    const trainCalls = calls.filter((url) => /\/api\/v1\/trains/.test(url));
    expect(trainCalls).toHaveLength(1);
    // No detail read: a per-train fan-out is exactly what this screen must not do.
    expect(trainCalls[0]).not.toMatch(/\/api\/v1\/trains\/[^?]/);
  });

  it("says what the current count is, and does not call it trains running", async () => {
    serve(capturedBody("trains"));
    render(<MapScreen />);
    const caption = await screen.findByText(/report a current position|No train positions/);
    expect(caption.textContent ?? "").not.toMatch(/running/i);
  });

  it("keeps the lines usable when the train read fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (/\/api\/v1\/trains/.test(url)) {
          return new Response("{}", { status: 500 });
        }
        const body = /\/api\/v1\/routes/.test(url)
          ? capturedBody("routes")
          : /\/api\/v1\/stops/.test(url)
            ? capturedBody("stops")
            : capturedBody("shapes");
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    render(<MapScreen />);
    expect(await screen.findByText(/Train positions could not be read/)).toBeVisible();
    // The map and its alignments are unaffected by a failed position read.
    expect(screen.getByTestId("map")).toBeVisible();
  });

  it("drops a train that leaves the list rather than retaining a ghost", () => {
    const page = parseTrainListPage(capturedBody("trains"));
    const fewer = mapTrains(page.data.slice(1), names, now);
    expect(fewer.map((t) => t.id)).not.toContain(page.data[0].id);
  });

  it("never renders an unknown status as a positive claim", async () => {
    const body = mutableBody("trains") as { data: { status: string }[] };
    for (const row of body.data) row.status = "UNKNOWN";
    serve(body);
    render(<MapScreen />);
    const list = await screen.findByRole("list", { name: "Trains with reported positions" });
    expect(within(list).queryByText(/On time/)).toBeNull();
  });
});

describe("follow decisions", () => {
  const fresh = () => mapTrains([synthetic()], names, now)[0];
  const stale = () =>
    mapTrains(
      [
        synthetic({
          membership: { scheduledActive: true, realtimeObserved: true, positionFresh: false },
        }),
      ],
      names,
      now,
    )[0];

  it("follows the first fresh observation", () => {
    const target = followTarget(fresh(), null);
    expect(target?.center).toEqual([-76.6, 39.0]);
  });

  it("does not follow a last-known position", () => {
    // The camera would be pointing at where the train was, as though that were live.
    expect(followTarget(stale(), null)).toBeNull();
  });

  it("does not move for a repeated observation", () => {
    const train = fresh();
    const first = followTarget(train, null)!;
    expect(followTarget(train, first.reportedAt)).toBeNull();
  });

  it("does not rewind for an out-of-order older observation", () => {
    const older = mapTrains(
      [
        synthetic({
          position: { ...synthetic().position, sourceTimestamp: "2026-10-02T11:00:00Z" },
        }),
      ],
      names,
      now,
    )[0];
    const newest = Date.parse("2026-10-02T11:59:30Z");
    expect(followTarget(older, newest)).toBeNull();
  });

  it("follows a strictly newer observation", () => {
    const newer = mapTrains(
      [
        synthetic({
          position: { ...synthetic().position, sourceTimestamp: "2026-10-02T11:59:45Z" },
        }),
      ],
      names,
      now,
    )[0];
    const previous = Date.parse("2026-10-02T11:59:30Z");
    expect(followTarget(newer, previous)).not.toBeNull();
  });

  it("moves nothing when the selected train has left the view", () => {
    expect(followTarget(undefined, null)).toBeNull();
  });

  it("moves nothing when the train has no coordinate", () => {
    const [none] = mapTrains(
      [synthetic({ position: { ...synthetic().position, latitude: null, longitude: null } })],
      names,
      now,
    );
    expect(followTarget(none, null)).toBeNull();
  });

  it("never predicts a position past the newest observation", () => {
    // The target is always a published coordinate, never an extrapolation from one.
    const train = fresh();
    const target = followTarget(train, null)!;
    expect(target.center).toEqual([train.place!.longitude, train.place!.latitude]);
  });
});
