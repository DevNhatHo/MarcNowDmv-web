/**
 * Route geometry wire contract.
 *
 * SCHEDULED provenance. A shape describes where a line **goes**, not where any train is;
 * nothing in this contract may be read as a position, and the backend deliberately returns
 * no position, status or freshness field alongside it.
 */
import type { Provenance, ScheduleVersion } from "./common";

/** A GeoJSON position: **longitude first**, then latitude, per RFC 7946. */
export type Position = [longitude: number, latitude: number];

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}

export interface Shape {
  shapeId: string;
  /** Geodesic length, on the same basis the backend's progress measurement uses. */
  lengthMeters: number;
  pointCount: number;
  geometry: LineStringGeometry;
}

export interface ShapePage {
  scheduleVersion: ScheduleVersion;
  provenance: Provenance;
  data: Shape[];
  nextAfter: string | null;
}
