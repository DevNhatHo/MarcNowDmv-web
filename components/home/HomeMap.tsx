"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { fetchShapes, fetchStops } from "../../lib/api";
import type { Route, Stop } from "../../lib/types/catalogs";
import type { ShapePage } from "../../lib/types/geometry";
import type { Train } from "../../lib/types/trains";
import { mapStations, mapTrains, routeNameMap } from "../../lib/presentation/markers";
import { useSharedResource } from "../useSharedResource";
import RouteMap from "../map/RouteMap";
import styles from "./Home.module.css";

interface Geometry {
  shapes: ShapePage;
  stops: Stop[];
}

/**
 * Geometry for the home composition, on the **catalog** cadence.
 *
 * This is the only read the composition adds. The trains it draws are the page the Pulse
 * screen already fetched and passes in, so markers cost nothing: no request per marker, and no
 * second train read.
 */
async function loadGeometry(signal: AbortSignal): Promise<Geometry> {
  const shapes = await fetchShapes({ limit: 200 }, { signal });
  const stops = await fetchStops({ limit: 200 }, { signal });
  return { shapes, stops: stops.data };
}

/**
 * The map panel of the desktop composition.
 *
 * It renders the same `RouteMap` the map screen does, with the same markers and the same trust
 * rules — there is no second map. Selection, focus and follow stay on `/map`, and the panel
 * links there rather than reimplementing them.
 */
export default function HomeMap({
  trains,
  routes,
  evaluatedAt,
}: {
  trains: readonly Train[];
  /** Supplied by the screen, which already read the catalog. Refetching it here would make
   * the composition cost more than the screens it composes. */
  routes: readonly Route[];
  evaluatedAt: string;
}) {
  const load = useCallback((signal: AbortSignal) => loadGeometry(signal), []);
  const resource = useSharedResource<Geometry>("home-geometry", "catalog", load);

  const names = useMemo(() => routeNameMap(routes), [routes]);
  const stations = useMemo(() => mapStations(resource.data?.stops ?? []), [resource.data]);
  const markers = useMemo(() => {
    const at = Date.parse(evaluatedAt);
    return mapTrains(trains, names, Number.isNaN(at) ? new Date() : new Date(at));
  }, [trains, names, evaluatedAt]);

  const shapes = resource.data?.shapes.data ?? [];

  return (
    <section className={styles.mapPanel} aria-label="Where the MARC lines run">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Map</h2>
        <Link href="/map" className={styles.panelLink}>
          Open the full map →
        </Link>
      </div>
      {resource.error !== null ? (
        <p className={styles.panelNote}>
          The route geometry could not be read, so no map is shown here. Everything else on
          this screen is unaffected.
        </p>
      ) : shapes.length === 0 ? (
        <p className={styles.panelNote}>Loading the published route alignments…</p>
      ) : (
        <RouteMap
          shapes={shapes}
          stations={stations}
          trains={markers}
          label="Scheduled MARC route alignments, with reported train positions"
        />
      )}
    </section>
  );
}
