/**
 * Backend availability.
 *
 * `/health` reports process and database availability only. A healthy result says nothing
 * about feed freshness, which belongs to each response's `sourceHealth` and per-evidence
 * freshness, so this must never be presented as "realtime is working".
 */
import type { HealthReport } from "../types/common";
import { requestJson, requestStatus, type RequestOptions } from "./client";
import { parseHealth } from "./parse";
import { backendPaths } from "./paths";

export async function fetchHealth(
  options: RequestOptions = {},
): Promise<HealthReport> {
  return requestJson(
    backendPaths.health,
    undefined,
    (value) => parseHealth(value),
    options,
  );
}

/** A body-less probe, for a liveness check that does not need the check detail. */
export async function probeHealth(options: RequestOptions = {}): Promise<number> {
  return requestStatus(backendPaths.health, options);
}
