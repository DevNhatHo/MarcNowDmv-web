import { describe, expect, it } from "vitest";
import { BackendError } from "../../lib/api/errors";
import {
  parseAlertPage,
  parseHealth,
  parseRoutePage,
  parseStopPage,
  parseTrainDetail,
  parseTrainListPage,
  parseWireError,
} from "../../lib/api/parse";
import { isKnown, freshnessValues } from "../../lib/types/common";
import { movementStates, trainStatuses } from "../../lib/types/trains";
import { capturedBody, mutableBody } from "../fixtures/captures";
import {
  syntheticActiveDetail,
  syntheticEmptyDetail,
  syntheticSparseAlertPage,
  syntheticUnknownEnums,
  syntheticUnresolvedUpdate,
} from "../fixtures/synthetic";

function contractPath(parse: () => unknown): string {
  try {
    parse();
  } catch (error) {
    if (error instanceof BackendError && error.failure.kind === "contract") {
      return error.failure.path;
    }
    throw error;
  }
  throw new Error("expected a contract failure");
}

describe("captured responses", () => {
  it("parses the train list and keeps provenance groups separate", () => {
    const page = parseTrainListPage(capturedBody("trains"));
    expect(page.data).toHaveLength(3);
    expect(page.scheduleVersion.id).toBe("1");
    // Read from the capture rather than hardcoded: the samples are re-captured against the
    // local backend when a contract changes, and the date is not what this test is about.
    expect(page.serviceDate).toMatch(/^\d{8}$/);
    expect(page.nextAfter).not.toBeNull();
    const train = page.data[0];
    expect(train.scheduled.provenance).toBe("SCHEDULED");
    expect(train.official.provenance).toBe("OFFICIAL_REALTIME");
    expect(train.position.provenance).toBe("OFFICIAL_REALTIME");
    // Identifiers stay strings so no precision is lost on a large value.
    expect(typeof train.id).toBe("string");
    expect(typeof train.scheduleVersion).toBe("string");
  });

  it("keeps a retained list row's absent realtime evidence absent", () => {
    // Find the row this test is about rather than assuming it is first, and select it by
    // the backend's own statement that no realtime evidence exists. Position freshness is
    // the wrong predicate: the capture contains a train with a Trip Update and no position,
    // which has evidence.
    const train = parseTrainListPage(capturedBody("trains")).data.find(
      (row) => !row.membership.realtimeObserved,
    );
    expect(train, "the capture contains no row without realtime evidence").toBeDefined();
    if (train === undefined) return;
    expect(train.official.delaySeconds).toBeNull();
    expect(train.official.observationId).toBeNull();
    expect(train.position.latitude).toBeNull();
    expect(train.position.freshness).toBe("UNAVAILABLE");
    // Missing realtime is never promoted to a positive claim.
    expect(train.status).not.toBe("ON_TIME");
  });

  it("keeps a retained coordinate that is observed but not fresh", () => {
    // The case that justifies membership being three facts, and the one WEB-MAP-3 must draw
    // as last-known rather than live: the backend observed this train and still holds a
    // coordinate for it, but the coordinate is not fresh. "Has a position" and "has a
    // current position" are different questions and a map must not answer one with the other.
    const retained = parseTrainListPage(capturedBody("trains")).data.find(
      (row) => row.membership.realtimeObserved && !row.membership.positionFresh,
    );
    expect(retained).toBeDefined();
    if (retained === undefined) return;
    expect(retained.position.latitude).not.toBeNull();
    expect(retained.position.freshness).not.toBe("FRESH");
    // A retained coordinate never becomes a positive claim about the train.
    expect(retained.status).not.toBe("ON_TIME");
  });

  it("carries the map identity and membership the list now publishes", () => {
    // MARC-507 and MARC-508. Membership is three separate facts and must stay that way.
    for (const train of parseTrainListPage(capturedBody("trains")).data) {
      expect(typeof train.membership.scheduledActive).toBe("boolean");
      expect(typeof train.membership.realtimeObserved).toBe("boolean");
      expect(typeof train.membership.positionFresh).toBe("boolean");
      expect(train).not.toHaveProperty("active");
      // Nullable by contract, but typed when present.
      if (train.scheduled.shapeId !== null) {
        expect(typeof train.scheduled.shapeId).toBe("string");
      }
      if (train.scheduled.directionId !== null) {
        expect(typeof train.scheduled.directionId).toBe("number");
      }
    }
  });

  it("parses train detail with the calculated envelope as a sibling of data", () => {
    const detail = parseTrainDetail(capturedBody("train-detail"));
    expect(detail.scheduledStops).toHaveLength(9);
    expect(detail.officialStopUpdates).toHaveLength(9);
    expect(detail.calculated).not.toBeNull();
    expect(detail.calculated?.observedMovement.provenance).toBe("CALCULATED");
    // Envelope cursors are numbers, and unrelated to calculated.nextStop.
    expect(detail.nextStop).toBeNull();
    expect(detail.nextUpdate).toBeNull();
    expect(detail.calculated?.nextStop.state).toBe("UNKNOWN");
  });

  it("preserves a stale retained official status beside a non-current top-level status", () => {
    const detail = parseTrainDetail(capturedBody("train-detail"));
    expect(detail.data.official.observationId).not.toBeNull();
    expect(detail.data.official.sourceTimestamp).not.toBeNull();
    // The published evidence is retained verbatim while the current claim is not ON_TIME.
    expect(detail.data.status).toBe("UNKNOWN");
    expect(detail.data.position.latitude).toBeCloseTo(39.14573287963867, 8);
  });

  it("parses the alerts page, keeping text as nullable translations", () => {
    const page = parseAlertPage(capturedBody("alerts"));
    expect(page.data).toHaveLength(4);
    expect(page.snapshot).toBe("3");
    expect(page.scheduleVersion).toBe("1");
    const alert = page.data[0];
    expect(alert.headerText?.translation[0].text).toContain("Odenton");
    expect(alert.headerText?.translation[0].language).toBeNull();
    expect(alert.informedEntity[0].stopId).toBe("11985");
    expect(alert.cause).toBe(2);
    // Distinct identifiers stay distinct.
    expect(new Set(page.data.map((entry) => entry.id)).size).toBe(4);
  });

  it("parses catalogs and health", () => {
    const routes = parseRoutePage(capturedBody("routes"));
    expect(routes.data).toHaveLength(3);
    expect(routes.provenance).toBe("SCHEDULED");
    const stops = parseStopPage(capturedBody("stops"));
    expect(stops.data).toHaveLength(5);
    expect(stops.nextAfter).toBe("11944");
    const health = parseHealth(capturedBody("health"));
    expect(health.status).toBe("ok");
    expect(health.checks.database).toBe("ok");
  });

  it("parses the error envelope from a rejected query", () => {
    const envelope = parseWireError(capturedBody("invalid-query"));
    expect(envelope.code).toBe("invalid_query");
    expect(envelope.message.length).toBeGreaterThan(0);
  });

  it("parses the large retained service-date page", () => {
    const page = parseTrainListPage(capturedBody("previous-service-date"));
    expect(page.data).toHaveLength(96);
    expect(page.serviceDate).toBe("20260928");
  });

  it("parses the accepted detail cursor page", () => {
    const detail = parseTrainDetail(capturedBody("correct-detail-cursor"));
    expect(detail.scheduledStops[0].sequence).toBeGreaterThan(1);
  });
});

