/**
 * Pulse summary.
 *
 * The backend exposes no aggregate, so everything here is derived from the **one bounded
 * page** the screen already reads. That has two consequences this module makes explicit
 * rather than hides: a summary describes only the trains actually loaded, and a train
 * whose realtime evidence is absent is counted as unknown, never as running normally.
 *
 * No count of "active" or "stationary" trains is produced. The backend defines no
 * current-running semantics (BACKEND-UI-02), so any such number would be this service's
 * invention.
 */
import type { Train } from "../types/trains";

export interface LineSummary {
  routeId: string;
  name: string | null;
  /** Trains for this line among those loaded. */
  scheduled: number;
  /** Trains whose top-level status is a current claim from the operator. */
  reported: number;
  /** Trains the operator has published a current status for, that is not ON_TIME. */
  disrupted: number;
}

/** A status the backend is willing to state now, as opposed to absent or expired. */
function isCurrentClaim(status: string): boolean {
  return status !== "UNKNOWN" && status !== "STALE";
}

export function summarizeLines(
  trains: readonly Train[],
  names: Map<string, string>,
): LineSummary[] {
  const byRoute = new Map<string, LineSummary>();
  for (const train of trains) {
    const entry = byRoute.get(train.routeId) ?? {
      routeId: train.routeId,
      name: names.get(train.routeId) ?? null,
      scheduled: 0,
      reported: 0,
      disrupted: 0,
    };
    entry.scheduled += 1;
    if (isCurrentClaim(train.status)) {
      entry.reported += 1;
      if (train.status !== "ON_TIME") entry.disrupted += 1;
    }
    byRoute.set(train.routeId, entry);
  }
  return [...byRoute.values()].sort((left, right) =>
    (left.name ?? left.routeId).localeCompare(right.name ?? right.routeId),
  );
}

/**
 * What can honestly be said about one line.
 *
 * With no current reports the answer is explicitly that nothing is known — never "running
 * normally", which the absence of evidence cannot support. A count is used only when the
 * operator has actually reported on some of the line's trains.
 */
export function describeLine(summary: LineSummary): string {
  if (summary.scheduled === 0) {
    return "No trains scheduled for this service date.";
  }
  if (summary.reported === 0) {
    return `${summary.scheduled} scheduled. The operator is not currently reporting status for any of them.`;
  }
  const covered = `${summary.reported} of ${summary.scheduled} scheduled trains have a current report`;
  if (summary.disrupted === 0) {
    return `${covered}, and none of those reports a problem.`;
  }
  return `${covered}, and ${summary.disrupted} of those ${summary.disrupted === 1 ? "reports" : "report"} something other than on time.`;
}

/** The scope sentence every summary must carry, including what is not covered. */
export function describeCoverage(
  loaded: number,
  complete: boolean,
  serviceDate: string,
): string {
  const scope = `Based on ${loaded} scheduled ${loaded === 1 ? "train" : "trains"} for ${serviceDate}`;
  return complete
    ? `${scope}, the whole service date.`
    : `${scope}. More are scheduled than were loaded, so this is a partial view.`;
}
