/**
 * Alert reads. The backend requires both the `snapshot` and `version` tokens alongside
 * `after`, so a continuation without them is refused here rather than sent.
 */
import type { AlertPage } from "../types/alerts";
import { requestJson, type RequestOptions } from "./client";
import { checkLimit, usage } from "./limits";
import { parseAlertPage } from "./parse";
import { backendPaths } from "./paths";

export interface AlertQuery {
  limit?: number;
  after?: string;
  /** Opaque `snapshot` from the page the cursor came from. */
  snapshot?: string;
  /** Opaque `scheduleVersion` from the page the cursor came from. */
  version?: string;
}

export async function fetchAlerts(
  query: AlertQuery = {},
  options: RequestOptions = {},
): Promise<AlertPage> {
  checkLimit(query.limit);
  if (
    query.after !== undefined &&
    (query.snapshot === undefined || query.version === undefined)
  ) {
    throw usage(
      "an alert cursor requires the snapshot and version it came from",
    );
  }
  return requestJson(
    backendPaths.alerts,
    {
      limit: query.limit,
      after: query.after,
      snapshot: query.snapshot,
      version: query.version,
    },
    (value) => parseAlertPage(value),
    options,
  );
}
