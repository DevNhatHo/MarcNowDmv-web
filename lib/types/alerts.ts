/**
 * MARC alerts wire contract.
 *
 * The backend already filters MARC relevance and active periods. Alert text arrives as
 * nullable translation objects rather than strings, cause and effect are nullable GTFS-RT
 * numeric enums, and an informed entity is a selector scope, not a claim that one
 * particular train is affected.
 */
import type { Provenance, SourceHealth } from "./common";

export interface Translation {
  text: string;
  language: string | null;
}

/** Translated text. Prefer English, then the first nonempty translation. */
export interface Translated {
  translation: Translation[];
}

export interface AlertTripSelector {
  tripId: string | null;
  routeId: string | null;
  startDate: string | null;
  startTime: string | null;
  directionId: number | null;
  /** Serialized verbatim by the backend; shape is not part of this contract. */
  scheduleRelationship: unknown;
}

export interface AlertSelector {
  agencyId: string | null;
  routeId: string | null;
  routeType: number | null;
  stopId: string | null;
  directionId: number | null;
  trip: AlertTripSelector | null;
}

/** Bounds may be absent, which means the period is open at that end. */
export interface ActivePeriod {
  start: string | null;
  end: string | null;
}

/**
 * One retained alert. Distinct `id` values stay distinct even when their titles match.
 * `url` is rendered only for an HTTP(S) target, and text is rendered as plain text.
 */
export interface Alert {
  id: string;
  observationId: string;
  provenance: Provenance;
  cause: number | null;
  effect: number | null;
  headerText: Translated | null;
  descriptionText: Translated | null;
  url: Translated | null;
  informedEntity: AlertSelector[];
  activePeriods: ActivePeriod[];
}

/**
 * A page of alerts. `snapshot` and `scheduleVersion` are opaque continuation tokens: the
 * backend requires both alongside `after`. An empty page without usable feed evidence is
 * not proof that there are no disruptions.
 */
export interface AlertPage {
  evaluatedAt: string;
  snapshot: string;
  scheduleVersion: string;
  sourceTimestamp: string | null;
  sourceHealth: SourceHealth[];
  data: Alert[];
  nextAfter: string | null;
}
