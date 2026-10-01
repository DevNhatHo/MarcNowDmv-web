"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchRoutes, fetchStops, fetchTrainDetail } from "../lib/api";
import type { Route, Stop } from "../lib/types/catalogs";
import type { TrainDetail } from "../lib/types/trains";
import {
  coordinatesText,
  delayLabel,
  dominantStatusLabel,
  freshnessLabel,
  officialStopDelay,
  isReportedSkipped,
  positionLabel,
  stopRelationshipLabel,
  trainStatusLabel,
  tripRelationshipLabel,
  type Tone,
} from "../lib/presentation/status";
import {
  describeAge,
  describeReport,
  formatClockTime,
  formatServiceDate,
  timeZoneLabel,
} from "../lib/presentation/time";
import { ActionButton, LoadingRows, Notice, describeFailure } from "./Feedback";
import { DelayTrend, MovementStatus, NextStopStatus } from "./Calculated";
import { trendScopeLabel } from "../lib/presentation/movement";
import { useSharedResource } from "./useSharedResource";
import Freshness from "./Freshness";
import styles from "./TrainDetailScreen.module.css";

const toneClass: Record<Tone, string> = {
  positive: styles.positive,
  information: styles.information,
  warning: styles.warning,
  critical: styles.critical,
  unknown: styles.unknown,
};

interface Loaded {
  detail: TrainDetail;
  stops: Stop[];
  routes: Route[];
  catalogVersion: string;
}

async function loadDetail(id: string, signal: AbortSignal): Promise<Loaded> {
  const detail = await fetchTrainDetail(id, { limit: 200 }, { signal });
  const stops = await fetchStops({ limit: 200 }, { signal });
  const routes = await fetchRoutes({ limit: 200 }, { signal });
  return {
    detail,
    stops: stops.data,
    routes: routes.data,
    catalogVersion: stops.scheduleVersion.id,
  };
}

export default function TrainDetailScreen({ id }: { id: string }) {
  const params = useSearchParams();
  const load = useCallback(
    (signal: AbortSignal) => loadDetail(id, signal),
    [id],
  );
  const resource = useSharedResource<Loaded>(`detail:${id}`, "detail", load);
  const loaded = resource.data;
  const detail = loaded?.detail;

  const backHref = useMemo(() => {
    const query = params.toString();
    return query.length > 0 ? `/trains?${query}` : "/trains";
  }, [params]);

  /**
   * Stop names come from the catalog only when it shares the train's schedule version.
   * A retained train from an older version keeps its identifiers rather than borrowing a
   * name that may since have moved.
   */
  const stopNames = useMemo(() => {
    const names = new Map<string, string>();
    if (loaded && detail && loaded.catalogVersion === detail.data.scheduleVersion) {
      for (const stop of loaded.stops) {
        if (stop.name !== null) names.set(stop.id, stop.name);
      }
    }
    return names;
  }, [loaded, detail]);

  /** The line name, on the same version rule the stop names follow. */
  const lineName = useMemo(() => {
    if (!loaded || !detail || loaded.catalogVersion !== detail.data.scheduleVersion) {
      return null;
    }
    const route = loaded.routes.find((entry) => entry.id === detail.data.routeId);
    return route?.longName ?? route?.shortName ?? null;
  }, [loaded, detail]);

  return (
    <div className={styles.screen}>
      <p className={styles.back}>
        <Link href={backHref} className="standalone-link">← Back to trains</Link>
      </p>

      {resource.loading && !detail ? (
        <LoadingRows count={3} label="Loading this train" />
      ) : null}

      {resource.error ? (
        <DetailFailure error={resource.error} onRetry={resource.refresh} />
      ) : null}

      <Freshness
        loadedAt={resource.loadedAt}
        outdated={resource.outdated}
        loading={resource.loading}
        failed={resource.failures > 0}
        onRefresh={resource.refresh}
        now={new Date()}
      />
      {detail ? (
        <DetailBody
          detail={detail}
          lineName={lineName}
          stopNames={stopNames}
          loadedAt={resource.loadedAt ?? new Date(detail.evaluatedAt)}
        />
      ) : null}
    </div>
  );
}

/**
 * The back link already sits above this notice, so repeating it here would put the same
 * control on the screen twice. Only the action the notice adds is offered.
 */
function DetailFailure({
  error,
  onRetry,
}: {
  error: Parameters<typeof describeFailure>[0];
  onRetry: () => void;
}) {
  const { title, body } = describeFailure(error);
  return (
    <Notice
      tone="critical"
      title={title}
      actions={<ActionButton onClick={onRetry}>Try again</ActionButton>}
    >
      {body}
    </Notice>
  );
}

