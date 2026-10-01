import { describe, expect, it, vi } from "vitest";
import { isAllowedPath, isSafeSegment, trainDetailPath, upstreamPath } from "../../lib/api/paths";
import { proxyToBackend } from "../../lib/api/proxy";
import * as route from "../../app/api/backend/[...path]/route";
import { capture } from "../fixtures/captures";

const origin = "http://127.0.0.1:8080";

function upstream(body: unknown, status = 200, contentType = "application/json") {
  const calls: string[] = [];
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": contentType },
    });
  };
  return { fetchImpl, calls };
}

async function envelopeOf(response: Response): Promise<{ code: string }> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error;
}

describe("path allowlist", () => {
  it("allows exactly the verified contract paths", () => {
    for (const path of [
      "/health",
      "/api/v1/routes",
      "/api/v1/stops",
      "/api/v1/trains",
      "/api/v1/alerts",
      "/api/v1/departures",
      "/api/v1/trains/abc123",
    ]) {
      expect(isAllowedPath(path)).toBe(true);
    }
  });

  it("refuses paths the backend does not define", () => {
    for (const path of [
      // No individual route or stop endpoint exists; the capture proves it 404s.
      "/api/v1/routes/MARC-PENN",
      "/api/v1/stops/11985",
      "/api/v1/trains/abc/extra",
      "/api/v2/trains",
      "/metrics",
      "/",
      "/api/v1/trains/",
    ]) {
      expect(isAllowedPath(path)).toBe(false);
    }
  });

  it("refuses a segment that could change the meaning of the path", () => {
    for (const segment of ["", "..", ".", "a/b", "a\\b", "a\u0000b", "line\nbreak"]) {
      expect(isSafeSegment(segment)).toBe(false);
    }
    expect(upstreamPath(["api", "v1", ".."])).toBeNull();
    expect(upstreamPath([])).toBeNull();
    expect(upstreamPath(["api", "v1", "trains"])).toBe("/api/v1/trains");
  });

  it("encodes an opaque identifier into the detail path", () => {
    expect(trainDetailPath("a/b=c")).toBe("/api/v1/trains/a%2Fb%3Dc");
    expect(isAllowedPath(trainDetailPath("a/b=c"))).toBe(true);
  });
});

describe("forwarding", () => {
  it("preserves upstream status, JSON and content type", async () => {
    const body = capture("trains").body;
    const { fetchImpl, calls } = upstream(body);
    const response = await proxyToBackend({
      method: "GET",
      segments: ["api", "v1", "trains"],
      search: "?limit=3",
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual(body);
    expect(calls[0]).toBe("http://127.0.0.1:8080/api/v1/trains?limit=3");
  });

  it("preserves a rejected query verbatim", async () => {
    const rejected = capture("invalid-query");
    const { fetchImpl } = upstream(rejected.body, 400);
    const response = await proxyToBackend({
      method: "GET",
      segments: ["api", "v1", "trains"],
      search: "limit=bad",
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(400);
    expect((await envelopeOf(response)).code).toBe("invalid_query");
  });

  it("forwards an encoded train identifier without decoding it into the path", async () => {
    const { fetchImpl, calls } = upstream(capture("train-detail").body);
    await proxyToBackend({
      method: "GET",
      // Next.js hands the handler decoded segments, so re-encoding is required.
      segments: ["api", "v1", "trains", "abc/def=ghi"],
      origin,
      fetchImpl,
    });
    expect(calls).toHaveLength(0);
    const allowed = await proxyToBackend({
      method: "GET",
      segments: ["api", "v1", "trains", "abc-def_ghi="],
      origin,
      fetchImpl,
    });
    expect(allowed.status).toBe(200);
    expect(calls[0]).toBe("http://127.0.0.1:8080/api/v1/trains/abc-def_ghi%3D");
  });

  it("returns an empty body for HEAD while keeping the status", async () => {
    const { fetchImpl } = upstream(null, 200);
    const response = await proxyToBackend({
      method: "HEAD",
      segments: ["health"],
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("refuses an unknown path without contacting the backend", async () => {
    const { fetchImpl, calls } = upstream({});
    const response = await proxyToBackend({
      method: "GET",
      segments: ["api", "v1", "routes", "MARC-PENN"],
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(404);
    expect((await envelopeOf(response)).code).toBe("not_found");
    expect(calls).toHaveLength(0);
  });

  it("exposes only GET and HEAD, so any other method is rejected by the framework", () => {
    expect(typeof route.GET).toBe("function");
    expect(typeof route.HEAD).toBe("function");
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(method in route).toBe(false);
    }
  });
});

describe("unsafe upstream behaviour", () => {
  it("does not follow a redirect", async () => {
    const fetchImpl = async () =>
      new Response(null, { status: 302, headers: { Location: "http://elsewhere/" } });
    const response = await proxyToBackend({
      method: "GET",
      segments: ["api", "v1", "trains"],
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(502);
    expect((await envelopeOf(response)).code).toBe("upstream_redirect");
  });

  it("refuses an origin that is not plain HTTP", async () => {
    const { fetchImpl, calls } = upstream({});
    for (const bad of ["file:///etc/passwd", "not-a-url", "ftp://localhost"]) {
      const response = await proxyToBackend({
        method: "GET",
        segments: ["health"],
        origin: bad,
        fetchImpl,
      });
      expect(response.status).toBe(502);
      expect((await envelopeOf(response)).code).toBe("upstream_unavailable");
    }
    expect(calls).toHaveLength(0);
  });

  it("reports an unreachable backend as 502 without leaking the reason", async () => {
    const fetchImpl = async () => {
      throw new TypeError("connect ECONNREFUSED 127.0.0.1:8080");
    };
    const response = await proxyToBackend({
      method: "GET",
      segments: ["health"],
      origin,
      fetchImpl,
    });
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).not.toContain("ECONNREFUSED");
  });

  it("reports an expired upstream request as 504", async () => {
    vi.useFakeTimers();
    const fetchImpl = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const pending = proxyToBackend({
      method: "GET",
      segments: ["health"],
      origin,
      fetchImpl,
      timeoutMs: 10_000,
    });
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect((await envelopeOf(response)).code).toBe("upstream_timeout");
    vi.useRealTimers();
  });

  it("propagates client cancellation instead of reporting a backend fault", async () => {
    const controller = new AbortController();
    const fetchImpl = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const pending = proxyToBackend({
      method: "GET",
      segments: ["health"],
      origin,
      fetchImpl,
      signal: controller.signal,
    });
    controller.abort();
    const response = await pending;
    expect(response.status).toBe(499);
    expect((await envelopeOf(response)).code).toBe("request_cancelled");
  });
});
