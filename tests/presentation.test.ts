import { describe, expect, it } from "vitest";
import {
  coordinatesText,
  delayLabel,
  freshnessLabel,
  isReportedSkipped,
  positionLabel,
  stopRelationshipLabel,
  trainStatusLabel,
  tripRelationshipLabel,
} from "../lib/presentation/status";
import {
  describeAge,
  describeReport,
  formatClockTime,
  formatServiceDate,
  isServiceDate,
  serviceDateIn,
  timeZoneLabel,
} from "../lib/presentation/time";

describe("status vocabulary", () => {
  it("never lets an absent or unknown status read as a positive claim", () => {
    expect(trainStatusLabel("ON_TIME")).toEqual({ text: "On time", tone: "positive" });
    for (const status of ["UNKNOWN", "STALE"]) {
      const label = trainStatusLabel(status);
      expect(label.tone).toBe("unknown");
      expect(label.text).not.toMatch(/on time/i);
    }
    // A state this frontend has never seen must not be rendered raw or treated as healthy.
    const future = trainStatusLabel("HELD_AT_STATION");
    expect(future).toEqual({ text: "Realtime status unavailable", tone: "unknown" });
    expect(trainStatusLabel("CANCELED").tone).toBe("critical");
  });

  it("distinguishes a published zero delay from no published delay", () => {
    expect(delayLabel(null)).toBe("No delay reported");
    expect(delayLabel(0)).toBe("No delay");
    expect(delayLabel(null)).not.toBe(delayLabel(0));
  });

  it("states delay size and direction", () => {
    expect(delayLabel(420)).toBe("7 min late");
    expect(delayLabel(-90)).toBe("1 min 30 sec early");
    expect(delayLabel(45)).toBe("45 sec late");
    expect(delayLabel(3600)).toBe("60 min late");
  });

  it("describes a stale coordinate as last reported, never as where the train is", () => {
    expect(positionLabel(39.1, -76.6, "FRESH").text).toBe("Reported location");
    for (const freshness of ["STALE", "UNKNOWN", "UNAVAILABLE", "SUPERSEDED"]) {
      expect(positionLabel(39.1, -76.6, freshness).text).toBe("Last reported location");
    }
    expect(positionLabel(null, null, "FRESH").text).toBe("Position unavailable");
    expect(positionLabel(39.1, null, "FRESH").text).toBe("Position unavailable");
  });

  it("renders coordinates without inferring a place", () => {
    const text = coordinatesText(39.14573287963867, -76.61579895019531);
    expect(text).toBe("39.14573, -76.61580");
    expect(text).not.toMatch(/[A-Za-z]/);
  });

  it("labels numeric schedule relationships and refuses to guess unknown ones", () => {
    expect(tripRelationshipLabel(null)).toBeNull();
    expect(tripRelationshipLabel(0)).toBe("Scheduled");
    expect(tripRelationshipLabel(2)).toBe("Not operating");
    expect(stopRelationshipLabel(1)).toBe("Reported skipped");
    expect(stopRelationshipLabel(2)).toBe("No data reported");
    // An undocumented number is reported unavailable rather than invented.
    expect(stopRelationshipLabel(97)).toBe("Reported status unavailable");
    expect(tripRelationshipLabel(97)).toBe("Reported status unavailable");
    expect(isReportedSkipped(1)).toBe(true);
    expect(isReportedSkipped(0)).toBe(false);
    expect(isReportedSkipped(null)).toBe(false);
  });

  it("never marks a degraded or unknown feed as healthy", () => {
    expect(freshnessLabel("FRESH").tone).toBe("positive");
    expect(freshnessLabel("STALE").tone).toBe("warning");
    expect(freshnessLabel("UNAVAILABLE").tone).toBe("unknown");
    expect(freshnessLabel("DEGRADED").tone).toBe("unknown");
  });
});

describe("service dates and times", () => {
  it("validates YYYYMMDD and rejects a rolled-over date", () => {
    expect(isServiceDate("20260929")).toBe(true);
    expect(isServiceDate("20260231")).toBe(false);
    expect(isServiceDate("2026-09-29")).toBe(false);
    expect(isServiceDate("")).toBe(false);
  });

  it("formats a service date and passes an unusable one through", () => {
    expect(formatServiceDate("20260929")).toBe("Tue, 29 Sept 2026");
    expect(formatServiceDate("nonsense")).toBe("nonsense");
  });

  it("reads clock times in the feed timezone, not the browser's", () => {
    // 02:38 UTC is the previous evening in the MARC service area.
    const iso = "2026-09-30T02:38:19Z";
    expect(formatClockTime(iso, "America/New_York")).toBe("22:38");
    expect(formatClockTime(iso, "UTC")).toBe("02:38");
    expect(timeZoneLabel(iso, "America/New_York")).toBe("EDT");
    expect(formatClockTime("not a time", "UTC")).toBeNull();
  });

  it("derives the service date in the feed timezone", () => {
    // Just after midnight UTC is still the previous service date in New York.
    const justAfterUtcMidnight = new Date("2026-09-30T02:00:00Z");
    expect(serviceDateIn("America/New_York", justAfterUtcMidnight)).toBe("20260929");
    expect(serviceDateIn("UTC", justAfterUtcMidnight)).toBe("20260930");
  });

  it("describes evidence age against a supplied clock, never a hidden one", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(describeAge(null, now)).toBe("not reported");
    expect(describeAge("2026-09-29T11:59:40Z", now)).toBe("just now");
    expect(describeAge("2026-09-29T11:52:00Z", now)).toBe("8 min ago");
    expect(describeAge("2026-09-29T09:00:00Z", now)).toBe("3 hr ago");
    expect(describeAge("2026-09-27T12:00:00Z", now)).toBe("2 days ago");
    expect(describeAge("2026-09-28T12:00:00Z", now)).toBe("1 day ago");
    // Evidence stamped ahead of the clock is stated, not silently shown as current.
    expect(describeAge("2026-09-29T12:05:00Z", now)).toBe("reported ahead of this clock");
    expect(describeAge("nonsense", now)).toBe("not reported");
  });

  it("never concatenates a report prefix onto an absence", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(describeReport(null, now)).toBe("No report received");
    expect(describeReport("nonsense", now)).toBe("No report received");
    expect(describeReport("2026-09-29T11:52:00Z", now)).toBe("Reported 8 min ago");
    // The defect this guards against read "Reported not reported" in the live list.
    expect(describeReport(null, now)).not.toMatch(/reported not reported/i);
  });
});
