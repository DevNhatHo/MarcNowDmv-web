"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Shape } from "../../lib/types/geometry";
import type { MapStation, MapTrain } from "../../lib/presentation/markers";
import { drawableTrains, followTarget } from "../../lib/presentation/markers";
import styles from "./RouteMap.module.css";

/**
 * A quiet vector basemap that needs no API key, so there is no credential to manage and no
 * billing relationship. Overridable for a deployment that prefers another provider; an empty
 * value disables the map and leaves the text equivalent, rather than showing a broken canvas.
 */
const styleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

const sourceId = "marc-alignments";
const layerId = "marc-alignments-line";
const stationSourceId = "marc-stations";
const stationLayerId = "marc-stations-point";
const trainSourceId = "marc-trains";
const lastKnownLayerId = "marc-trains-last-known";
const currentLayerId = "marc-trains-current";
const trainLabelLayerId = "marc-trains-label";

const empty = { type: "FeatureCollection", features: [] } as const;

/**
 * The viewer's own motion setting. A camera flight is motion like any other, so follow moves
 * the map instantly when reduced motion is requested rather than gliding to the new position.
 */
function reducedMotion(): boolean {
  if (typeof window === "undefined" || window.matchMedia === undefined) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Current and last-known markers differ by **shape and label**, never by colour alone: a
 * filled disc for a position the backend calls fresh, a hollow ring for one it still holds
 * but does not. Colour reinforces the distinction; it never carries it.
 */
function trainFeatures(trains: readonly MapTrain[], selectedTrainId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: drawableTrains(trains).map((train) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [train.place!.longitude, train.place!.latitude],
      },
      properties: {
        // The backend's own train identity, so the right feature is updated and the right
        // one is emphasised. Never an index.
        trainId: train.id,
        current: train.place!.trust === "CURRENT",
        label: train.label,
        selected: train.id === selectedTrainId,
        // Dimming is a property, not a paint change, so selection is a data update and no
        // layer is added, removed or restyled when the selection changes.
        dimmed: selectedTrainId !== null && train.id !== selectedTrainId,
      },
    })),
  };
}

function stationFeatures(stations: readonly MapStation[]) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [station.longitude, station.latitude],
      },
      properties: { stopId: station.id, name: station.name },
    })),
  };
}

/**
 * Canonical MARC route geometry on a neutral vector basemap.
 *
 * MapLibre is browser-only — it touches `window` at module scope — so it is imported
 * dynamically inside this effect. That keeps it off the server render and out of the bundle
 * of every screen that does not draw a map.
 *
 * This draws **only** what the backend published. No segment is interpolated between points,
 * no straight line substitutes for missing geometry, and nothing here represents a train: a
 * route is where a line goes, not where anything is now.
 *
 * All alignments go into **one GeoJSON source with one line layer**, so changing the line
 * filter is a `setData` call rather than a teardown and rebuild of the map. That is why the
 * map is created in an effect with no data dependency and the geometry is applied in a
 * second one: putting `shapes` on the creating effect would destroy and rebuild the whole
 * map — and re-download its tiles — every time the filter changed.
 */
