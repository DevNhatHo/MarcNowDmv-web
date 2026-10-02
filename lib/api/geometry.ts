/**
 * Route geometry reads.
 *
 * Geometry is immutable for a given schedule version and shape, so it is read once per
 * version rather than on every refresh tick. The architecture forbids downloading shapes on
 * each position update, and this is where that is enforced.
 */
import type { ShapePage } from "../types/geometry";
import { requestJson, type RequestOptions } from "./client";
import { checkLimit, usage } from "./limits";
import { parseShapePage } from "./parse";
import { backendPaths } from "./paths";

export interface ShapeQuery {
  routeId?: string;
  shapeId?: string;
  limit?: number;
  after?: string;
  /** `scheduleVersion.id` from the page the cursor came from. */
  version?: string;
}

export async function fetchShapes(
  query: ShapeQuery = {},
  options: RequestOptions = {},
): Promise<ShapePage> {
  checkLimit(query.limit);
  if (query.after !== undefined && query.version === undefined) {
    throw usage("a geometry cursor requires the version it came from");
  }
  return requestJson(
    backendPaths.shapes,
    {
      routeId: query.routeId,
      shapeId: query.shapeId,
      limit: query.limit,
      after: query.after,
      version: query.version,
    },
    (value) => parseShapePage(value),
    options,
  );
}