function DetailBody({
  detail,
  lineName,
  stopNames,
  loadedAt,
}: {
  detail: TrainDetail;
  lineName: string | null;
  stopNames: Map<string, string>;
  loadedAt: Date;
}) {
  const train = detail.data;
  const official = train.official;
  /*
   * The operator publishes per-stop delays with no trip-level status, so the dominant line
   * narrows to what is actually missing and the stop figure is shown beside it, named with
   * its stop. Neither is derived from the other.
   */
  const stopDelay = officialStopDelay(
    detail.officialStopUpdates,
    detail.calculated?.nextStop.stopSequence ?? null,
  );
  const status = dominantStatusLabel(
    train.status,
    official.delaySeconds === null && stopDelay !== null,
  );
  const position = train.position;
  const place = positionLabel(position.latitude, position.longitude, position.freshness);
  // The feed timezone is not published on detail, so times are shown in the agency zone the
  // catalogs declare. America/New_York is MARC's zone; it is stated beside every time.
  const timeZone = "America/New_York";
  const relationship = tripRelationshipLabel(official.scheduleRelationship);

  return (
    <>
      <div className={styles.identity}>
        <h1 className={styles.tripId}>{train.tripId}</h1>
        <span className={styles.line}>{lineName ?? train.routeId}</span>
      </div>
      <p className={styles.meta}>
        Scheduled for {formatServiceDate(train.serviceDate)} ·{" "}
        {formatClockTime(train.scheduled.start, timeZone) ?? "time unavailable"}{" "}
        {timeZoneLabel(train.scheduled.start, timeZone) ?? ""}
      </p>

      <p className={`${styles.status} ${toneClass[status.tone]}`}>{status.text}</p>
      <p className={styles.provenance}>
        Official MTA ·{" "}
        {official.delaySeconds !== null || stopDelay === null
          ? delayLabel(official.delaySeconds)
          : `${delayLabel(stopDelay.seconds)} at ${stopName(stopDelay, stopNames)}`}{" "}
        · {describeReport(official.sourceTimestamp, loadedAt)}
        {relationship !== null ? ` · ${relationship}` : ""}
      </p>
      {official.delaySeconds === null && stopDelay !== null ? (
        <p className={styles.meta}>
          The operator publishes a delay for each stop rather than one for the whole trip.
          Other stops on this trip may report a different figure.
        </p>
      ) : null}
      {official.status !== train.status ? (
        <p className={styles.meta}>
          The operator last published “{trainStatusLabel(official.status).text}”. That
          evidence is no longer current, so it is not the status above.
        </p>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Movement and location</h2>
        {detail.calculated ? (
          <div className={styles.value}>
            <MovementStatus calculated={detail.calculated} />
          </div>
        ) : null}
        <p className={`${styles.value} ${toneClass[place.tone]}`}>{place.text}</p>
        {position.latitude !== null && position.longitude !== null ? (
          <p className={`${styles.meta} ${styles.coordinates}`}>
            {coordinatesText(position.latitude, position.longitude)} ·{" "}
            {describeReport(position.sourceTimestamp, loadedAt)}
          </p>
        ) : (
          <p className={styles.meta}>
            No position has been reported for this train.
          </p>
        )}
      </section>

      {detail.calculated ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Next stop</h2>
            <div className={styles.value}>
              <NextStopStatus calculated={detail.calculated} stopNames={stopNames} />
            </div>
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Delay trend</h2>
            <div className={styles.value}>
              <DelayTrend
                calculated={detail.calculated}
                officialDelaySeconds={official.delaySeconds ?? stopDelay?.seconds ?? null}
                seriesStopName={trendStopName(detail, stopNames)}
              />
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Movement</h2>
          <p className={styles.value}>
            Movement data isn&rsquo;t available for this train yet.
          </p>
        </section>
      )}

      <ScheduledCalls
        detail={detail}
        stopNames={stopNames}
        timeZone={timeZone}
      />

      <details className={styles.disclosure}>
        <summary className={styles.summary}>Data status</summary>
        <ul className={styles.health} aria-label="Realtime source health">
          {detail.sourceHealth.map((source) => {
            const state = freshnessLabel(source.state);
            return (
              <li key={source.source}>
                <span className={toneClass[state.tone]}>{source.state}</span> ·{" "}
                {source.source} · last received{" "}
                {describeAge(source.receivedAt, loadedAt)}
                {source.signals.length > 0 ? ` · ${source.signals.join(", ")}` : ""}
              </li>
            );
          })}
        </ul>
        <p className={styles.meta}>
          Schedule version {train.scheduleVersion} · evaluated {detail.evaluatedAt}
        </p>
        {detail.calculated ? (
          <ul className={styles.health} aria-label="MARC Now calculation details">
            <li>
              MARC Now movement {detail.calculated.observedMovement.state}
              {reasonText(detail.calculated.observedMovement.reasons)} · stationary
              threshold {detail.calculated.observedMovement.minStationarySeconds}s within{" "}
              {detail.calculated.observedMovement.radiusMeters}m ·{" "}
              {detail.calculated.observedMovement.rejectedCount} observation(s) rejected
            </li>
            <li>
              MARC Now route progress {detail.calculated.routeProgress.state}
              {reasonText(detail.calculated.routeProgress.reasons)} · corridor{" "}
              {detail.calculated.routeProgress.corridorMeters}m · source shape distance
              units {detail.calculated.routeProgress.sourceDistanceUnits}
            </li>
            <li>
              MARC Now next stop {detail.calculated.nextStop.state}
              {reasonText(detail.calculated.nextStop.reasons)}
            </li>
            <li>
              MARC Now delay trend {detail.calculated.officialDelayTrend.state}
              {reasonText(detail.calculated.officialDelayTrend.reasons)} ·{" "}
              {trendScopeLabel(detail.calculated.officialDelayTrend)} ·{" "}
              {detail.calculated.officialDelayTrend.windowSeconds}s window, tolerance{" "}
              {detail.calculated.officialDelayTrend.toleranceSeconds}s ·{" "}
              {detail.calculated.officialDelayTrend.excludedCount} excluded
            </li>
            <li>
              Calculations evaluated {detail.calculated.evaluatedAt}
            </li>
          </ul>
        ) : null}
      </details>


    </>
  );
}

/** The station a stop-level trend was measured at, where the catalog can name it. */
function trendStopName(
  detail: TrainDetail,
  names: Map<string, string>,
): string | null {
  const sequence = detail.calculated?.officialDelayTrend.stopSequence ?? null;
  if (sequence === null) return null;
  const call = detail.scheduledStops.find((stop) => stop.sequence === sequence);
  return call === undefined ? null : (names.get(call.stopId) ?? null);
}

/** A stop's name where the matching-version catalog has one, otherwise its identifier. */
function stopName(
  delay: { stopId: string | null; sequence: number | null },
  names: Map<string, string>,
): string {
  if (delay.stopId === null) {
    return delay.sequence === null ? "one of its stops" : `stop ${delay.sequence}`;
  }
  return names.get(delay.stopId) ?? `stop ${delay.stopId}`;
}

/** Reasons are raw backend vocabulary, so they appear only inside diagnostics. */
function reasonText(reasons: string[]): string {
  return reasons.length === 0 ? "" : ` (${reasons.join(", ")})`;
}

/**
 * Scheduled calls and official estimates, kept in separate columns of the same row.
 *
 * A scheduled time is never replaced by an estimate and no arrival time is computed here:
 * an estimate appears only where the operator published one for that call.
 */
function ScheduledCalls({
  detail,
  stopNames,
  timeZone,
}: {
  detail: TrainDetail;
  stopNames: Map<string, string>;
  timeZone: string;
}) {
  const updates = useMemo(() => {
    const bySequence = new Map<number, (typeof detail.officialStopUpdates)[number]>();
    for (const update of detail.officialStopUpdates) {
      if (update.resolvedSequence !== null) bySequence.set(update.resolvedSequence, update);
    }
    return bySequence;
  }, [detail]);

  const unresolved = detail.officialStopUpdates.filter(
    (update) => update.resolvedSequence === null,
  ).length;

  if (detail.scheduledStops.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stop times</h2>
        <p className={styles.value}>No scheduled stops were published for this train.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Stop times</h2>
      <ul className={styles.calls} aria-label="Scheduled stop times">
        {detail.scheduledStops.map((call) => {
          const update = updates.get(call.sequence);
          const estimate =
            update?.officialEstimatedArrival ?? update?.officialEstimatedDeparture ?? null;
          const scheduled = call.scheduledArrival ?? call.scheduledDeparture;
          const skipped = isReportedSkipped(update?.scheduleRelationship ?? null);
          const note = stopRelationshipLabel(update?.scheduleRelationship ?? null);
          return (
            <li key={call.sequence} className={styles.call}>
              <span className={styles.callTime}>
                {scheduled === null ? "—" : (formatClockTime(scheduled, timeZone) ?? "—")}
              </span>
              <span className={styles.callStop}>
                {stopNames.get(call.stopId) ?? call.stopId}
              </span>
              {estimate !== null ? (
                <span className={styles.estimate}>
                  Official estimate {formatClockTime(estimate, timeZone)}
                </span>
              ) : null}
              {skipped ? (
                <span className={styles.skipped}>Reported skipped</span>
              ) : note !== null && note !== "Scheduled" ? (
                <span className={styles.callNote}>{note}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={styles.meta}>
        Scheduled times are from the published timetable. An official estimate is shown only
        where the operator published one for that stop; nothing here is calculated.
        {unresolved > 0
          ? ` ${unresolved} official update${unresolved === 1 ? "" : "s"} could not be matched to a scheduled stop and ${unresolved === 1 ? "is" : "are"} not shown above.`
          : ""}
      </p>
      {detail.nextStop !== null || detail.nextUpdate !== null ? (
        <p className={styles.meta}>
          More stop information is available than is shown here.
        </p>
      ) : null}
    </section>
  );
}
