/**
 * What the railway is doing right now, derived from the timetable.
 *
 * At 01:40 on 2026-10-03 the app said "0 of 18 trains report a current position". That is
 * true, and it reads like a broken service rather than a sleeping railway. This module names
 * the three states a commuter actually distinguishes, from published facts only.
 *
 * **Nothing here is inference.** The state comes from scheduled windows and the backend's own
 * `membership` facts; the next departure is a timetable entry. No arrival is predicted, no
 * train is called running, and no count is labelled "active".
 */
import type { Train, TrainListPage } from "../types/trains";
import { isRelevantNow } from "./trains";

export type ServiceState = "IN_SERVICE" | "BETWEEN_TRAINS" | "ENDED" | "NONE_SCHEDULED";

export interface ServiceSummary {
  state: ServiceState;
  /** Scheduled runs on this service date. A schedule count, never a running count. */
  scheduled: number;
  /** Runs the backend calls current **or** inside their scheduled window. */
  relevantNow: number;
  /** Runs whose position the backend currently calls fresh. Not a count of moving trains. */
  reportingNow: number;
  /** Runs with a trip-level delay the operator actually published. Usually zero on this feed. */
  reportedDelayed: number;
  /** The next run whose scheduled departure is still ahead, if any. */
  next: Train | null;
}

/**
 * Milliseconds until a train's scheduled departure, or null when it has no usable start.
 */
function startsIn(train: Train, now: Date): number | null {
  const start = Date.parse(train.scheduled.start);
  if (Number.isNaN(start)) return null;
  return start - now.getTime();
}

/**
 * Summarise a service date at one instant.
 *
 * The clock is the response's own `evaluatedAt` rather than the browser's, so the state and
 * the data describe the same moment. `scheduled.start` and `end` are absolute instants from
 * the backend, already resolved in the schedule version's timezone, so a service date that
 * crosses midnight needs no special case here.
 */
export function summariseService(page: TrainListPage, now: Date): ServiceSummary {
  const trains = page.data;
  const relevant = trains.filter(isRelevantNow);
  const upcoming = trains
    .map((train) => ({ train, in: startsIn(train, now) }))
    .filter((candidate): candidate is { train: Train; in: number } => candidate.in !== null)
    .filter((candidate) => candidate.in > 0)
    .sort((left, right) => left.in - right.in);

  const summary = {
    scheduled: trains.length,
    relevantNow: relevant.length,
    reportingNow: trains.filter((train) => train.membership.positionFresh).length,
    reportedDelayed: trains.filter((train) => train.official.delaySeconds !== null).length,
    next: upcoming[0]?.train ?? null,
  };

  if (trains.length === 0) return { ...summary, state: "NONE_SCHEDULED" };
  if (relevant.length > 0) return { ...summary, state: "IN_SERVICE" };
  // Nothing is inside a window and nothing is reporting. Whether that is a gap between trains
  // or the end of the day is decided by whether any departure is still ahead.
  return { ...summary, state: summary.next === null ? "ENDED" : "BETWEEN_TRAINS" };
}

/** Minutes until a train's scheduled departure, rounded down, or null. */
export function minutesUntil(train: Train, now: Date): number | null {
  const ms = startsIn(train, now);
  if (ms === null || ms < 0) return null;
  return Math.floor(ms / 60000);
}

/**
 * The headline for a state.
 *
 * "In service" says trains are **scheduled or reporting**, never that *N* trains are running:
 * this service cannot determine that, and the counts beside it each name what they count.
 */
export function serviceHeadline(summary: ServiceSummary): string {
  switch (summary.state) {
    case "NONE_SCHEDULED":
      return "No MARC trains are scheduled for this service date";
    case "ENDED":
      return "MARC service has ended for today";
    case "BETWEEN_TRAINS":
      return "No MARC train is inside its scheduled window right now";
    default:
      return "MARC is in service";
  }
}
