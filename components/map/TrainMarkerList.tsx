"use client";

import Link from "next/link";
import type { MapTrain } from "../../lib/presentation/markers";
import { trainStatusLabel } from "../../lib/presentation/status";
import styles from "./TrainMarkerList.module.css";

/**
 * The text equivalent of the train markers.
 *
 * A map is not an accessible way to convey position, so everything a marker shows is also
 * here, in ordinary semantic markup, reachable by keyboard and readable by a screen reader.
 * Overlapping markers are individually reachable here even when they are not on the canvas.
 *
 * The visible list is **what the map draws** — the trains that have a position. Equivalence
 * means matching the map, not reprinting the service date: on a real weekday 62 of 97 trains
 * have no coordinate at all, and listing them inline made a page thirteen thousand pixels
 * tall in which the map's actual content was lost.
 *
 * Those trains are not dropped, because an unreported train is not an absent one. They are
 * counted and named in a closed disclosure, and the trains screen covers them in full.
 */
export default function TrainMarkerList({
  trains,
  serviceDate,
  routeId,
}: {
  trains: readonly MapTrain[];
  serviceDate: string;
  routeId: string | undefined;
}) {
  if (trains.length === 0) return null;

  const detailHref = (train: MapTrain) => {
    const query = new URLSearchParams({ serviceDate });
    if (routeId !== undefined) query.set("routeId", routeId);
    return `/trains/${encodeURIComponent(train.id)}?${query.toString()}`;
  };

  // Drawn trains, current before last-known, so the list reads in the order the map's own
  // trust does. Unreported trains keep their scheduled order in the disclosure below.
  const drawn = trains
    .filter((train) => train.place !== null)
    .sort((a, b) => {
      if (a.place!.trust !== b.place!.trust) return a.place!.trust === "CURRENT" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  const unreported = trains.filter((train) => train.place === null);

  return (
    <>
    <ul className={styles.list} aria-label="Trains with reported positions">
      {drawn.map((train) => {
        const status = trainStatusLabel(train.status);
        const trust = train.place?.trust ?? null;
        return (
          <li key={train.id} className={styles.item}>
            <p className={styles.identity}>
              <Link className={styles.link} href={detailHref(train)}>
                {train.label}
              </Link>
              {train.labelIsIdentifier ? (
                <span className={styles.note}> (identifier; no destination published)</span>
              ) : null}
              {train.line === null ? null : (
                <span className={styles.line}> {train.line}</span>
              )}
            </p>

            <p className={styles.facts}>
              {/*
                * The marker's own meaning in words. "Last known position" is never softened
                * into a current one, and a stale position makes no claim about movement:
                * tracking stopped, which is not the same as the train stopping.
                */}
              {trust === "CURRENT" ? (
                <span className={styles.current}>Current position</span>
              ) : trust === "LAST_KNOWN" ? (
                <span className={styles.lastKnown}>Last known position</span>
              ) : (
                <span className={styles.absent}>No position reported</span>
              )}
              {train.reportedText === null ? null : (
                <span className={styles.age}> · {train.reportedText}</span>
              )}
            </p>

            <p className={styles.facts}>
              <span className={styles.official}>Official MTA · {status.text}</span>
              {train.bearingDegrees === null ? null : (
                <span className={styles.age}> · Reported heading {train.bearingDegrees}°</span>
              )}
            </p>

            {/*
              * Movement is deliberately absent. The trains list carries no calculated group,
              * so this screen cannot know whether a train is moving and does not guess; the
              * train's own detail page states it for the one run a reader cares about.
              */}
          </li>
        );
      })}
    </ul>

    {unreported.length === 0 ? null : (
      <details className={styles.disclosure}>
        <summary className={styles.summary}>
          {unreported.length === 1
            ? "1 scheduled train has reported no position"
            : `${unreported.length} scheduled trains have reported no position`}
        </summary>
        {/*
          * Not drawn, and deliberately not described as absent, cancelled or not running:
          * the operator published no Vehicle Position for them, which says nothing about
          * whether they are running. Their own pages carry whatever the operator did say.
          */}
        <p className={styles.disclosureNote}>
          These are scheduled for this service date and the operator has published no
          position for them. That is not a statement about whether they are running.
        </p>
        <ul className={styles.list} aria-label="Scheduled trains with no reported position">
          {unreported.map((train) => (
            <li key={train.id} className={styles.item}>
              <p className={styles.identity}>
                <Link className={styles.link} href={detailHref(train)}>
                  {train.label}
                </Link>
                {train.line === null ? null : (
                  <span className={styles.line}> {train.line}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </details>
    )}
    </>
  );
}
