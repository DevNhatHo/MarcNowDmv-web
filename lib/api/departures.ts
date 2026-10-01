/**
 * Scheduled departures at one stop.
 *
 * The endpoint is **stop-scoped** while the screens are train-scoped, so a caller must
 * anchor on a stop it already knows. It also takes its service date as `YYYY-MM-DD`, unlike
 * every other endpoint's `YYYYMMDD`; sending the wrong form returns 400, so the client
 * converts and refuses anything it cannot convert rather than letting the backend reject it.
 */
import type { DeparturePage } from "../types/departures";
import { requestJson, type RequestOptions } from "./client";
import { checkLimit, usage } from "./limits";
import { parseDeparturePage } from "./parse";
import { backendPaths } from "./paths";
import { isServiceDate } from "../presentation/time";

export interface DepartureQuery {
  stopId: string;
  /** `YYYYMMDD`, as the rest of the app uses; converted here. */
  serviceDate: string;
  routeId?: string;
  limit?: number;
  after?: string;
  version?: string;
}

/** `YYYYMMDD` to the hyphenated form this one endpoint requires. */
export function toHyphenatedServiceDate(serviceDate: string): string {
  return `${serviceDate.slice(0, 4)}-${serviceDate.slice(4, 6)}-${serviceDate.slice(6, 8)}`;
}

export async function fetchDepartures(
  query: DepartureQuery,
  options: RequestOptions = {},
): Promise<DeparturePage> {
  checkLimit(query.limit);
  if (query.stopId.length === 0) throw usage("a stop identifier is required");
  if (!isServiceDate(query.serviceDate)) {
    throw usage("a departures service date must be YYYYMMDD");
  }
  if (query.after !== undefined && query.version === undefined) {
    throw usage("a departures cursor requires the version it came from");
  }
  return requestJson(
    backendPaths.departures,
    {
      stopId: query.stopId,
      serviceDate: toHyphenatedServiceDate(query.serviceDate),
      routeId: query.routeId,
      limit: query.limit,
      after: query.after,
      version: query.version,
    },
    (value) => parseDeparturePage(value),
    options,
  );
}
