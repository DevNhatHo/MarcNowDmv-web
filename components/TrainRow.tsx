import Link from "next/link";
import type { Train } from "../lib/types/trains";
import {
  delayLabel,
  trainStatusLabel,
  type Tone,
} from "../lib/presentation/status";
import { describeReport, formatClockTime } from "../lib/presentation/time";
import styles from "./TrainRow.module.css";

export const toneClass: Record<Tone, string> = {
  positive: styles.positive,
  information: styles.information,
  warning: styles.warning,
  critical: styles.critical,
  unknown: styles.unknown,
};

/**
 * One scheduled train.
 *
 * The scheduled departure dominates, because that is what a commuter scans for. The status
 * shown is the **top-level** current claim, not the retained `official.status`, which may
 * still say ON_TIME long after its evidence went stale. The delay appears only when the
 * operator actually published one, and a published zero reads differently from nothing
 * published at all.
 *
 * No train number, headsign or direction is shown: the backend does not expose them, and
 * the opaque trip identifier must never be parsed to invent one.
 */
export default function TrainRow({
  train,
  lineName,
  timeZone,
  loadedAt,
  href,
}: {
  train: Train;
  lineName: string | null;
  timeZone: string;
  loadedAt: Date;
  href: string;
}) {
  const status = trainStatusLabel(train.status);
  const scheduled = formatClockTime(train.scheduled.start, timeZone);
  const delay = train.official.delaySeconds;
  // A delay is only meaningful next to a current claim; retained evidence reports its age.
  const showDelay = delay !== null || train.official.freshness === "FRESH";

  return (
    <li>
      <Link href={href} className={styles.row}>
        <span className={styles.heading}>
          <span className={styles.time}>{scheduled ?? "Time unavailable"}</span>
          <span className={styles.identity}>{train.tripId}</span>
          <span className={styles.line}>{lineName ?? train.routeId}</span>
        </span>
        <span className={styles.status}>
          <span className={`${styles.statusText} ${toneClass[status.tone]}`}>
            {status.text}
          </span>
          {showDelay ? (
            <span className={styles.meta}>Official · {delayLabel(delay)}</span>
          ) : null}
          <span className={styles.meta}>
            {describeReport(train.official.sourceTimestamp, loadedAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}
