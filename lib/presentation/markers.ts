/**
 * Map view models for trains and stations.
 *
 * Everything the map draws is decided here, in provider-neutral terms, so no MapLibre type
 * reaches this file and no trust decision reaches the renderer. The renderer draws what this
 * module says and makes no judgement of its own.
 *
 * Nothing here infers movement. The trains list deliberately carries no `calculated` group,
 * so a system map cannot know whether a train is moving, and this module never guesses one
 * from coordinates: a marker that changed position is not evidence the backend called the
 * train moving.
 */
import type { Route } from "../types/catalogs";
import type { Stop } from "../types/catalogs";
import type { Train, TrainMembership, TrainStatus } from "../types/trains";
import { describeAge } from "./time";
import { lineLabel } from "./trains";

/**
 * How much a drawn coordinate may be trusted. These are the two the backend can justify:
 * a coordinate it calls fresh, and a coordinate it still holds but does not.
 *
 * `LAST_KNOWN` is **not** a claim that the train is there now, and never a claim that it
 * stopped. Stale tracking means the reports stopped arriving, not that the train stopped.
 */
export type PositionTrust = "CURRENT" | "LAST_KNOWN";

export interface MapTrain {
  /** The backend's own train identity. Markers are keyed by this, never by list order. */
  id: string;
  /** The operator's headsign where published, else the verbatim trip identifier. */
  label: string;
  /** True when `label` is the raw identifier, so the UI can say so rather than imply a name. */
  labelIsIdentifier: boolean;
  line: string | null;
  /**
   * The trip's *scheduled* shape, present whether or not the train is reporting, so a
   * focused train's alignment can be emphasised even when it has no position.
   */
  shapeId: string | null;
  status: TrainStatus;
  /** The three facts, carried through intact. Never collapsed into one flag. */
  membership: TrainMembership;
  /** Null when the backend holds no coordinate at all; such a train is listed, not drawn. */
  place: {
    longitude: number;
    latitude: number;
    trust: PositionTrust;
  } | null;
  /** The operator's reported heading, where it published one. Never derived. */
  bearingDegrees: number | null;
  /** Age of the position report, in words. Empty when there is no report to age. */
  reportedText: string | null;
  /** Milliseconds since epoch of the position report, for ordering. Null when unreported. */
  reportedAt: number | null;
}

export interface MapStation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
}

function labelFor(train: Train): { label: string; labelIsIdentifier: boolean } {
  const headsign = train.scheduled.headsign?.trim();
  if (headsign !== undefined && headsign !== "") {
    return { label: headsign, labelIsIdentifier: false };
  }
  // No headsign published. The identifier is the only honest fallback and is never parsed
  // to invent a name from.
  return { label: train.tripId, labelIsIdentifier: true };
}

/**
 * Turns a train list page into map view models.
 *
 * A train is **drawn** only when the backend holds a coordinate for it. Trust comes from
 * `membership.positionFresh`, which is the backend's own freshness evaluation — never from
 * comparing timestamps here, and never from a coordinate merely being present.
 */
export function mapTrains(
  trains: readonly Train[],
  routeNames: ReadonlyMap<string, string>,
  now: Date,
): MapTrain[] {
  return trains.map((train) => {
    const { label, labelIsIdentifier } = labelFor(train);
    const { latitude, longitude } = train.position;
    const reported = train.position.sourceTimestamp;
    const parsed = reported === null ? Number.NaN : Date.parse(reported);
    return {
      id: train.id,
      label,
      labelIsIdentifier,
      line: routeNames.get(train.routeId) ?? null,
      shapeId: train.scheduled.shapeId,
      status: train.status,
      membership: train.membership,
      place:
        latitude === null || longitude === null
          ? null
          : {
              longitude,
              latitude,
              trust: train.membership.positionFresh ? "CURRENT" : "LAST_KNOWN",
            },
      bearingDegrees: train.position.bearingDegrees,
      reportedText: reported === null ? null : describeAge(reported, now),
      reportedAt: Number.isNaN(parsed) ? null : parsed,
    };
  });
}

/**
 * Trains to draw, newest report last so an overlapping current marker is not hidden under a
 * stale one. Trains with no coordinate are deliberately absent and belong in the text list.
 */
export function drawableTrains(trains: readonly MapTrain[]): MapTrain[] {
  return trains
    .filter((train) => train.place !== null)
    .sort((a, b) => {
      // Current markers paint over last-known ones.
      if (a.place!.trust !== b.place!.trust) {
        return a.place!.trust === "CURRENT" ? 1 : -1;
      }
      return (a.reportedAt ?? 0) - (b.reportedAt ?? 0);
    });
}

/**
 * How many drawn trains the backend calls current.
 *
 * Only `CURRENT` counts. A last-known marker is never a live train, and this number is never
 * presented as "trains running": it counts *reports the backend calls fresh*, which is a
 * different and smaller claim.
 */
export function currentCount(trains: readonly MapTrain[]): number {
  return trains.filter((train) => train.place?.trust === "CURRENT").length;
}

/** Stations with usable coordinates, named. A stop with no coordinate is simply not drawn. */
export function mapStations(stops: readonly Stop[]): MapStation[] {
  const stations: MapStation[] = [];
  for (const stop of stops) {
    if (stop.latitude === null || stop.longitude === null) continue;
    // Platforms and entrances are not stations; locationType 0 is a stop/platform and 1 is
    // a station. The feed's own value decides, and an unknown value is left out rather than
    // guessed onto the map.
    if (stop.locationType !== 0 && stop.locationType !== 1) continue;
    stations.push({
      id: stop.id,
      name: stop.name ?? stop.id,
      longitude: stop.longitude,
      latitude: stop.latitude,
    });
  }
  return stations;
}

/**
 * Route display names by id, for labelling a marker's line without parsing an identifier.
 *
 * Uses the same `lineLabel` the train list uses, so a train is not called "Penn Line" in one
 * place and "PENN - WASHINGTON" in another. Two surfaces naming the same fact differently is
 * the drift the shared presentation exists to prevent.
 */
export function routeNameMap(routes: readonly Route[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const route of routes) {
    names.set(route.id, lineLabel(route, route.id));
  }
  return names;
}

/** Where the camera should move to, and the report that justified it. */
export interface FollowTarget {
  center: [number, number];
  reportedAt: number;
}

/**
 * Whether follow should move the camera, and where to.
 *
 * The decision lives here rather than in the renderer because it is a judgement about
 * evidence, not about drawing. Four things must all hold, and each refusal matters:
 *
 * - the train is still on this view — a selection that left the list moves nothing;
 * - it has a position at all;
 * - that position is **CURRENT** — chasing a last-known coordinate would point the camera at
 *   where a train *was*, as though it were worth watching, and a stale position is not a
 *   stopped train either way;
 * - the report is strictly **newer** than the one last followed, so a re-render, a repeated
 *   response or an out-of-order older one cannot move or rewind the camera.
 *
 * Nothing is interpolated. This answers "has a new observation arrived", not "where would
 * the train be now" — the second question is one this product refuses to answer.
 */
export function followTarget(
  train: MapTrain | undefined,
  lastFollowedAt: number | null,
): FollowTarget | null {
  if (train === undefined) return null;
  if (train.place === null || train.place.trust !== "CURRENT") return null;
  const reportedAt = train.reportedAt;
  if (reportedAt === null) return null;
  if (lastFollowedAt !== null && reportedAt <= lastFollowedAt) return null;
  return { center: [train.place.longitude, train.place.latitude], reportedAt };
}
