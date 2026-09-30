/**
 * Refresh policy.
 *
 * Intervals are per resource kind, matching the architecture: train data changes on a feed
 * cadence, alerts far more slowly, and a catalog only when a schedule is activated.
 *
 * These describe how often *this app* asks the backend. They are not freshness rules about
 * the data itself: the backend's own `freshness` and `sourceHealth` remain the authority on
 * whether evidence is current, and nothing here recomputes them.
 */
export type ResourceKind = "trains" | "detail" | "alerts" | "catalog";

export interface RefreshPolicy {
  /** How long after a successful read before asking again. */
  intervalMs: number;
  /**
   * How old a cached response may be before its positive claims stop being presented as
   * current. Two missed intervals, as the architecture requires.
   */
  outdatedAfterMs: number;
}

const intervals: Record<ResourceKind, number> = {
  trains: 30_000,
  detail: 30_000,
  alerts: 60_000,
  catalog: 600_000,
};

/** A failed refresh backs off, never beyond two minutes. */
export const maxBackoffMs = 120_000;

export function policyFor(kind: ResourceKind): RefreshPolicy {
  const intervalMs = intervals[kind];
  return { intervalMs, outdatedAfterMs: intervalMs * 2 };
}

/**
 * The delay before retrying after consecutive failures. Doubling from the resource's own
 * interval, capped, so a backend that is down is not hammered.
 */
export function backoffMs(kind: ResourceKind, failures: number): number {
  if (failures <= 0) return policyFor(kind).intervalMs;
  return Math.min(policyFor(kind).intervalMs * 2 ** failures, maxBackoffMs);
}

/** True when a cached response is too old for its positive claims to be shown as current. */
export function isOutdated(
  kind: ResourceKind,
  loadedAt: Date | null,
  now: Date,
): boolean {
  if (loadedAt === null) return false;
  return now.getTime() - loadedAt.getTime() >= policyFor(kind).outdatedAfterMs;
}
