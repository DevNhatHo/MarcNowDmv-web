"use client";

import { useCallback, useMemo } from "react";
import { fetchShapes } from "../../lib/api";
import type { Route, Stop } from "../../lib/types/catalogs";
import type { ShapePage } from "../../lib/types/geometry";
import type { Train } from "../../lib/types/trains";
import {
  mapStations,
  mapTrains,
  routeNameMap,
} from "../../lib/presentation/markers";
import { useSharedResource } from "../useSharedResource";
import RouteMap from "./RouteMap";
import styles from "./DetailMap.module.css";

/**
 * This train, on its own scheduled alignment.
 *
 * The map here is **additive and never load-bearing**. Everything it shows — identity,
 * position trust, the age of the report, next stop and movement — is already stated in
 * ordinary markup on this screen, which stays complete if the map never loads at all. That
 * is the accessibility requirement this ticket exists for, not a footnote to it.
 *
 * It reuses the system map's renderer, presentation and markers rather than growing a second
 * map: same source-and-layer discipline, same current-versus-last-known treatment, same
 * transition rules.
 *
 * Geometry is read on the **catalog** cadence and keyed by shape, so it is shared with the
 * system map's own read rather than downloaded again per train, and it is never refetched on
 * the position cadence.
 */
export default function DetailMap({
  train,
  routes,
  stops,
  catalogVersion,
  evaluatedAt,
}: {
  train: Train;
  routes: readonly Route[];
  stops: readonly Stop[];
  /** Names are borrowed only when the catalog shares this train's schedule version. */
  catalogVersion: string | null;
  evaluatedAt: string;
}) {
  const shapeId = train.scheduled.shapeId;
  const load = useCallback(
    (signal: AbortSignal) => fetchShapes({ shapeId: shapeId ?? "", limit: 1 }, { signal }),
    [shapeId],
  );
  const resource = useSharedResource<ShapePage>(
    shapeId === null ? null : `shape:${shapeId}`,
    "catalog",
    load,
  );

  const sameVersion = catalogVersion === train.scheduleVersion;

  const marker = useMemo(() => {
    const at = Date.parse(evaluatedAt);
    const names = sameVersion ? routeNameMap(routes) : new Map<string, string>();
    return mapTrains([train], names, Number.isNaN(at) ? new Date() : new Date(at));
  }, [train, routes, sameVersion, evaluatedAt]);

  const stations = useMemo(
    () => (sameVersion ? mapStations(stops) : []),
    [stops, sameVersion],
  );

  if (shapeId === null) {
    return (
      <p className={styles.note}>
        The schedule publishes no alignment for this train, so there is nothing to draw. That
        is not a statement about whether it is running.
      </p>
    );
  }

  const shapes = resource.data?.data ?? [];
  if (resource.error !== null) {
    return (
      <p className={styles.note}>
        The route geometry could not be read, so no map is shown. Everything about this train
        is above.
      </p>
    );
  }
  if (shapes.length === 0) return null;

  return (
    <RouteMap
      shapes={shapes}
      stations={stations}
      trains={marker}
      label={`Scheduled route for this train, with its last reported position`}
      selectedTrainId={train.id}
      selectedShapeId={shapeId}
    />
  );
}
