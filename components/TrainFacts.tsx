"use client";

import type { MapTrain } from "../lib/presentation/markers";
import type { Stop } from "../lib/types/catalogs";
import type { TrainDetail } from "../lib/types/trains";
import { trainStatusLabel } from "../lib/presentation/status";
import { MovementStatus, NextStopStatus, RouteProgressStatus } from "./Calculated";
import styles from "./TrainFacts.module.css";

/**
 * What this service knows about one train, in one place.
 *
 * **There is exactly one implementation of this.** The map's focus panel and the list's Quick
 * Look both render it, so the two surfaces cannot drift into describing the same train
 * differently — which is the defect worth more than any amount of visual polish here.
 *
 * Every distinction the rest of the app makes is preserved:
 *
 * - position trust is the backend's own freshness, and a last-known position is never
 *   presented as current, nor as a train that has stopped;
 * - calculated values are labelled MARC Now and never read as official MTA;
 * - `UNKNOWN` movement is not stationary;
 * - a per-stop delay stays named with its stop and never becomes a trip-level delay.
 *
 * Movement, next stop and route progress come from the **detail** response. A caller supplies
 * it only for a train the reader deliberately opened; it is never fetched per row or per
 * marker.
 */
export default function TrainFacts({
  train,
  detail,
  stops,
}: {
  train: MapTrain;
  /** Null while the one detail read is in flight, or when it failed. */
  detail: TrainDetail | null;
  stops: readonly Stop[];
}) {
  const stopNames = new Map<string, string>();
  for (const stop of stops) {
    if (stop.name !== null) stopNames.set(stop.id, stop.name);
  }

  const status = trainStatusLabel(train.status);
  const trust = train.place?.trust ?? null;

  return (
    <div className={styles.facts}>
      <p className={styles.trust}>
        {trust === "CURRENT" ? (
          <span className={styles.current}>Current position</span>
        ) : trust === "LAST_KNOWN" ? (
          <span className={styles.lastKnown}>Last known position</span>
        ) : (
          <span className={styles.absent}>No position reported</span>
        )}
        {train.reportedText === null ? null : <span> · {train.reportedText}</span>}
      </p>

      <p className={styles.official}>
        Official MTA · {status.text}
        {train.bearingDegrees === null ? null : (
          <span> · Reported heading {train.bearingDegrees}°</span>
        )}
      </p>

      {trust === "LAST_KNOWN" ? (
        <p className={styles.note}>
          This is where the train was last reported. It is not a claim about where it is now,
          and not a claim that it has stopped.
        </p>
      ) : null}

      {detail === null ? (
        <p className={styles.note}>
          Movement, next stop and route progress are still loading for this train.
        </p>
      ) : detail.calculated === null ? (
        <p className={styles.note}>
          This deployment published no calculated movement for this train.
        </p>
      ) : (
        <div className={styles.calculated}>
          <MovementStatus calculated={detail.calculated} />
          <NextStopStatus calculated={detail.calculated} stopNames={stopNames} />
          <RouteProgressStatus calculated={detail.calculated} />
        </div>
      )}
    </div>
  );
}