export default function RouteMap({
  shapes,
  stations,
  trains,
  label,
  selectedTrainId = null,
  selectedShapeId = null,
  follow = false,
  onFollowInterrupted,
}: {
  shapes: readonly Shape[];
  stations: readonly MapStation[];
  /**
   * Train view models, already judged by the presentation layer. The renderer draws what it
   * is given and decides nothing about trust, freshness or movement.
   */
  trains: readonly MapTrain[];
  /** Names what is drawn, for assistive technology and for the visible caption. */
  label: string;
  /** The focused train, or null for the system view. Emphasis is data, never a new layer. */
  selectedTrainId?: string | null;
  /** The focused train's scheduled alignment, emphasised with it. */
  selectedShapeId?: string | null;
  /** Opt-in. The camera follows only a **new fresh observation**, and nothing else. */
  follow?: boolean;
  /** Called when the user pans or zooms, so the screen can pause forced recentring. */
  onFollowInterrupted?: () => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  /**
   * The report the camera last followed. Follow reacts to a *new* observation only, so a
   * re-render, a re-fetch that returns the same report, or an out-of-order older one must
   * not move the camera.
   */
  const followedAt = useRef<number | null>(null);
  // Kept in a ref so the map's gesture listeners, bound once at creation, always call the
  // current callback without the map being torn down when the callback identity changes.
  const interrupted = useRef(onFollowInterrupted);
  useEffect(() => {
    interrupted.current = onFollowInterrupted;
  }, [onFollowInterrupted]);
  const [failed, setFailed] = useState(styleUrl === "");
  const [ready, setReady] = useState(false);

  // Creating the map. No data dependency, so this runs once per mount.
  useEffect(() => {
    const node = container.current;
    if (node === null || styleUrl === "") return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        // v6 loads its tile-parsing worker from a URL, which Turbopack cannot resolve from
        // inside the package; a prebuild step copies the pinned package's own worker into
        // public/ so this URL is explicit and bundler-independent.
        maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
        // The effect can be torn down, or run twice under Strict Mode, while the import is
        // in flight; either way this instance must not be created.
        if (cancelled || container.current === null) return;

        const instance = new maplibre.Map({
          container: node,
          style: styleUrl,
          attributionControl: false,
          // Never steal the page scroll on a phone.
          scrollZoom: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchZoomRotate: true,
        });
        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        // The provider's TileJSON already credits OpenFreeMap, OpenMapTiles and OpenStreetMap,
        // with the copyright link OSM requires, so adding our own text would credit each party
        // twice. A test asserts OpenStreetMap is still named, which fails if a provider stops
        // supplying it rather than letting the obligation lapse silently.
        instance.addControl(new maplibre.AttributionControl({ compact: true }));
        instance.touchZoomRotate.disableRotation();

        instance.on("load", () => {
          if (cancelled) return;
          // The source starts empty and the geometry effect fills it, so the layer exists
          // before any data arrives and never has to be rebuilt.
          instance.addSource(sourceId, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          instance.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#174ea6",
              // Emphasis reads from feature properties, so focusing a train is a data
              // update on the existing layer rather than a restyle or a new overlay.
              "line-width": ["case", ["get", "selected"], 5, 3],
              "line-opacity": ["case", ["get", "dimmed"], 0.25, 0.9],
            },
          });

          // Stations sit above the alignment and below the trains, so a train is never
          // hidden under a station dot.
          instance.addSource(stationSourceId, { type: "geojson", data: empty });
          instance.addLayer({
            id: stationLayerId,
            type: "circle",
            source: stationSourceId,
            paint: {
              "circle-radius": 3,
              "circle-color": "#ffffff",
              "circle-stroke-color": "#5f6368",
              "circle-stroke-width": 1.5,
            },
          });

          // One train source. Two layers read it, filtered on the trust the presentation
          // layer decided, so a freshness change is a data update and never a layer rebuild.
          instance.addSource(trainSourceId, { type: "geojson", data: empty });
          instance.addLayer({
            id: lastKnownLayerId,
            type: "circle",
            source: trainSourceId,
            filter: ["==", ["get", "current"], false],
            paint: {
              // A hollow ring: a different shape, not merely a different colour.
              "circle-radius": ["case", ["get", "selected"], 9, 6],
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-color": "#805600",
              "circle-stroke-width": ["case", ["get", "selected"], 3, 2],
              "circle-opacity": ["case", ["get", "dimmed"], 0.35, 1],
              "circle-stroke-opacity": ["case", ["get", "dimmed"], 0.35, 1],
            },
          });
          instance.addLayer({
            id: currentLayerId,
            type: "circle",
            source: trainSourceId,
            filter: ["==", ["get", "current"], true],
            paint: {
              "circle-radius": ["case", ["get", "selected"], 9, 6],
              "circle-color": "#17633b",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": ["case", ["get", "selected"], 3, 2],
              "circle-opacity": ["case", ["get", "dimmed"], 0.35, 1],
              "circle-stroke-opacity": ["case", ["get", "dimmed"], 0.35, 1],
            },
          });
          instance.addLayer({
            id: trainLabelLayerId,
            type: "symbol",
            source: trainSourceId,
            layout: {
              "text-field": ["get", "label"],
              // The style's own glyph stack. MapLibre's default font is not served by this
              // provider, and asking for it 404s the glyph range and silently drops every
              // label, which looked like working markers with no names.
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              // Never drop a label silently: an unlabelled marker says less than no marker.
              "text-allow-overlap": false,
              "text-optional": true,
            },
            paint: {
              "text-color": "#202124",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
              "text-opacity": ["case", ["get", "dimmed"], 0.4, 1],
            },
          });

          /*
           * The user's own gestures always win. A drag, a zoom or a rotate that came from a
           * real input event pauses forced recentring at once; `easeTo` fires the same
           * events without an `originalEvent`, so the camera never interrupts itself.
           */
          const yieldToUser = (event: { originalEvent?: unknown }) => {
            if (event.originalEvent === undefined) return;
            interrupted.current?.();
          };
          instance.on("dragstart", yieldToUser);
          instance.on("zoomstart", yieldToUser);
          instance.on("rotatestart", yieldToUser);

          map.current = instance;
          setReady(true);
        });

        // Only a failure that prevents the map existing at all replaces it with the text
        // equivalent. MapLibre also fires `error` for a single missing tile or glyph, and
        // blanking a working map over one of those would lose information for no reason.
        instance.on("error", () => {
          // If the style never loaded there is no map to keep, so fall back to the text
          // equivalent. Once it has loaded, a later error is a single tile or glyph and the
          // drawn map stays.
          if (!cancelled && !instance.isStyleLoaded()) setFailed(true);
        });

        // The container is responsive, and MapLibre does not observe it by itself.
        const observer = new ResizeObserver(() => instance.resize());
        observer.observe(node);

        cleanup = () => {
          observer.disconnect();
          map.current = null;
          setReady(false);
          instance.remove();
        };
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Applying the geometry. A filter change lands here as a data update on the existing
  // source, so the map, its style and its loaded tiles all survive it.
  useEffect(() => {
    const instance = map.current;
    if (!ready || instance === null) return;
    const source = instance.getSource<GeoJSONSource>(sourceId);
    if (source === undefined) return;

    source.setData({
      type: "FeatureCollection",
      features: shapes.map((shape) => ({
        type: "Feature" as const,
        // The backend already publishes RFC 7946 geometry, longitude first, which is
        // exactly what a GeoJSON source consumes. Nothing is transformed.
        geometry: shape.geometry,
        properties: {
          shapeId: shape.shapeId,
          selected: shape.shapeId === selectedShapeId,
          dimmed: selectedShapeId !== null && shape.shapeId !== selectedShapeId,
        },
      })),
    });

    // Fit to what was actually published rather than to a guessed extent.
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const shape of shapes) {
      for (const [longitude, latitude] of shape.geometry.coordinates) {
        if (longitude < west) west = longitude;
        if (longitude > east) east = longitude;
        if (latitude < south) south = latitude;
        if (latitude > north) north = latitude;
      }
    }
    if (west <= east && south <= north) {
      instance.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 24, animate: false },
      );
    }
  }, [shapes, selectedShapeId, ready]);

  // Stations change only when a schedule version is activated, so this effect almost never
  // runs; it is separate from the trains effect so a position tick cannot redraw stations.
  useEffect(() => {
    const instance = map.current;
    if (!ready || instance === null) return;
    const source = instance.getSource<GeoJSONSource>(stationSourceId);
    source?.setData(stationFeatures(stations));
  }, [stations, ready]);

  // Train positions, on the polling cadence. This is a `setData` call on an existing source:
  // the map, its style, its tiles, the alignments and the stations are all untouched, and no
  // layer is added or removed when a train appears, moves, goes stale or leaves the list.
  useEffect(() => {
    const instance = map.current;
    if (!ready || instance === null) return;
    const source = instance.getSource<GeoJSONSource>(trainSourceId);
    source?.setData(trainFeatures(trains, selectedTrainId));
  }, [trains, selectedTrainId, ready]);

  /*
   * Follow. Opt-in, and driven only by a **new fresh observation** of the selected train.
   *
   * A stale position stops it: the marker is where the train was last seen, and chasing that
   * would present an old coordinate as somewhere worth looking. An older or repeated report
   * moves nothing, so an out-of-order response cannot rewind the camera.
   *
   * Nothing is interpolated here. The camera moves when an observation arrives and at no
   * other time; the transition between two observations is WEB-MAP-7's.
   */
  useEffect(() => {
    const instance = map.current;
    if (!ready || instance === null) return;
    if (!follow || selectedTrainId === null) {
      followedAt.current = null;
      return;
    }
    const target = followTarget(
      trains.find((candidate) => candidate.id === selectedTrainId),
      followedAt.current,
    );
    if (target === null) return;
    followedAt.current = target.reportedAt;
    instance.easeTo({
      center: target.center,
      // Respect the viewer's own motion setting: a camera flight is motion like any other.
      duration: reducedMotion() ? 0 : 600,
    });
  }, [trains, selectedTrainId, follow, ready]);

  if (failed) {
    return (
      <p className={styles.attribution}>
        The map could not be loaded. The lines below carry the same information.
      </p>
    );
  }
  return (
    <>
      {/*
        * A named region rather than a focusable role="img": the map contains real zoom
        * controls, and an image containing interactive children is a nested-interactive
        * violation. The alignment list below carries the same information in text.
        */}
      <section className={styles.frame} aria-label={label}>
        <div ref={container} className={styles.canvas} />
      </section>
      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} aria-hidden="true" />
          Scheduled route alignment
        </span>
        {/*
          * The key the map plan requires. Current and last-known differ by filled versus
          * hollow — a shape difference the key names in words — so the distinction survives
          * greyscale and colour blindness rather than resting on green against amber.
          */}
        <span className={styles.legendItem}>
          <span className={styles.currentDot} aria-hidden="true" />
          Current position
        </span>
        <span className={styles.legendItem}>
          <span className={styles.lastKnownDot} aria-hidden="true" />
          Last known position
        </span>
        <span className={styles.legendItem}>
          <span className={styles.stationDot} aria-hidden="true" />
          Station
        </span>
      </p>
      <p className={styles.attribution}>
        Route geometry published by MDOT MTA. Drawn exactly as published; no segment is
        estimated.
      </p>
    </>
  );
}
