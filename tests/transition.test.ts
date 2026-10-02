import { describe, expect, it } from "vitest";
import {
  ease,
  motionFor,
  pointAlong,
  routeCourse,
  type Point,
  type Rendered,
} from "../lib/presentation/transition";
import { mapTrains } from "../lib/presentation/markers";
import type { Train } from "../lib/types/trains";

const now = new Date("2026-10-02T12:00:00Z");
const names = new Map([["R1", "PENN - WASHINGTON"]]);

/** Explicitly SYNTHETIC. No retained capture can produce two consecutive positions on demand. */
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

const train = (over: Partial<Train> = {}) => mapTrains([synthetic(over)], names, now)[0];
const at = (iso: string) => Date.parse(iso);
const rendered = (point: Point, iso: string | null): Rendered => ({
  point,
  reportedAt: iso === null ? null : at(iso),
});

describe("motion between observed positions", () => {
  it("places a train that was not drawn before, rather than flying it in", () => {
    const motion = motionFor(train(), undefined, { animate: true });
    expect(motion.kind).toBe("place");
  });

  it("moves between two published positions", () => {
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T11:59:00Z"),
      { animate: true },
    );
    expect(motion.kind).toBe("move");
    if (motion.kind !== "move") return;
    expect(motion.from).toEqual([-76.7, 39.1]);
    expect(motion.to).toEqual([-76.6, 39.0]);
  });

  it("ends exactly on the published coordinate, never near it", () => {
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T11:59:00Z"),
      { animate: true },
    );
    if (motion.kind !== "move") throw new Error("expected a move");
    // The hard rule: the transition's endpoint is the observation itself.
    expect(pointAlong(motion.path, 1)).toEqual([-76.6, 39.0]);
  });

  it("never animates a stale position", () => {
    // A gliding last-known marker looks the most live while being the least true.
    const stale = train({
      membership: { scheduledActive: true, realtimeObserved: true, positionFresh: false },
    });
    const motion = motionFor(stale, rendered([-76.7, 39.1], "2026-10-02T11:00:00Z"), {
      animate: true,
    });
    expect(motion.kind).toBe("place");
  });

  it("holds for a repeated observation", () => {
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T11:59:30Z"),
      { animate: true },
    );
    expect(motion.kind).toBe("hold");
  });

  it("holds for an out-of-order older observation, and never moves backward", () => {
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T12:30:00Z"),
      { animate: true },
    );
    expect(motion.kind).toBe("hold");
  });

  it("places rather than moves under reduced motion", () => {
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T11:59:00Z"),
      { animate: false },
    );
    expect(motion.kind).toBe("place");
  });

  it("invents no motion for a train reporting the same coordinate again", () => {
    // A stationary train keeps reporting. Animating over zero distance would be motion added
    // to make the map feel active.
    const motion = motionFor(
      train(),
      rendered([-76.6, 39.0], "2026-10-02T11:59:00Z"),
      { animate: true },
    );
    expect(motion.kind).toBe("place");
  });

  it("resumes toward the newest observation when interrupted mid-transition", () => {
    // A marker caught in flight still carries the report it departed, so a poll arriving
    // mid-transition continues the move and lands on the newer observation. It must never
    // be left stranded between two of them.
    const midFlight = rendered([-76.65, 39.05], "2026-10-02T11:59:00Z");
    const motion = motionFor(train(), midFlight, { animate: true });
    expect(motion.kind).toBe("move");
    if (motion.kind !== "move") return;
    expect(motion.from).toEqual([-76.65, 39.05]);
    expect(motion.to).toEqual([-76.6, 39.0]);
    expect(pointAlong(motion.path, 1)).toEqual([-76.6, 39.0]);
  });

  it("holds a train with no coordinate at all", () => {
    const none = train({
      position: { ...synthetic().position, latitude: null, longitude: null },
    });
    expect(motionFor(none, undefined, { animate: true }).kind).toBe("hold");
  });

  it("follows a supplied route course instead of the straight chord", () => {
    const course: Point[] = [
      [-76.7, 39.1],
      [-76.65, 39.08],
      [-76.6, 39.0],
    ];
    const motion = motionFor(
      train(),
      rendered([-76.7, 39.1], "2026-10-02T11:59:00Z"),
      { animate: true, path: course },
    );
    if (motion.kind !== "move") throw new Error("expected a move");
    expect(motion.path).toEqual(course);
    expect(pointAlong(motion.path, 1)).toEqual([-76.6, 39.0]);
  });
});

describe("sampling a course", () => {
  const path: Point[] = [
    [0, 0],
    [10, 0],
  ];

  it("returns the first point at zero and the last at one, by identity", () => {
    expect(pointAlong(path, 0)).toBe(path[0]);
    expect(pointAlong(path, 1)).toBe(path[1]);
  });

  it("never runs past the end, whatever fraction it is given", () => {
    // The rule that matters: no amount of elapsed time carries a marker beyond its newest
    // observation.
    expect(pointAlong(path, 1.5)).toBe(path[1]);
    expect(pointAlong(path, 99)).toBe(path[1]);
  });

  it("samples proportionally along a multi-segment course", () => {
    const course: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(pointAlong(course, 0.5)).toEqual([10, 0]);
    expect(pointAlong(course, 0.25)).toEqual([5, 0]);
  });

  it("eases without ever exceeding its bounds", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(2)).toBe(1);
    expect(ease(-1)).toBe(0);
    for (let t = 0; t <= 1; t += 0.05) {
      expect(ease(t)).toBeGreaterThanOrEqual(0);
      expect(ease(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe("route-aware course", () => {
  const alignment: Point[] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ];

  it("follows the published line between two measured fractions", () => {
    const course = routeCourse(alignment, 0.25, 0.75, [1, 0], [3, 0]);
    expect(course[0]).toEqual([1, 0]);
    expect(course[course.length - 1]).toEqual([3, 0]);
    // It passes through the line's own vertices rather than cutting across.
    expect(course).toContainEqual([2, 0]);
  });

  it("reads the line the other way when progress decreased", () => {
    const course = routeCourse(alignment, 0.75, 0.25, [3, 0], [1, 0]);
    expect(course[0]).toEqual([3, 0]);
    expect(course[course.length - 1]).toEqual([1, 0]);
  });

  it("falls back to the straight chord when the alignment is unusable", () => {
    expect(routeCourse([], 0.1, 0.9, [0, 0], [5, 5])).toEqual([
      [0, 0],
      [5, 5],
    ]);
  });

  it("falls back when the two fractions are the same", () => {
    expect(routeCourse(alignment, 0.5, 0.5, [2, 0], [2, 0])).toEqual([
      [2, 0],
      [2, 0],
    ]);
  });

  it("always begins and ends on the reported coordinates, not on the line", () => {
    // The report is the fact; the alignment is only the course between two facts.
    const course = routeCourse(alignment, 0.25, 0.75, [1.01, 0.02], [2.99, -0.02]);
    expect(course[0]).toEqual([1.01, 0.02]);
    expect(course[course.length - 1]).toEqual([2.99, -0.02]);
  });
});
