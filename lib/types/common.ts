/**
 * Wire contract shared by every backend response.
 *
 * Verified against backend commit `ade2f9e` handler DTOs and the captures in
 * docs/contract-samples. Timestamps stay verbatim ISO strings and identifiers stay
 * strings: this layer preserves what the backend said and never reformats, rounds or
 * reinterprets it.
 */

/**
 * A backend enum. Known members are named so presentation can be exhaustive about the
 * values it understands, while any other string still parses successfully. An
 * unrecognized value must remain unknown rather than invalidate a response, and must
 * never be presented as healthy.
 */
export type Enum<Known extends string> = Known | (string & Record<never, never>);

export const provenances = ["SCHEDULED", "OFFICIAL_REALTIME", "CALCULATED"] as const;
export type Provenance = Enum<(typeof provenances)[number]>;

/** Per-evidence freshness. Absent realtime is UNKNOWN or UNAVAILABLE, never ON_TIME. */
export const freshnessValues = ["FRESH", "STALE", "UNKNOWN", "UNAVAILABLE"] as const;
export type Freshness = Enum<(typeof freshnessValues)[number]>;

/** Feed health, which is a separate concern from per-evidence freshness. */
export const healthStates = ["HEALTHY", "DEGRADED", "STALE", "UNAVAILABLE"] as const;
export type HealthState = Enum<(typeof healthStates)[number]>;

export const feedSources = [
  "MARC_STATIC_GTFS",
  "MARC_TRIP_UPDATES",
  "MARC_VEHICLE_POSITIONS",
  "MTA_SERVICE_ALERTS",
] as const;
export type FeedSource = Enum<(typeof feedSources)[number]>;

/** True only for a value the frontend has an explicit label for. */
export function isKnown<T extends string>(
  known: readonly T[],
  value: string,
): value is T {
  return (known as readonly string[]).includes(value);
}

/** Identity of one activated static schedule. `id` is the `version` query token. */
export interface ScheduleVersion {
  id: string;
  checksum: string;
  timezone: string;
  activatedAt: string;
}

/**
 * One realtime source's health. `signals` may arrive absent or null and is normalized to
 * an empty array; an empty signal list is not a promise of healthy data.
 */
export interface SourceHealth {
  source: FeedSource;
  state: HealthState;
  signals: string[];
  sourceTimestamp: string | null;
  receivedAt: string | null;
  lastFetch: string | null;
  lastSuccess: string | null;
  failureStreak: number;
  httpStatus: number | null;
  entityCount: number | null;
  invalidCount: number;
  feedVersion: string | null;
  compatibility: string | null;
}

/** `/health` reports process and database availability only, never feed freshness. */
export interface HealthReport {
  status: Enum<"ok" | "unavailable">;
  checks: Record<string, Enum<"ok" | "unavailable">>;
}

/** The backend's error envelope. */
export interface WireError {
  code: string;
  message: string;
}
