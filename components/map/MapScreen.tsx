"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchRoutes,
  fetchShapes,
  fetchStops,
  fetchTrains,
  type BackendError,
} from "../../lib/api";
import type { Route, Stop } from "../../lib/types/catalogs";
import type { Shape, ShapePage } from "../../lib/types/geometry";
import type { TrainListPage } from "../../lib/types/trains";
import {
  currentCount,
  mapStations,
  mapTrains,
  routeNameMap,
  type MapTrain,
} from "../../lib/presentation/markers";
import { ActionButton, LoadingRows, Notice, describeFailure } from "../Feedback";
import { useSharedResource } from "../useSharedResource";
import RouteMap from "./RouteMap";
import TrainMarkerList from "./TrainMarkerList";
import FocusSection from "./FocusSection";
import styles from "./MapScreen.module.css";

interface Loaded {
  shapes: ShapePage;
  routes: Route[];
  stops: Stop[];
}

/**
 * Geometry is immutable for a schedule version, so it is read on the **catalog** cadence —
 * ten minutes — rather than the thirty-second train cadence. The architecture forbids
 * downloading shapes on every position tick, and this is where that is honoured.
 */
async function loadGeometry(routeId: string | undefined, signal: AbortSignal): Promise<Loaded> {
  const shapes = await fetchShapes({ routeId, limit: 200 }, { signal });
  const routes = await fetchRoutes({ limit: 200 }, { signal });
  const stops = await fetchStops({ limit: 200 }, { signal });
  return { shapes, routes: routes.data, stops: stops.data };
}

/**
 * Train positions, read on the **trains** cadence — thirty seconds — from the single list
 * the app already uses. One bounded request covers every marker: there is deliberately no
 * per-train read here, and none may be added.
 */
async function loadTrains(
  routeId: string | undefined,
  signal: AbortSignal,
): Promise<TrainListPage> {
  return fetchTrains({ routeId, limit: 200 }, { signal });
}

