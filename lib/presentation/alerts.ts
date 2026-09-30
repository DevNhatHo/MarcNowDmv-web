/**
 * Alert presentation.
 *
 * Alert text arrives as nullable translation objects, and cause and effect as nullable
 * GTFS-RT numeric enums. Only documented numbers get a label; anything else is reported as
 * unavailable rather than guessed, because inventing a cause or a severity would turn this
 * service's guess into an apparent operator statement.
 *
 * Nothing here infers which trains an alert affects. A selector is reported at the scope
 * the operator published it, and a route- or agency-wide entity is context, not a claim
 * about one train.
 */
import type { ActivePeriod, AlertSelector, Translated } from "../types/alerts";

/**
 * The best available translation: English first, then the first nonempty alternative.
 * Empty or whitespace-only text counts as absent, so a blank string never renders as
 * content.
 */
export function preferredText(translated: Translated | null): string | null {
  if (translated === null) return null;
  const usable = translated.translation.filter(
    (entry) => entry.text.trim().length > 0,
  );
  const english = usable.find(
    (entry) => entry.language !== null && entry.language.toLowerCase().startsWith("en"),
  );
  return (english ?? usable[0])?.text.trim() ?? null;
}

/**
 * A link the browser may follow. Only http and https are permitted, so a `javascript:`,
 * `data:` or other scheme in feed content cannot become a live link.
 */
export function safeLink(translated: Translated | null): string | null {
  const raw = preferredText(translated);
  if (raw === null) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** GTFS-RT `Alert.Effect`. Undocumented numbers stay unlabelled. */
const effects: Record<number, string> = {
  1: "No service",
  2: "Reduced service",
  3: "Significant delays",
  4: "Detour",
  5: "Additional service",
  6: "Modified service",
  7: "Other effect",
  8: "Effect unknown",
  9: "Stop moved",
  10: "No effect",
  11: "Accessibility issue",
};

/** GTFS-RT `Alert.Cause`. These are the operator's own categories, never inferred. */
const causes: Record<number, string> = {
  1: "Unknown cause",
  2: "Other cause",
  3: "Technical problem",
  4: "Strike",
  5: "Demonstration",
  6: "Accident",
  7: "Holiday",
  8: "Weather",
  9: "Maintenance",
  10: "Construction",
  11: "Police activity",
  12: "Medical emergency",
};

export function effectLabel(effect: number | null): string | null {
  if (effect === null) return null;
  return effects[effect] ?? "Effect not described";
}

export function causeLabel(cause: number | null): string | null {
  if (cause === null) return null;
  return causes[cause] ?? "Cause not described";
}

/**
 * What a selector applies to, worded at the scope the operator published.
 *
 * A route or agency entity deliberately reads as "affects" that whole scope rather than
 * naming a train: the feed does not say which services within it are affected.
 */
export function selectorLabel(
  selector: AlertSelector,
  names: { routes: Map<string, string>; stops: Map<string, string> },
): string {
  const parts: string[] = [];
  if (selector.stopId !== null) {
    parts.push(names.stops.get(selector.stopId) ?? `Stop ${selector.stopId}`);
  }
  if (selector.routeId !== null) {
    parts.push(names.routes.get(selector.routeId) ?? `Line ${selector.routeId}`);
  }
  if (selector.trip?.tripId != null) {
    parts.push(`Trip ${selector.trip.tripId}`);
  }
  if (selector.agencyId !== null && parts.length === 0) {
    parts.push("All MARC services");
  }
  if (selector.routeType !== null && parts.length === 0) {
    parts.push("All services of one mode");
  }
  return parts.length === 0 ? "Scope not described" : parts.join(" · ");
}

/**
 * An active period, allowing for an absent bound at either end. An open end is stated as
 * open rather than filled in with a guess.
 */
export function periodLabel(
  period: ActivePeriod,
  format: (iso: string) => string | null,
): string {
  const start = period.start === null ? null : format(period.start);
  const end = period.end === null ? null : format(period.end);
  if (start === null && end === null) return "No active period given";
  if (start !== null && end === null) return `From ${start}, no end given`;
  if (start === null && end !== null) return `Until ${end}`;
  return `${start} to ${end}`;
}
