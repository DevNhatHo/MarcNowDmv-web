/**
 * Route and stop catalog wire contract.
 *
 * Catalogs are SCHEDULED data scoped to one schedule version. Names may be joined to a
 * train only when the schedule versions match; retained old-version detail falls back to
 * identifiers instead.
 */
import type { Provenance, ScheduleVersion } from "./common";

export interface Route {
  id: string;
  agencyId: string;
  shortName: string | null;
  longName: string | null;
  description: string | null;
  routeType: number;
  url: string | null;
  color: string | null;
  textColor: string | null;
  sortOrder: number | null;
}

export interface Stop {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  zoneId: string | null;
  url: string | null;
  locationType: number;
  parentId: string | null;
  timezone: string | null;
  wheelchairBoarding: number | null;
  levelId: string | null;
  platformCode: string | null;
}

export interface CatalogPage<T> {
  scheduleVersion: ScheduleVersion;
  provenance: Provenance;
  data: T[];
  nextAfter: string | null;
}

export type RoutePage = CatalogPage<Route>;
export type StopPage = CatalogPage<Stop>;
