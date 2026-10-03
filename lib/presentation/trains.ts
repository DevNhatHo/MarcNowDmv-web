/**
 * Presentation rules for the train list.
 *
 * Everything here reads published fields and reformats them. Nothing infers a status, a
 * direction or a delay, and nothing parses an opaque identifier.
 */
import type { Route } from "../types/catalogs";
import type { Train } from "../types/trains";

/**
 * Which scheduled services are relevant **now**.
 *
 * Two published facts, OR'd, and both halves are needed:
 *
 * - `scheduledActive` — the evaluation clock is inside this run's scheduled window. Purely
 *   timetable-derived, and true for a scheduled train the operator is not reporting at all,
 *   which is most of them.
 * - `positionFresh` — the backend still calls this run's position current. MARC-508 observed
 *   `Train454` with `positionFresh: true` and `scheduledActive: false`: a train running
 *   **late, past its scheduled window**, which is exactly the train a commuter is most
 *   anxious about. Dropping it would be the worst failure this filter could have.
 *
 * This is a **filter over published facts, not a status**. It is never rendered as "running":
 * the service cannot determine which trains are running, and a train here may be scheduled
 * and entirely unreported. `membership` stays three separate facts everywhere else — nothing
 * in this module collapses them into a stored flag.
 */
export function isRelevantNow(train: Train): boolean {
  return train.membership.scheduledActive || train.membership.positionFresh;
}

/** What the Now filter actually did, for the screen to say out loud. */
export const nowRuleText =
  "Scheduled to be running now, or still reporting a position. Being listed here is not a claim that a train is running.";

/**
 * A short line name, derived from the operator's own route name.
 *
 * `shortName` is `"MARC"` on all three MARC routes and is useless as a label, so the name
 * comes from `longName` — "PENN - WASHINGTON" becomes "Penn Line". That is a **shortening of
 * the operator's own string**, not a name invented for it, and the whole string is kept
 * whenever it does not split cleanly.
 *
 * It is deliberately not combined with a destination: see `destinationOf`.
 */
export function lineLabel(route: Route | undefined, routeId: string): string {
  const published = route?.longName ?? route?.shortName ?? null;
  if (published === null) return routeId;
  const head = published.split(/\s+-\s+/)[0]?.trim();
  if (head === undefined || head === "" || head === published) return published;
  // "PENN" -> "Penn Line". Title-cased because the feed shouts; the words are the operator's.
  const titled = head
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
  return `${titled} Line`;
}

/**
 * Where the train is **booked** to go, from the operator's headsign.
 *
 * This must never be taken from the route name. On 2026-10-03 the feed carried 18 trains on
 * `PENN - WASHINGTON`, of which 9 were headed to **BALTIMORE** or **BALTIMORE AND MARTIN
 * AIR** — rendering the route name as a journey would have mislabelled half the list.
 *
 * A headsign is a scheduled fact, never a claim about where the train is now.
 */
export function destinationOf(train: Train): string | null {
  const headsign = train.scheduled.headsign?.trim();
  return headsign === undefined || headsign === "" ? null : headsign;
}

/**
 * The delay to show on a row, or null.
 *
 * Only a published **trip-level** delay qualifies. MDOT publishes none on this feed, so the
 * common case is null and the row is designed for that. The per-stop delays it does publish
 * live on the detail response and are named with their stop; promoting one to a row would
 * turn a figure about one station into a figure about the whole trip.
 */
export function tripDelaySeconds(train: Train): number | null {
  return train.official.delaySeconds;
}
