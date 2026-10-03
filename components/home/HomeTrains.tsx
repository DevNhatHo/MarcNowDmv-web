"use client";

import Link from "next/link";
import type { Route } from "../../lib/types/catalogs";
import type { TrainListPage } from "../../lib/types/trains";
import { isRelevantNow, lineLabel } from "../../lib/presentation/trains";
import TrainRow from "../TrainRow";
import styles from "./Home.module.css";

/** How many rows the composition shows before sending people to the full list. */
const preview = 8;

/**
 * The trains panel of the desktop composition.
 *
 * **It issues no request.** Every row comes from the page the Pulse screen already fetched and
 * passes in, rendered with the same `TrainRow` the list screen uses.
 *
 * It shows what is relevant now, by the same published rule the list's Now view uses, and says
 * so — it is never a claim that these trains are running. When nothing is relevant it says
 * that rather than silently showing the first eight of the day.
 */
export default function HomeTrains({
  page,
  routes,
}: {
  page: TrainListPage;
  routes: readonly Route[];
}) {
  const names = new Map<string, string>();
  for (const route of routes) names.set(route.id, lineLabel(route, route.id));

  const relevant = page.data
    .filter(isRelevantNow)
    .sort((left, right) => left.scheduled.start.localeCompare(right.scheduled.start));
  const shown = relevant.slice(0, preview);

  return (
    <section className={styles.trainsPanel} aria-label="Trains relevant now">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Trains</h2>
        <Link href={`/trains?serviceDate=${page.serviceDate}`} className={styles.panelLink}>
          All {page.data.length} today →
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className={styles.panelNote}>
          Nothing is inside its scheduled window or still reporting a position. That is not a
          statement about whether trains are running.
        </p>
      ) : (
        <>
          <p className={styles.panelNote}>
            Scheduled to be running now, or still reporting a position.
          </p>
          <ul className={styles.rows} aria-label="Trains relevant now">
            {shown.map((train) => (
              <TrainRow
                key={train.id}
                train={train}
                lineName={names.get(train.routeId) ?? null}
                timeZone={page.scheduleVersion.timezone}
                href={`/trains?serviceDate=${page.serviceDate}&preview=${encodeURIComponent(train.id)}`}
              />
            ))}
          </ul>
          {relevant.length > shown.length ? (
            <p className={styles.panelNote}>
              {relevant.length - shown.length} more are relevant now.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
