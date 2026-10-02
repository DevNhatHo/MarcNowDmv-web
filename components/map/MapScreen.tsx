"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchRoutes, fetchShapes, type BackendError } from "../../lib/api";
import type { Route } from "../../lib/types/catalogs";
import type { Shape, ShapePage } from "../../lib/types/geometry";
import { ActionButton, LoadingRows, Notice, describeFailure } from "../Feedback";
import { useSharedResource } from "../useSharedResource";
import RouteMap from "./RouteMap";
import styles from "./MapScreen.module.css";

interface Loaded {
  shapes: ShapePage;
  routes: Route[];
}

/**
 * Geometry is immutable for a schedule version, so it is read on the **catalog** cadence —
 * ten minutes — rather than the thirty-second train cadence. The architecture forbids
 * downloading shapes on every position tick, and this is where that is honoured.
 */
async function loadGeometry(routeId: string | undefined, signal: AbortSignal): Promise<Loaded> {
  const shapes = await fetchShapes({ routeId, limit: 200 }, { signal });
  const routes = await fetchRoutes({ limit: 200 }, { signal });
  return { shapes, routes: routes.data };
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

  const routeNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const route of resource.data?.routes ?? []) {
      const name = route.longName ?? route.shortName;
      if (name !== null) names.set(route.id, name);
    }
    return names;
  }, [resource.data]);

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
        <RouteMap shapes={drawn.shapes} label={drawn.label} />
      ) : null}

      {page && page.data.length > 0 ? (
        <>
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