export default function MapScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const routeId = params.get("routeId") ?? undefined;
  const load = useCallback(
    (signal: AbortSignal) => loadGeometry(routeId, signal),
    [routeId],
  );
  const resource = useSharedResource<Loaded>(`map:${routeId ?? "all"}`, "catalog", load);
  const page = resource.data?.shapes;

  const loadTrainPage = useCallback(
    (signal: AbortSignal) => loadTrains(routeId, signal),
    [routeId],
  );
  const trainResource = useSharedResource<TrainListPage>(
    `map-trains:${routeId ?? "all"}`,
    "trains",
    loadTrainPage,
  );

  const routeNames = useMemo(
    () => routeNameMap(resource.data?.routes ?? []),
    [resource.data],
  );

  const stations = useMemo(
    () => mapStations(resource.data?.stops ?? []),
    [resource.data],
  );

  /*
   * Selection lives in the URL, so a focused train is a shareable link and the browser's own
   * Back button leaves focus. Nothing about the selection is kept in component state that a
   * reload would lose.
   */
  const selectedId = params.get("trainId");

  const [follow, setFollow] = useState(false);
  const [followPaused, setFollowPaused] = useState(false);

  /*
   * The viewer's gesture wins immediately and without argument. Stable identity, so the map's
   * listeners can be bound once at creation and never cause a teardown.
   */
  const pauseFollow = useCallback(() => setFollowPaused(true), []);

  /*
   * One evaluation clock for the whole render, taken from the response that produced these
   * trains rather than from the wall clock, so every "reported N min ago" on screen is aged
   * against the same instant the backend evaluated.
   */
  const trains = useMemo<MapTrain[]>(() => {
    const data = trainResource.data;
    if (data === undefined || data === null) return [];
    const evaluatedAt = Date.parse(data.evaluatedAt);
    const now = Number.isNaN(evaluatedAt) ? new Date() : new Date(evaluatedAt);
    return mapTrains(data.data, routeNames, now);
  }, [trainResource.data, routeNames]);

  const selectedTrain = useMemo(
    () => trains.find((train) => train.id === selectedId) ?? null,
    [trains, selectedId],
  );

  /*
   * Leaving focus restores the system view with the line filter intact, so exiting does not
   * also throw away the filter the reader chose.
   */
  const mapHref = (trainId: string | null) => {
    const query = new URLSearchParams();
    if (routeId !== undefined) query.set("routeId", routeId);
    if (trainId !== null) query.set("trainId", trainId);
    const search = query.toString();
    return search === "" ? "/map" : `/map?${search}`;
  };

  const setRoute = (value: string) => {
    router.replace(value === "" ? "/map" : `/map?routeId=${encodeURIComponent(value)}`);
  };

  const selected = routeId === undefined ? null : (routeNames.get(routeId) ?? `Line ${routeId}`);

  /*
   * Changing the line changes the resource key, so the next page starts undefined. Rendering
   * that gap would unmount the map and rebuild it — style, controls and tiles — on every
   * filter change, which is exactly what one source and one layer exist to avoid. So the last
   * drawn geometry stays on screen until the next arrives.
   *
   * The label is stored with the geometry it describes, never recomputed from the pending
   * filter, so the map cannot name a line it is not currently drawing.
   */
  const [drawn, setDrawn] = useState<{ shapes: readonly Shape[]; label: string } | null>(null);
  const [applied, setApplied] = useState<ShapePage | undefined>(undefined);
  if (page !== undefined && page !== applied) {
    // React's documented adjust-during-render pattern rather than an effect: this must be
    // settled before the map renders, or the map would still see one frame of the gap and
    // tear itself down.
    setApplied(page);
    if (page.data.length > 0) {
      setDrawn({
        shapes: page.data,
        label: `Scheduled route alignments for ${selected ?? "all MARC lines"}`,
      });
    }
  }
  const totalKm = useMemo(
    () => (page ? page.data.reduce((sum, shape) => sum + shape.lengthMeters, 0) / 1000 : 0),
    [page],
  );

  return (
    <div className={styles.screen}>
      <p className={styles.question}>Where do the MARC lines run?</p>
      <h1 className={styles.title}>Map</h1>
      <p className={styles.scope}>
        Scheduled route alignments as published by the operator. This shows where the lines
        run, not where any train is now.
      </p>

      <div className={styles.controls}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="routeId">
            Line
          </label>
          <select
            id="routeId"
            className={styles.control}
            value={routeId ?? ""}
            onChange={(event) => setRoute(event.target.value)}
          >
            <option value="">All lines</option>
            {(resource.data?.routes ?? []).map((route) => (
              <option key={route.id} value={route.id}>
                {route.longName ?? route.shortName ?? route.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {resource.loading && !page ? (
        <LoadingRows count={2} label="Loading route geometry" />
      ) : null}

      {resource.error ? (
        <GeometryFailure error={resource.error} onRetry={resource.refresh} />
      ) : null}

      {page && page.data.length === 0 ? (
        <Notice title="No route geometry published">
          The schedule publishes no alignment for{" "}
          {selected ?? "any line"}, so there is nothing to draw. This is not a statement
          about whether trains are running.
        </Notice>
      ) : null}

      {drawn && !(page && page.data.length === 0) ? (
        <RouteMap
          shapes={drawn.shapes}
          stations={stations}
          trains={trains}
          label={drawn.label}
          selectedTrainId={selectedId}
          selectedShapeId={selectedTrain?.shapeId ?? null}
          follow={follow && !followPaused}
          onFollowInterrupted={pauseFollow}
        />
      ) : null}

      {selectedId !== null && selectedTrain !== null ? (
        <FocusSection
          id={selectedId}
          train={selectedTrain}
          stops={resource.data?.stops ?? []}
          follow={follow}
          onFollowChange={(next) => {
            setFollow(next);
            // Choosing to follow again is the deliberate resume the map plan requires.
            setFollowPaused(false);
          }}
          followPaused={followPaused}
          exitHref={mapHref(null)}
          detailHref={`/trains/${encodeURIComponent(selectedId)}`}
        />
      ) : null}

      {selectedId !== null && selectedTrain === null && trainResource.data ? (
        <Notice title="That train is not on this view">
          No train with that identifier is in the current service date and line filter. It may
          have finished, or the filter may exclude it.{" "}
          <Link href={mapHref(null)}>Exit focus</Link>.
        </Notice>
      ) : null}

      {page && page.data.length > 0 ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Trains</h2>
            {/*
              * What this count is, exactly: positions the backend calls fresh. It is not a
              * count of trains running, which this service cannot determine, and a
              * last-known marker is never included in it.
              */}
            <p className={styles.caption}>
              {trainResource.error !== null
                ? "Train positions could not be read, so none are drawn. The lines below are unaffected."
                : trains.length === 0
                  ? "No train positions are published for this service date yet."
                  : `${currentCount(trains)} of ${trains.length} trains report a current position. The rest are drawn where they were last reported, or are not drawn at all.`}
            </p>
            <TrainMarkerList
              trains={trains}
              serviceDate={trainResource.data?.serviceDate ?? ""}
              routeId={routeId}
              selectedId={selectedId}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Lines</h2>
            {/*
              * The text equivalent of the map is the set of lines, not the set of shape
              * identifiers. A shape id is an ingestion detail that means nothing to a
              * commuter, and the operator publishes several alignments per line for its
              * directions and variants, so listing them all is a wall of near-duplicates.
              * The identifiers remain available in the disclosure below.
              */}
            <ul className={styles.routes} aria-label="MARC lines">
              {(resource.data?.routes ?? []).map((route) => (
                <li key={route.id} className={styles.route}>
                  <Link
                    href={`/map?routeId=${encodeURIComponent(route.id)}`}
                    className="standalone-link"
                  >
                    {route.longName ?? route.shortName ?? `Line ${route.id}`}
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              {page.data.length === 1
                ? `One alignment is drawn, from schedule version ${page.scheduleVersion.id}.`
                : `${page.data.length} alignments are drawn, totalling ${totalKm.toFixed(0)} km, from schedule version ${page.scheduleVersion.id}.`}{" "}
              A line publishes a separate alignment for each direction and variant, so the
              total counts the same track more than once and is not the length of the
              network.
            </p>
            <details className={styles.disclosure}>
              <summary className={styles.summary}>Alignment details</summary>
              <ul className={styles.alignments} aria-label="Route alignments">
                {page.data.map((shape) => (
                  <li key={shape.shapeId}>
                    Shape {shape.shapeId} · {(shape.lengthMeters / 1000).toFixed(1)} km ·{" "}
                    {shape.pointCount} points
                  </li>
                ))}
              </ul>
            </details>
            <p className={styles.note}>
              <Link href="/trains" className="standalone-link">
                See trains scheduled today
              </Link>
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function GeometryFailure({
  error,
  onRetry,
}: {
  error: BackendError;
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
