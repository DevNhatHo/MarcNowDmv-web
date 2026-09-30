/**
 * The single request boundary to the backend.
 *
 * Every read goes through here so request construction, cancellation, timeouts, error
 * translation and contract parsing exist once. Requests are same-origin and relative by
 * default: the browser talks to the frontend proxy, never to the backend origin, so no
 * backend CORS change is required and no backend address reaches the browser bundle.
 */
import { BackendError, type Failure } from "./errors";
import { parseWireError } from "./parse";

/** Matches the architecture's 10-second local proxy budget. */
export const defaultTimeoutMs = 10_000;

const defaultBaseUrl = "/api/backend";

export type QueryValues = Record<string, string | number | undefined>;

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface RequestOptions {
  /** Caller cancellation, for unmount or a changed filter. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Injected for deterministic tests; production uses the global fetch. */
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

function baseUrlFrom(options: RequestOptions): string {
  return (
    options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl
  );
}

/** Builds the request target. Values are encoded; an absent value is omitted entirely. */
export function requestUrl(
  base: string,
  path: string,
  query?: QueryValues,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix.length > 0 ? `${base}${path}?${suffix}` : `${base}${path}`;
}

/**
 * Bridges caller cancellation and the timeout into one signal, and remembers which of the
 * two fired so an expired request is not reported as a cancelled one.
 */
function deadline(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeoutMs);
  const relay = () => controller.abort();
  signal?.addEventListener("abort", relay, { once: true });
  return {
    signal: controller.signal,
    expired: () => expired,
    release: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", relay);
    },
  };
}

async function failureFromResponse(response: Response): Promise<Failure> {
  let code = "unexpected_response";
  let detail = `backend returned status ${response.status}`;
  try {
    const envelope = parseWireError(await response.json());
    code = envelope.code;
    detail = envelope.message;
  } catch {
    // A response that is not the documented envelope stays a generic HTTP failure; its
    // body is deliberately not echoed, because unknown upstream text is not safe copy.
  }
  return { kind: "http", status: response.status, code, detail };
}

async function send(
  path: string,
  query: QueryValues | undefined,
  method: "GET" | "HEAD",
  options: RequestOptions,
): Promise<Response> {
  if (options.signal?.aborted) {
    throw new BackendError({ kind: "aborted" });
  }
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const run = options.fetchImpl ?? fetch;
  const bound = deadline(options.signal, timeoutMs);
  try {
    return await run(requestUrl(baseUrlFrom(options), path, query), {
      method,
      signal: bound.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (bound.expired()) throw new BackendError({ kind: "timeout", timeoutMs });
    if (options.signal?.aborted) throw new BackendError({ kind: "aborted" });
    if (error instanceof BackendError) throw error;
    throw new BackendError({ kind: "transport" });
  } finally {
    bound.release();
  }
}

/** Reads one JSON response and parses it against the verified contract. */
export async function requestJson<T>(
  path: string,
  query: QueryValues | undefined,
  parse: (value: unknown) => T,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, query, "GET", options);
  if (!response.ok) throw new BackendError(await failureFromResponse(response));
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new BackendError({
      kind: "contract",
      path,
      detail: "response body was not JSON",
    });
  }
  return parse(body);
}

/** Reads a status without a body, for an availability probe. */
export async function requestStatus(
  path: string,
  options: RequestOptions = {},
): Promise<number> {
  return (await send(path, undefined, "HEAD", options)).status;
}
