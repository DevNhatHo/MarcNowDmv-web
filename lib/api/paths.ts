/**
 * The upstream paths this frontend is allowed to reach.
 *
 * The proxy and the client share this list so an allowed path cannot drift from a
 * requested one. The backend exposes no individual route or stop endpoint, so
 * `/api/v1/routes/{id}` is deliberately absent and is refused here rather than forwarded
 * to produce a 404 upstream.
 */

export const backendPaths = {
  health: "/health",
  routes: "/api/v1/routes",
  stops: "/api/v1/stops",
  trains: "/api/v1/trains",
  alerts: "/api/v1/alerts",
  departures: "/api/v1/departures",
} as const;

const exactPaths: readonly string[] = Object.values(backendPaths);

/** Train detail is the only path with a variable segment. */
const trainDetailPrefix = `${backendPaths.trains}/`;

/**
 * A single decoded path segment must not be able to change the meaning of the path.
 * Next.js decodes percent-escapes before a handler sees them, so a segment that contains
 * a separator, a traversal or a control character is refused rather than re-joined.
 */
export function isSafeSegment(segment: string): boolean {
  if (segment.length === 0 || segment.length > 512) return false;
  if (segment === "." || segment === "..") return false;
  if (segment.includes("/") || segment.includes("\\")) return false;
  return !/[\u0000-\u001f\u007f]/.test(segment);
}

/** Builds an upstream path from decoded segments, or null when any segment is unsafe. */
export function upstreamPath(segments: readonly string[]): string | null {
  if (segments.length === 0) return null;
  if (!segments.every(isSafeSegment)) return null;
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

/**
 * True for a path the verified contract defines. The train identifier is opaque and
 * percent-encoded, so the comparison is made against the encoded form.
 */
export function isAllowedPath(path: string): boolean {
  if (exactPaths.includes(path)) return true;
  if (!path.startsWith(trainDetailPrefix)) return false;
  const identifier = path.slice(trainDetailPrefix.length);
  return identifier.length > 0 && !identifier.includes("/");
}

/** The detail path for one opaque train identifier. */
export function trainDetailPath(id: string): string {
  return `${trainDetailPrefix}${encodeURIComponent(id)}`;
}
