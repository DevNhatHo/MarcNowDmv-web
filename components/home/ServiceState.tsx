"use client";

import Link from "next/link";
import type { TrainListPage } from "../../lib/types/trains";
import {
  minutesUntil,
  serviceHeadline,
  summariseService,
} from "../../lib/presentation/service";
import { destinationOf } from "../../lib/presentation/trains";
import { formatClockTime } from "../../lib/presentation/time";
import styles from "./ServiceState.module.css";

/**
 * What the railway is doing, and the one thing a commuter wants next.
 *
 * Three states, all timetable-derived: service ended, between trains, in service. None of them
 * claims a train is running, and each count names the fact it counts — scheduled runs,
 * positions the backend calls fresh, and delays the operator actually published.
 *
 * There is deliberately **no "active" count**. MARC-508 refused to publish that boolean
 * because its three facts disagree, and collapsing them here would reintroduce exactly what
 * the backend declined to invent.
 */
export default function ServiceState({
  page,
  lineNames,
}: {
  page: TrainListPage;
  lineNames: Map<string, string>;
}) {
  // The response's own clock, so the state and the data describe one instant.
  const parsed = Date.parse(page.evaluatedAt);
  const now = Number.isNaN(parsed) ? new Date() : new Date(parsed);
  const summary = summariseService(page, now);
  const timeZone = page.scheduleVersion.timezone;

  const next = summary.next;
  const minutes = next === null ? null : minutesUntil(next, now);

  return (
    <section
      className={`${styles.panel} ${styles[summary.state.toLowerCase()]}`}
      aria-label="MARC service state"
    >
      <p className={styles.headline}>{serviceHeadline(summary)}</p>

      {summary.state === "IN_SERVICE" ? (
        <>
          <p className={styles.detail}>
            Trains are scheduled or reporting. This service cannot determine how many are
            actually running.
          </p>
          <dl className={styles.counts}>
            <div className={styles.count}>
              <dt className={styles.countLabel}>Scheduled today</dt>
              <dd className={styles.countValue}>{summary.scheduled}</dd>
            </div>
            <div className={styles.count}>
              <dt className={styles.countLabel}>Reporting a current position</dt>
              <dd className={styles.countValue}>{summary.reportingNow}</dd>
            </div>
            <div className={styles.count}>
              <dt className={styles.countLabel}>With a delay the operator published</dt>
              <dd className={styles.countValue}>{summary.reportedDelayed}</dd>
            </div>
          </dl>
        </>
      ) : null}

      {summary.state === "BETWEEN_TRAINS" && minutes !== null ? (
        <p className={styles.detail}>
          The next scheduled departure is in {minutes === 0 ? "less than a minute" : `${minutes} min`}.
          A train the operator is not reporting is not an absent train.
        </p>
      ) : null}

      {summary.state === "ENDED" ? (
        <p className={styles.detail}>
          No further departure is scheduled on this service date.
        </p>
      ) : null}

      {summary.state === "NONE_SCHEDULED" ? (
        <p className={styles.detail}>
          The published schedule has no runs for this date.
        </p>
      ) : null}

      {next !== null ? (
        <p className={styles.next}>
          <span className={styles.nextLabel}>Next scheduled departure</span>
          <Link
            className={styles.nextLink}
            href={`/trains?serviceDate=${page.serviceDate}&preview=${encodeURIComponent(next.id)}`}
          >
            <span className={styles.nextTime}>
              {formatClockTime(next.scheduled.start, timeZone) ?? "—"}
            </span>
            <span className={styles.nextTrain}>
              {next.tripId}
              {lineNames.get(next.routeId) !== undefined ? (
                <span className={styles.nextLine}> · {lineNames.get(next.routeId)}</span>
              ) : null}
              {destinationOf(next) !== null ? (
                <span className={styles.nextLine}> · to {destinationOf(next)}</span>
              ) : null}
            </span>
          </Link>
        </p>
      ) : null}
    </section>
  );
}
