/**
 * Presentation transitions between two **observed** positions.
 *
 * The rule this module exists to enforce, from the map plan's live movement addendum:
 *
 * ```
 * OFFICIAL POSITION A  ->  presentation transition  ->  OFFICIAL POSITION B  ->  stop
 * ```
 *
 * never
 *
 * ```
 * OFFICIAL POSITION  ->  estimated velocity  ->  keep moving indefinitely
 * ```
 *
 * Nothing here predicts. Every transition is bounded at both ends by a coordinate the
 * backend published, and the marker stops on arrival and stays there until a newer
 * observation exists. There is no velocity, no heading projection and no clock-driven
 * motion: the only thing that moves a marker is a new report.
 *
 * Interpolated coordinates are presentation only. They are never recorded as an observation,
 * never shown as one, and never used to derive freshness, movement, progress or next stop.
 */
import type { MapTrain } from "./markers";

/** Longitude, latitude — GeoJSON order, as the backend publishes it. */
export type Point = [number, number];

/** Where a marker is currently drawn, and the report that put it there. */
export interface Rendered {
  point: Point;
  /** The observation this position came from. Null when it was never an observation. */
  reportedAt: number | null;
}

/**
 * What to do with one train on this tick.
 *
 * `place` jumps with no animation, `move` transitions between two published points, and
 * `hold` leaves the marker exactly where it is.
 */
export type Motion =
  | { kind: "place"; to: Point; reportedAt: number | null }
  | { kind: "move"; from: Point; to: Point; reportedAt: number; path: Point[] }
  | { kind: "hold" };

/**
 * Decides how a marker should reach its newest published position.
 *
 * The refusals are the substance:
 *
 * - **A stale position never animates.** It is placed. A gliding last-known marker is the
 *   worst thing this ticket could produce: it looks the most live while being the least
 *   true, and stale tracking is not a stopped train either way.
 * - **An older or repeated report moves nothing**, so an out-of-order response cannot rewind
 *   a marker and a re-render cannot replay a transition.
 * - **Reduced motion places rather than moves**, because the animation conveys nothing the
 *   text does not.
 * - A train with no previous rendered position is placed, not flown in from nowhere.
 *
 * `path` is the route-aware course when one was supplied, and the two endpoints otherwise.
 * Either way the final point is the published coordinate, exactly.
 */
export function motionFor(
  train: MapTrain,
  rendered: Rendered | undefined,
  options: { animate: boolean; path?: Point[] },
): Motion {
  const place = train.place;
  if (place === null) return { kind: "hold" };
  const to: Point = [place.longitude, place.latitude];
  const reportedAt = train.reportedAt;

  // First sighting: there is nothing to transition from.
  if (rendered === undefined) return { kind: "place", to, reportedAt };

  // Nothing newer than what is already drawn. Includes a repeated response and an
  // out-of-order older one.
  if (
    reportedAt !== null &&
    rendered.reportedAt !== null &&
    reportedAt <= rendered.reportedAt
  ) {
    return { kind: "hold" };
  }

  if (!options.animate) return { kind: "place", to, reportedAt };
  // Freshness is the backend's own evaluation. A position it does not call current is
  // placed, never animated.
  if (place.trust !== "CURRENT") return { kind: "place", to, reportedAt };
  if (reportedAt === null) return { kind: "place", to, reportedAt };
  if (rendered.point[0] === to[0] && rendered.point[1] === to[1]) {
    // A new report at the same coordinate. Stationary trains land here, and a transition
    // over zero distance would be motion invented to make the map feel active.
    return { kind: "place", to, reportedAt };
  }

  const path = options.path;
  return {
    kind: "move",
    from: rendered.point,
    to,
    reportedAt,
    path: path !== undefined && path.length >= 2 ? path : [rendered.point, to],
  };
}

/** Cumulative along-path distances, in the path's own planar units. */
function cumulative(path: readonly Point[]): number[] {
  const lengths = [0];
  for (let i = 1; i < path.length; i += 1) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  return lengths;
}

/**
 * The point a given fraction of the way along a path.
 *
 * At `1` this returns the path's **final point exactly**, by identity rather than by
 * arithmetic, so a finished transition lands on the published coordinate and never a
 * floating-point neighbour of it.
 */
export function pointAlong(path: readonly Point[], fraction: number): Point {
  if (path.length === 0) return [0, 0];
  if (path.length === 1 || fraction <= 0) return path[0];
  if (fraction >= 1) return path[path.length - 1];
  const lengths = cumulative(path);
  const total = lengths[lengths.length - 1];
  if (total === 0) return path[path.length - 1];
  const target = total * fraction;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i += 1;
  const span = lengths[i] - lengths[i - 1];
  const t = span === 0 ? 0 : (target - lengths[i - 1]) / span;
  return [
    path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
    path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
  ];
}

/**
 * The stretch of a published alignment between two measured fractions along it.
 *
 * This is **rendering, not map matching**: the backend measured both fractions against the
 * full geometry in MARC-502, and this only reads the line it already published at the
 * scalars it already published. Nothing re-derives a position from coordinates.
 *
 * The endpoints are the train's own reported coordinates rather than points on the line,
 * because the report is the fact and the alignment is only the course between two facts.
 */
export function routeCourse(
  alignment: readonly Point[],
  fromFraction: number,
  toFraction: number,
  from: Point,
  to: Point,
): Point[] {
  if (alignment.length < 2) return [from, to];
  const low = Math.min(fromFraction, toFraction);
  const high = Math.max(fromFraction, toFraction);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high - low <= 0) {
    return [from, to];
  }
  const lengths = cumulative(alignment);
  const total = lengths[lengths.length - 1];
  if (total === 0) return [from, to];

  const between: Point[] = [];
  for (let i = 0; i < alignment.length; i += 1) {
    const at = lengths[i] / total;
    if (at > low && at < high) between.push(alignment[i]);
  }
  // Reversed travel still follows the line, read the other way.
  if (toFraction < fromFraction) between.reverse();
  return [from, ...between, to];
}

/** Eased progress, so a transition starts and ends gently rather than snapping. */
export function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
