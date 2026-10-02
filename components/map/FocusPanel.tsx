"use client";

import Link from "next/link";
import type { MapTrain } from "../../lib/presentation/markers";
import type { TrainDetail } from "../../lib/types/trains";
import type { Stop } from "../../lib/types/catalogs";
import { trainStatusLabel } from "../../lib/presentation/status";
import {
  MovementStatus,
  NextStopStatus,
  RouteProgressStatus,
} from "../Calculated";
import { ActionButton } from "../Feedback";
import styles from "./FocusPanel.module.css";

/**
 * The focused train, in text.
 *
 * Everything the emphasised marker conveys is here in ordinary markup, because a map is not
 * an accessible way to convey position and nothing may be available only on the canvas. A
 * reader never has to reopen a popup to find out what a train is doing.
 *
 * Movement, next stop and route progress come from the **detail** endpoint, which is the one
 * extra request a selection is allowed to make. They are absent from the system map because
 * the trains list carries no `calculated` group, and asking for it per train would be the
 * fan-out this screen exists to avoid.
 */
export default function FocusPanel({
  train,
  detail,
  stops,
  follow,
  onFollowChange,
  followPaused,
  exitHref,
  detailHref,
}: {
  train: MapTrain;
  /** Null while the one detail request is in flight, or when it failed. */
  detail: TrainDetail | null;
  stops: readonly Stop[];
  follow: boolean;
  onFollowChange: (next: boolean) => void;
  /** True when the viewer panned or zoomed, so the camera has stopped chasing. */
  followPaused: boolean;
  exitHref: string;
  detailHref: string;
}) {
  const stopNames = new Map<string, string>();
  for (const stop of stops) {
    if (stop.name !== null) stopNames.set(stop.id, stop.name);
  }

  const status = trainStatusLabel(train.status);
  const trust = train.place?.trust ?? null;
  const canFollow = trust === "CURRENT";

  return (
    <section className={styles.panel} aria-label={`Focused train ${train.label}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{train.label}</h2>
        {train.line === null ? null : <p className={styles.line}>{train.line}</p>}
      </div>

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

      {/*
        * Follow is opt-in and only ever reacts to a new fresh observation. It is offered
        * only while the position is current: chasing a last-known coordinate would point the
        * camera at where a train was, as though it were worth watching.
        */}
      <div className={styles.controls}>
        {canFollow ? (
          <ActionButton onClick={() => onFollowChange(!follow)}>
            {follow ? "Stop following" : "Follow train"}
          </ActionButton>
        ) : null}
        <Link className={styles.exit} href={exitHref}>
          Exit focus
        </Link>
        <Link className={styles.exit} href={detailHref}>
          Open full detail
        </Link>
      </div>

      {canFollow && follow && followPaused ? (
        <p className={styles.paused}>
          You moved the map, so it has stopped recentring. Choose Follow train again to
          resume.
        </p>
      ) : null}

      {!canFollow && trust === "LAST_KNOWN" ? (
        <p className={styles.note}>
          Following is unavailable while the position is out of date. The marker shows where
          this train was last reported, which is not a claim about where it is now, and not a
          claim that it has stopped.
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
    </section>
  );
}
