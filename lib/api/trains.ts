/**
 * Train list and detail reads.
 *
 * The cursor rules here were verified against the handlers, not the prose: a list
 * continuation must resend `serviceDate` and `version`, and the backend additionally
 * requires the cursor's own embedded service date to match. Sending `after` alone is a
 * guaranteed 400, so it is refused as a usage failure instead.
 */
import type { TrainDetail, TrainListPage } from "../types/trains";
import { requestJson, type RequestOptions } from "./client";
import { checkLimit, checkOrdinal, usage } from "./limits";
import { parseTrainDetail, parseTrainListPage } from "./parse";
import { backendPaths, trainDetailPath } from "./paths";

export interface TrainListQuery {
  /** `YYYYMMDD` in the feed timezone. Omitted means the backend's current service date. */
  serviceDate?: string;
  routeId?: string;
  limit?: number;
  /** Opaque token from a previous page's `nextAfter`. */
  after?: string;
  /** `scheduleVersion.id` from the page the cursor came from. */
  version?: string;
}

export async function fetchTrains(
  query: TrainListQuery = {},
  options: RequestOptions = {},
): Promise<TrainListPage> {
  checkLimit(query.limit);
  if (query.after !== undefined) {
    if (query.serviceDate === undefined || query.version === undefined) {
      throw usage(
        "a train list cursor requires the serviceDate and version it came from",
      );
    }
  }
  return requestJson(
    backendPaths.trains,
    {
      serviceDate: query.serviceDate,
      routeId: query.routeId,
      limit: query.limit,
      after: query.after,
      version: query.version,
    },
    (value) => parseTrainListPage(value),
    options,
  );
}

/**
 * Detail cursors. `afterStop` and `afterUpdate` page `scheduledStops` and
 * `officialStopUpdates`; they are unrelated to `calculated.nextStop`. Detail accepts no
 * version parameter, because a retained identifier already names its own schedule version.
 */
export interface TrainDetailQuery {
  limit?: number;
  afterStop?: number;
  afterUpdate?: number;
}

export async function fetchTrainDetail(
  id: string,
  query: TrainDetailQuery = {},
  options: RequestOptions = {},
): Promise<TrainDetail> {
  if (id.length === 0) throw usage("a train identifier is required");
  checkLimit(query.limit);
  checkOrdinal("afterStop", query.afterStop);
  checkOrdinal("afterUpdate", query.afterUpdate);
  return requestJson(
    trainDetailPath(id),
    {
      limit: query.limit,
      afterStop: query.afterStop,
      afterUpdate: query.afterUpdate,
    },
    (value) => parseTrainDetail(value),
    options,
  );
}