describe("unknown and missing values", () => {
  it("preserves unrecognized enum values instead of rejecting the response", () => {
    const detail = parseTrainDetail(syntheticUnknownEnums());
    expect(detail.data.status).toBe("REROUTED");
    expect(detail.data.official.freshness).toBe("PARTIAL");
    expect(detail.calculated?.observedMovement.state).toBe("DRIFTING");
    expect(detail.calculated?.officialDelayTrend.event).toBe("PASSING");
    expect(detail.sourceHealth[0].state).toBe("RECOVERING");
    // Each is preserved yet reported as not understood, so presentation stays neutral.
    expect(isKnown(trainStatuses, detail.data.status)).toBe(false);
    expect(isKnown(freshnessValues, detail.data.official.freshness)).toBe(false);
    expect(isKnown(movementStates, detail.calculated!.observedMovement.state)).toBe(
      false,
    );
  });

  it("treats a null calculated group and null signals as absence, not failure", () => {
    const detail = parseTrainDetail(syntheticEmptyDetail());
    expect(detail.calculated).toBeNull();
    expect(detail.officialStopUpdates).toEqual([]);
    expect(detail.data.scheduled.end).toBeNull();
    expect(detail.data.official.delaySeconds).toBeNull();
    expect(detail.sourceHealth[0].signals).toEqual([]);
  });

  it("keeps an unresolved official update unresolved", () => {
    const detail = parseTrainDetail(syntheticUnresolvedUpdate());
    const [update] = detail.officialStopUpdates;
    expect(update.resolvedSequence).toBeNull();
    expect(update.stopId).toBeNull();
    expect(update.resolution).toBe("no_matching_stop");
    // An explicit negative delay is a value, not a missing one.
    expect(update.officialDepartureDelaySeconds).toBe(-30);
    expect(update.scheduleRelationship).toBe(1);
  });

  it("parses an alert with no text, selectors or period bounds", () => {
    const page = parseAlertPage(syntheticSparseAlertPage());
    const [alert] = page.data;
    expect(alert.headerText).toBeNull();
    expect(alert.descriptionText).toBeNull();
    expect(alert.url).toBeNull();
    expect(alert.informedEntity).toEqual([]);
    expect(alert.activePeriods).toEqual([{ start: null, end: null }]);
  });

  it("distinguishes an explicit zero delay from a missing one", () => {
    const body = mutableBody("train-detail");
    const official = (body.data as Record<string, unknown>)
      .official as Record<string, unknown>;
    official.delaySeconds = 0;
    expect(parseTrainDetail(body).data.official.delaySeconds).toBe(0);
    official.delaySeconds = null;
    expect(parseTrainDetail(body).data.official.delaySeconds).toBeNull();
  });

  it("never reads shape_dist_traveled as metres", () => {
    const detail = parseTrainDetail(syntheticActiveDetail());
    const progress = detail.calculated!.routeProgress;
    expect(progress.sourceDistanceUnits).toBe("unknown");
    // The source value is a mileage figure; the measured distance is metres. Confusing
    // them would understate progress by three orders of magnitude.
    expect(progress.candidates[0].sourceShapeDistance).toBeCloseTo(19.884, 3);
    expect(progress.alongRouteMeters).toBeCloseTo(32000.5, 1);
    expect(progress.nearest?.offRouteMeters).toBeCloseTo(12.25, 2);
    expect(detail.calculated!.nextStop.units).toBe("meters");
  });

  it("keeps a synthetic stationary interval bounded by its observed times", () => {
    const movement = parseTrainDetail(syntheticActiveDetail()).calculated!
      .observedMovement;
    expect(movement.state).toBe("STATIONARY");
    expect(movement.stationarySeconds).toBe(120);
    expect(movement.observedStart).toBe("2026-09-29T12:03:00Z");
    expect(movement.observedEnd).toBe("2026-09-29T12:05:00Z");
    // Observation ids stay strings, beyond safe integer range.
    expect(movement.observationIds[0]).toBe("9007199254740993");
  });
});

