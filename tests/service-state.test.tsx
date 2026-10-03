import { describe, expect, it } from "vitest";
import {
  minutesUntil,
  serviceHeadline,
  summariseService,
} from "../lib/presentation/service";
import { parseTrainListPage } from "../lib/api/parse";
import { capturedBody } from "./fixtures/captures";
import type { Train, TrainListPage } from "../lib/types/trains";

const captured = parseTrainListPage(capturedBody("trains"));
const template = captured.data[0];

/** SYNTHETIC: a run with an explicit scheduled window and membership. */
function run(over: {
  id: string;
  start: string;
  end?: string | null;
  scheduledActive?: boolean;
  positionFresh?: boolean;
  delaySeconds?: number | null;
}): Train {
  return {
    ...template,
    id: over.id,
    tripId: over.id,
    scheduled: { ...template.scheduled, start: over.start, end: over.end ?? null },
    official: { ...template.official, delaySeconds: over.delaySeconds ?? null },
    membership: {
      scheduledActive: over.scheduledActive ?? false,
      realtimeObserved: over.positionFresh ?? false,
      positionFresh: over.positionFresh ?? false,
    },
  };
}

const page = (trains: Train[]): TrainListPage => ({ ...captured, data: trains });
const at = (iso: string) => new Date(iso);

describe("service state", () => {
  it("is in service while a run is inside its scheduled window", () => {
    const summary = summariseService(
      page([run({ id: "a", start: "2026-10-03T12:00:00Z", scheduledActive: true })]),
      at("2026-10-03T12:10:00Z"),
    );
    expect(summary.state).toBe("IN_SERVICE");
    expect(serviceHeadline(summary)).toBe("MARC is in service");
  });

  it("is in service for a late train reporting outside its window", () => {
    // The MARC-508 case. Calling this "ended" would hide the train a commuter most wants.
    const summary = summariseService(
      page([run({ id: "late", start: "2026-10-03T10:00:00Z", positionFresh: true })]),
      at("2026-10-03T12:00:00Z"),
    );
    expect(summary.state).toBe("IN_SERVICE");
  });

  it("is between trains before the first departure", () => {
    const summary = summariseService(
      page([run({ id: "a", start: "2026-10-03T13:00:00Z" })]),
      at("2026-10-03T12:00:00Z"),
    );
    expect(summary.state).toBe("BETWEEN_TRAINS");
    expect(summary.next?.id).toBe("a");
  });

  it("is between trains in a gap, and names the next departure", () => {
    const summary = summariseService(
      page([
        run({ id: "past", start: "2026-10-03T08:00:00Z" }),
        run({ id: "soon", start: "2026-10-03T13:00:00Z" }),
        run({ id: "later", start: "2026-10-03T15:00:00Z" }),
      ]),
      at("2026-10-03T12:00:00Z"),
    );
    expect(summary.state).toBe("BETWEEN_TRAINS");
    expect(summary.next?.id).toBe("soon");
  });

  it("has ended once no departure is ahead", () => {
    const summary = summariseService(
      page([run({ id: "a", start: "2026-10-03T08:00:00Z" })]),
      at("2026-10-03T23:00:00Z"),
    );
    expect(summary.state).toBe("ENDED");
    expect(summary.next).toBeNull();
    expect(serviceHeadline(summary)).toMatch(/ended/);
  });

  it("says so when the schedule publishes nothing for the date", () => {
    const summary = summariseService(page([]), at("2026-10-03T12:00:00Z"));
    expect(summary.state).toBe("NONE_SCHEDULED");
  });

  it("handles a service date crossing midnight from its absolute instants", () => {
    // 01:40 local, a run that began the previous evening and one still ahead.
    const summary = summariseService(
      page([
        run({ id: "overnight", start: "2026-10-03T03:00:00Z" }),
        run({ id: "morning", start: "2026-10-03T09:05:00Z" }),
      ]),
      at("2026-10-03T05:40:00Z"),
    );
    expect(summary.state).toBe("BETWEEN_TRAINS");
    expect(summary.next?.id).toBe("morning");
  });

  it("counts facts, and never an active flag", () => {
    const summary = summariseService(
      page([
        run({ id: "a", start: "2026-10-03T12:00:00Z", scheduledActive: true }),
        run({ id: "b", start: "2026-10-03T12:30:00Z", positionFresh: true }),
        run({ id: "c", start: "2026-10-03T13:00:00Z", delaySeconds: 480 }),
      ]),
      at("2026-10-03T12:10:00Z"),
    );
    expect(summary.scheduled).toBe(3);
    expect(summary.reportingNow).toBe(1);
    expect(summary.reportedDelayed).toBe(1);
    expect(summary).not.toHaveProperty("active");
  });

  it("counts no delay when the operator published none", () => {
    const summary = summariseService(
      page([run({ id: "a", start: "2026-10-03T12:00:00Z", scheduledActive: true })]),
      at("2026-10-03T12:10:00Z"),
    );
    // The common case on this feed: MDOT publishes no trip-level delay at all.
    expect(summary.reportedDelayed).toBe(0);
  });

  it("reports minutes until a departure, and nothing for one already gone", () => {
    const soon = run({ id: "a", start: "2026-10-03T12:36:00Z" });
    expect(minutesUntil(soon, at("2026-10-03T12:00:00Z"))).toBe(36);
    expect(minutesUntil(soon, at("2026-10-03T13:00:00Z"))).toBeNull();
  });

  it("never claims a number of trains are running", () => {
    const summary = summariseService(
      page([run({ id: "a", start: "2026-10-03T12:00:00Z", scheduledActive: true })]),
      at("2026-10-03T12:10:00Z"),
    );
    // relevantNow counts scheduled-or-reporting runs; it is not a count of running trains.
    expect(summary.relevantNow).toBe(1);
    expect(serviceHeadline(summary)).not.toMatch(/\d/);
  });
});
