/**
 * Route and stop catalog reads.
 *
 * Catalog names may only be joined to a train whose `scheduleVersion` matches the page's
 * `scheduleVersion.id`; older retained detail falls back to identifiers.
 */
import type { RoutePage, StopPage } from "../types/catalogs";
import { requestJson, type RequestOptions } from "./client";
import { checkLimit, usage } from "./limits";
import { parseRoutePage, parseStopPage } from "./parse";
import { backendPaths } from "./paths";

export interface CatalogQuery {
  limit?: number;
  after?: string;
  version?: string;
}

function catalogValues(query: CatalogQuery) {
  checkLimit(query.limit);
  if (query.after !== undefined && query.version === undefined) {
    throw usage("a catalog cursor requires the version it came from");
  }
  return { limit: query.limit, after: query.after, version: query.version };
}

export async function fetchRoutes(
  query: CatalogQuery = {},
  options: RequestOptions = {},
): Promise<RoutePage> {
  return requestJson(
    backendPaths.routes,
    catalogValues(query),
    (value) => parseRoutePage(value),
    options,
  );
}

export interface StopQuery extends CatalogQuery {
  parentId?: string;
  locationType?: number;
}

export async function fetchStops(
  query: StopQuery = {},
  options: RequestOptions = {},
): Promise<StopPage> {
  return requestJson(
    backendPaths.stops,
    {
      ...catalogValues(query),
      parentId: query.parentId,
      locationType: query.locationType,
    },
    (value) => parseStopPage(value),
    options,
  );
}
