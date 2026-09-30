/**
 * Same-origin proxy to the local backend.
 *
 * The browser reaches `/api/backend/...` on the frontend origin and this forwards the
 * request to the server-only backend origin. Inspected backend responses carried no CORS
 * headers, so the proxy exists to avoid requiring a backend change; it adds no business
 * logic and alters no contract. Upstream status and JSON pass through untouched.
 *
 * The logic lives here rather than in the route handler so it can be tested
 * deterministically with an injected fetch, without a running server.
 */
import { isAllowedPath, upstreamPath } from "./paths";

export const proxyTimeoutMs = 10_000;

const defaultOrigin = "http://localhost:8080";

export interface ProxyRequest {
  method: "GET" | "HEAD";
  /** Already-decoded path segments after `/api/backend`. */
  segments: readonly string[];
  /** Raw query string, with or without a leading `?`. */
  search?: string;
  origin?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
}

function envelope(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Rejects anything that is not a plain HTTP(S) origin, so no other scheme is reachable. */
function resolveOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export async function proxyToBackend(request: ProxyRequest): Promise<Response> {
  const path = upstreamPath(request.segments);
  if (path === null || !isAllowedPath(path)) {
    return envelope(404, "not_found", "unknown path");
  }
  const origin = resolveOrigin(
    request.origin ?? process.env.API_BASE_URL ?? defaultOrigin,
  );
  if (origin === null) {
    return envelope(502, "upstream_unavailable", "backend origin is not usable");
  }
  const search = request.search ? request.search.replace(/^\?/, "") : "";
  const target = new URL(path + (search ? `?${search}` : ""), origin);
  // A path cannot be allowed to change the origin, whatever it contains.
  if (target.origin !== origin.origin) {
    return envelope(502, "upstream_unavailable", "backend origin is not usable");
  }

  const timeoutMs = request.timeoutMs ?? proxyTimeoutMs;
  const run = request.fetchImpl ?? fetch;
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeoutMs);
  const relay = () => controller.abort();
  request.signal?.addEventListener("abort", relay, { once: true });

  let upstream: Response;
  try {
    upstream = await run(target.toString(), {
      method: request.method,
      // Never follow a redirect: the backend contract has none, and following one could
      // leave the configured origin.
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch {
    if (expired) {
      return envelope(504, "upstream_timeout", "backend did not respond in time");
    }
    if (request.signal?.aborted) {
      return envelope(499, "request_cancelled", "request was cancelled");
    }
    return envelope(502, "upstream_unavailable", "backend could not be reached");
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener("abort", relay);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return envelope(502, "upstream_redirect", "backend redirected unexpectedly");
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType !== null) headers.set("Content-Type", contentType);
  // Status and JSON are preserved exactly; a HEAD response keeps its empty body.
  const body = request.method === "HEAD" ? null : await upstream.text();
  return new Response(body, { status: upstream.status, headers });
}
