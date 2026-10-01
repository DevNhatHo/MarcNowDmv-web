/**
 * Scheduled departures wire contract.
 *
 * SCHEDULED provenance: this describes where a train is booked to go and when it is booked
 * to call, never where it is now. A headsign from here must not be rendered as realtime
 * information or allowed to imply a current claim.
 */
import type { Provenance, ScheduleVersion } from "./common";

export interface Departure {
  tripId: string;
  routeId: string;
  stopId: string;
  stopSequence: number;
  /** `YYYY-MM-DD` here, unlike every other endpoint's `YYYYMMDD`. */
  serviceDate: string;
  /** The operator's published destination for this trip. */
  headsign: string | null;
  /** GTFS clock strings, which may exceed 24:00:00 on a service day. */
  arrivalTime: string | null;
  departureTime: string | null;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  pickupType: number | null;
  timepoint: number | null;
}

export interface DeparturePage {
  scheduleVersion: ScheduleVersion;
  provenance: Provenance;
  data: Departure[];
  nextAfter: string | null;
}
