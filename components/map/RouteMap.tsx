"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Shape } from "../../lib/types/geometry";
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
  label,
}: {
  shapes: readonly Shape[];
  /** Names what is drawn, for assistive technology and for the visible caption. */
  label: string;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
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
            paint: { "line-color": "#174ea6", "line-width": 3, "line-opacity": 0.9 },
          });
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
        properties: { shapeId: shape.shapeId },
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
  }, [shapes, ready]);

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
      </p>
      <p className={styles.attribution}>
        Route geometry published by MDOT MTA. Drawn exactly as published; no segment is
        estimated.
      </p>
    </>
  );
}
