/**
 * Time and service-date formatting.
 *
 * Schedule times are shown in the feed timezone, because a commuter reads a timetable in
 * the railway's local time, not the browser's. The timezone comes from the response's own
 * `scheduleVersion.timezone`, so it cannot drift from the schedule being displayed.
 *
 * Ages are rendered from a caller-supplied clock, never from a hidden `Date.now()`, so a
 * test can pin them and a displayed age can never silently advance a duration the backend
 * measured.
 */

/** Feed service dates are `YYYYMMDD` and stay that way at the API boundary. */
export function isServiceDate(value: string): boolean {
  return /^\d{8}$/.test(value) && !Number.isNaN(serviceDateToUtc(value).getTime());
}

function serviceDateToUtc(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject a date the calendar rolled over, such as 20260231.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : new Date(Number.NaN);
}

/** "Mon 29 Sep 2026" for a `YYYYMMDD` service date, or the raw value if it is unusable. */
export function formatServiceDate(value: string): string {
  if (!isServiceDate(value)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(serviceDateToUtc(value));
}

/** The service date for a clock instant, in the feed timezone. */
export function serviceDateIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(now);
  return parts.replaceAll("-", "");
}

/** A clock time in the feed timezone, such as "07:42". */
export function formatClockTime(iso: string, timeZone: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(at);
}

/** The short timezone name, shown wherever a time could otherwise be ambiguous. */
export function timeZoneLabel(iso: string, timeZone: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(at)
    .find((entry) => entry.type === "timeZoneName");
  return part?.value ?? null;
}

/**
 * How old an observation is, as received-at wording.
 *
 * This describes the age of a *response value*, never a duration the backend measured. It
 * is deliberately coarse: a label that ticks every second invites reading precision that
 * the underlying feed does not have.
 */
export function describeAge(iso: string | null, now: Date): string {
  if (iso === null) return "not reported";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "not reported";
  const seconds = Math.round((now.getTime() - at.getTime()) / 1000);
  if (seconds < 0) return "reported ahead of this clock";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Report wording for an evidence timestamp, so a caller never has to concatenate a prefix
 * onto an absence and produce "Reported not reported".
 */
export function describeReport(iso: string | null, now: Date): string {
  const age = describeAge(iso, now);
  return age === "not reported" ? "No report received" : `Reported ${age}`;
}