describe("invalid payloads", () => {
  it("reports the path that disagreed with the contract", () => {
    expect(contractPath(() => parseTrainListPage(null))).toBe("trains");
    expect(contractPath(() => parseTrainListPage([]))).toBe("trains");
    const body = mutableBody("trains");
    delete (body.data as Record<string, unknown>[])[1].tripId;
    expect(contractPath(() => parseTrainListPage(body))).toBe("trains.data[1].tripId");
  });

  it("rejects a value of the wrong primitive type", () => {
    const body = mutableBody("train-detail");
    (body.data as Record<string, unknown>).id = 42;
    expect(contractPath(() => parseTrainDetail(body))).toBe("detail.data.id");
    const other = mutableBody("train-detail");
    (
      (other.data as Record<string, unknown>).official as Record<string, unknown>
    ).delaySeconds = "60";
    expect(contractPath(() => parseTrainDetail(other))).toBe(
      "detail.data.official.delaySeconds",
    );
  });

  it("rejects a required list sent as an object", () => {
    const body = mutableBody("train-detail");
    body.scheduledStops = {};
    expect(contractPath(() => parseTrainDetail(body))).toBe("detail.scheduledStops");
  });

  it("rejects a body that is not the error envelope", () => {
    expect(contractPath(() => parseWireError({ message: "nope" }))).toBe("error.error");
  });

  it("carries the contract detail for diagnostics", () => {
    try {
      parseTrainListPage({ evaluatedAt: 1 });
    } catch (error) {
      expect(error).toBeInstanceOf(BackendError);
      const failure = (error as BackendError).failure;
      expect(failure.kind).toBe("contract");
      expect((error as BackendError).message).toContain("trains.evaluatedAt");
    }
  });
});
