import Link from "next/link";
import type { Train } from "../lib/types/trains";
import {
  delayLabel,
  trainStatusLabel,
  type Tone,
} from "../lib/presentation/status";
import { destinationOf, tripDelaySeconds } from "../lib/presentation/trains";
import { formatClockTime } from "../lib/presentation/time";
import styles from "./TrainRow.module.css";

export const toneClass: Record<Tone, string> = {
  positive: styles.positive,
  information: styles.information,
  warning: styles.warning,
  critical: styles.critical,
  unknown: styles.unknown,
};

/**
 * One scheduled train, as a compact row.
 *
 * The scheduled departure dominates, because that is what a commuter scans for. The status
 * shown is the **top-level** current claim, not the retained `official.status`, which may
 * still say ON_TIME long after its evidence went stale.
 *
 * **Line and destination are separate facts.** The line is the operator's route name,
 * shortened; the destination is `scheduled.headsign`. They are never joined into a journey
 * like "Penn → Washington": on the day this was written, 9 of 18 trains on `PENN -
 * WASHINGTON` were headed to Baltimore, so that rendering would have mislabelled half the
 * list.
 *
 * A delay appears only when the operator published a trip-level one, which on this feed is
 * rare. The row is laid out for the common case — no delay, no realtime — so a silent
 * operator does not make it look broken.
 *
 * The whole row is one link to the train's own page. That is the single interaction: there is
 * no nested control, and the contextual preview is [WEB-UI-04]'s, which will attach to this
 * same row.
 */
export default function TrainRow({
  train,
  lineName,
  timeZone,
  href,
  showStatus = true,
}: {
  train: Train;
  lineName: string | null;
  timeZone: string;
  href: string;
  /**
   * False when **every** train in the list is equally unreported, in which case the screen
   * says so once above the list instead of repeating one identical sentence on 97 rows. It
   * is never false while any row differs: a row that has realtime must say so itself, or the
   * absence of the line would imply a status the row does not have.
   */
  showStatus?: boolean;
}) {
  const status = trainStatusLabel(train.status);
  const scheduled = formatClockTime(train.scheduled.start, timeZone);
  const destination = destinationOf(train);
  const delay = tripDelaySeconds(train);

  return (
    <li className={styles.item}>
      <Link href={href} className={styles.row}>
        <span className={styles.time}>{scheduled ?? "—"}</span>

        <span className={styles.body}>
          <span className={styles.identity}>{train.tripId}</span>
          <span className={styles.where}>
            {lineName ?? train.routeId}
            {destination !== null ? (
              <>
                {" · to "}
                <span className={styles.destination}>{destination}</span>
              </>
            ) : null}
          </span>
          {showStatus ? (
          <span className={styles.status}>
            {/*
              * A small mark beside the words, never instead of them: the status is legible
              * with the colour removed entirely.
              */}
            <span className={`${styles.mark} ${toneClass[status.tone]}`} aria-hidden="true">
              ●
            </span>
            <span className={`${styles.statusText} ${toneClass[status.tone]}`}>
              {status.text}
            </span>
            {delay !== null ? (
              <span className={styles.delay}>Official MTA · {delayLabel(delay)}</span>
            ) : null}
          </span>
          ) : null}
        </span>

        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}
