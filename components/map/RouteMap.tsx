"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Shape } from "../../lib/types/geometry";
import styles from "./RouteMap.module.css";

/**
 * Canonical MARC route geometry on a neutral background.
 *
 * Leaflet is imported dynamically inside an effect so it never reaches a server render and
 * never enters the bundle of a screen that does not draw a map. It touches `window` at
 * module scope, so a static import would break the build.
 *
 * This draws **only** what the backend published. No segment is interpolated between
 * points, no straight line substitutes for missing geometry, and nothing here represents a
 * train: a route is where a line goes, not where anything is now.
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = container.current;
    if (node === null || shapes.length === 0) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const leaflet = await import("leaflet");
        // The effect can be torn down while the import is in flight.
        if (cancelled || container.current === null) return;
        const map = leaflet.map(node, {
          // Restrained controls, as the plan requires: zoom only.
          zoomControl: true,
          attributionControl: false,
          // Never steal the page scroll on a phone.
          scrollWheelZoom: false,
          keyboard: true,
        });
        const lines = shapes.map((shape) =>
          leaflet.polyline(
            // GeoJSON is longitude-first; Leaflet takes latitude first. Swapping here, once,
            // is the only place the two orders meet.
            shape.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
            { color: "#174ea6", weight: 3, opacity: 0.9 },
          ).addTo(map),
        );
        const bounds = lines.reduce(
          (acc: ReturnType<typeof leaflet.latLngBounds> | null, line) =>
            acc === null ? line.getBounds() : acc.extend(line.getBounds()),
          null,
        );
        if (bounds !== null && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [16, 16] });
        }
        cleanup = () => map.remove();
      } catch {
        // A map that cannot load must not take the page with it.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [shapes]);

  if (failed) {
    return (
      <p className={styles.attribution}>
        The map could not be loaded. The route list below has the same information.
      </p>
    );
  }
  return (
    <>
      {/*
        * A named region rather than a focusable role="img". Leaflet puts real zoom controls
        * inside this container, and an image that contains interactive children is a
        * nested-interactive violation; the controls keep their own focus handling, and the
        * alignment list below carries the same information in text.
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
        estimated. Map rendering by Leaflet.
      </p>
    </>
  );
}
