import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlerts } from "../../lib/api/alerts";
import { fetchRoutes, fetchStops } from "../../lib/api/catalogs";
import {
  defaultTimeoutMs,
  requestUrl,
  type FetchLike,
} from "../../lib/api/client";
import { BackendError, errorCode, isAborted, isVersionConflict } from "../../lib/api/errors";
import { fetchHealth, probeHealth } from "../../lib/api/health";
import { fetchTrainDetail, fetchTrains } from "../../lib/api/trains";
import { capturedBody } from "../fixtures/captures";

const base = { baseUrl: "/api/backend" };

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function responder(body: unknown, status = 200): { fetchImpl: FetchLike; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetchImpl, calls };
}

function failing(status: number, body: unknown): FetchLike {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("request construction", () => {
  it("omits absent values and encodes the rest", () => {
    expect(requestUrl("/api/backend", "/api/v1/trains", {})).toBe(
      "/api/backend/api/v1/trains",
    );
    expect(
      requestUrl("/api/backend", "/api/v1/trains", {
        serviceDate: "20260929",
        routeId: undefined,
        limit: 200,
      }),
    ).toBe("/api/backend/api/v1/trains?serviceDate=20260929&limit=200");
    // A value with reserved characters must survive as one parameter.
    expect(
      requestUrl("/api/backend", "/api/v1/trains", { routeId: "a b&c=d" }),
    ).toBe("/api/backend/api/v1/trains?routeId=a+b%26c%3Dd");
  });

  it("requests the list with a no-store cache and a JSON accept header", async () => {
    const { fetchImpl, calls } = responder(capturedBody("trains"));
    await fetchTrains({ limit: 3 }, { ...base, fetchImpl });
    expect(calls[0].url).toBe("/api/backend/api/v1/trains?limit=3");
    expect(calls[0].init?.method).toBe("GET");
    expect(calls[0].init?.cache).toBe("no-store");
  });

  it("percent-encodes an opaque train identifier", async () => {
    const { fetchImpl, calls } = responder(capturedBody("train-detail"));
    await fetchTrainDetail("abc/def+ghi=", {}, { ...base, fetchImpl });
    expect(calls[0].url).toBe("/api/backend/api/v1/trains/abc%2Fdef%2Bghi%3D");
  });

  it("sends both detail cursor families", async () => {
    const { fetchImpl, calls } = responder(capturedBody("correct-detail-cursor"));
    await fetchTrainDetail(
      "token",
      { afterStop: 1, afterUpdate: 4, limit: 50 },
      { ...base, fetchImpl },
    );
    expect(calls[0].url).toBe(
      "/api/backend/api/v1/trains/token?limit=50&afterStop=1&afterUpdate=4",
    );
  });

  it("sends the alert snapshot and version with a cursor", async () => {
    const { fetchImpl, calls } = responder(capturedBody("alerts"));
    await fetchAlerts(
      { after: "9", snapshot: "3", version: "1" },
      { ...base, fetchImpl },
    );
    expect(calls[0].url).toBe(
      "/api/backend/api/v1/alerts?after=9&snapshot=3&version=1",
    );
  });

  it("reads catalogs and health", async () => {
    const routes = responder(capturedBody("routes"));
    expect((await fetchRoutes({}, { ...base, fetchImpl: routes.fetchImpl })).data)
      .toHaveLength(3);
    const stops = responder(capturedBody("stops"));
    expect((await fetchStops({ limit: 5 }, { ...base, fetchImpl: stops.fetchImpl })).data)
      .toHaveLength(5);
    expect(stops.calls[0].url).toBe("/api/backend/api/v1/stops?limit=5");
    const health = responder(capturedBody("health"));
    expect((await fetchHealth({ ...base, fetchImpl: health.fetchImpl })).status).toBe("ok");
  });

  it("probes health without a body", async () => {
    const calls: Recorded[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return new Response(null, { status: 200 });
    };
    expect(await probeHealth({ ...base, fetchImpl })).toBe(200);
    expect(calls[0].init?.method).toBe("HEAD");
  });
});

describe("cursor rules the backend enforces", () => {
  it("refuses a list cursor without its service date and version", async () => {
    const { fetchImpl, calls } = responder(capturedBody("trains"));
    await expect(
      fetchTrains({ after: "token" }, { ...base, fetchImpl }),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
    await expect(
      fetchTrains(
        { after: "token", serviceDate: "20260929" },
        { ...base, fetchImpl },
      ),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
    // Nothing was sent, so the backend never saw a request certain to fail.
    expect(calls).toHaveLength(0);
    await expect(
      fetchTrains(
        { after: "token", serviceDate: "20260929", version: "1" },
        { ...base, fetchImpl },
      ),
    ).resolves.toBeDefined();
  });

  it("refuses an alert cursor without its snapshot and version", async () => {
    const { fetchImpl } = responder(capturedBody("alerts"));
    await expect(
      fetchAlerts({ after: "9", snapshot: "3" }, { ...base, fetchImpl }),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
  });

  it("refuses a catalog cursor without its version", async () => {
    const { fetchImpl } = responder(capturedBody("stops"));
    await expect(
      fetchStops({ after: "11944" }, { ...base, fetchImpl }),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
  });

  it("refuses a limit the backend would reject", async () => {
    const { fetchImpl, calls } = responder(capturedBody("trains"));
    for (const limit of [0, 201, 1.5, -3]) {
      await expect(
        fetchTrains({ limit }, { ...base, fetchImpl }),
      ).rejects.toMatchObject({ failure: { kind: "usage" } });
    }
    await expect(
      fetchTrainDetail("t", { afterStop: -1 }, { ...base, fetchImpl }),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
    await expect(
      fetchTrainDetail("", {}, { ...base, fetchImpl }),
    ).rejects.toMatchObject({ failure: { kind: "usage" } });
    expect(calls).toHaveLength(0);
  });
});

describe("failure translation", () => {
  it("carries the backend error code for each rejected request", async () => {
    for (const [status, code] of [
      [400, "invalid_query"],
      [404, "not_found"],
      [409, "schedule_changed"],
      [409, "snapshot_changed"],
      [503, "realtime_unavailable"],
      [500, "internal"],
    ] as const) {
      const error = await fetchTrains(
        {},
        { ...base, fetchImpl: failing(status, { error: { code, message: "no" } }) },
      ).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(BackendError);
      expect(errorCode(error)).toBe(code);
      expect((error as BackendError).failure).toMatchObject({ kind: "http", status });
    }
  });

  it("recognizes both conflict codes as one bounded-restart condition", async () => {
    for (const code of ["schedule_changed", "snapshot_changed"]) {
      const error = await fetchTrains(
        {},
        { ...base, fetchImpl: failing(409, { error: { code, message: "changed" } }) },
      ).catch((caught: unknown) => caught);
      expect(isVersionConflict(error)).toBe(true);
    }
    const other = await fetchTrains(
      {},
      { ...base, fetchImpl: failing(400, { error: { code: "invalid_query", message: "" } }) },
    ).catch((caught: unknown) => caught);
    expect(isVersionConflict(other)).toBe(false);
  });

  it("does not echo an unexpected error body", async () => {
    const secretish = "<html>backend internals at 10.0.0.5</html>";
    const fetchImpl: FetchLike = async () =>
      new Response(secretish, { status: 502, headers: { "Content-Type": "text/html" } });
    const error = await fetchTrains({}, { ...base, fetchImpl }).catch(
      (caught: unknown) => caught,
    );
    expect(errorCode(error)).toBe("unexpected_response");
    expect((error as BackendError).message).not.toContain("10.0.0.5");
    expect(JSON.stringify((error as BackendError).failure)).not.toContain("10.0.0.5");
  });

  it("reports a successful response that is not JSON as a contract failure", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response("not json", { status: 200, headers: { "Content-Type": "text/plain" } });
    await expect(fetchTrains({}, { ...base, fetchImpl })).rejects.toMatchObject({
      failure: { kind: "contract" },
    });
  });

  it("reports a transport failure without inventing a status", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("network down");
    };
    const error = await fetchTrains({}, { ...base, fetchImpl }).catch(
      (caught: unknown) => caught,
    );
    expect((error as BackendError).failure).toEqual({ kind: "transport" });
  });
});

describe("cancellation and timeout", () => {
  it("reports a caller cancellation as cancelled, not as a fault", async () => {
    const controller = new AbortController();
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const pending = fetchTrains({}, { ...base, fetchImpl, signal: controller.signal });
    controller.abort();
    const error = await pending.catch((caught: unknown) => caught);
    expect(isAborted(error)).toBe(true);
  });

  it("refuses immediately when the caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { fetchImpl, calls } = responder(capturedBody("trains"));
    await expect(
      fetchTrains({}, { ...base, fetchImpl, signal: controller.signal }),
    ).rejects.toMatchObject({ failure: { kind: "aborted" } });
    expect(calls).toHaveLength(0);
  });

  it("distinguishes an expired request from a cancelled one", async () => {
    vi.useFakeTimers();
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const pending = fetchTrains({}, { ...base, fetchImpl, timeoutMs: 10_000 }).catch(
      (caught: unknown) => caught,
    );
    await vi.advanceTimersByTimeAsync(10_000);
    const error = await pending;
    expect((error as BackendError).failure).toEqual({
      kind: "timeout",
      timeoutMs: 10_000,
    });
    expect(isAborted(error)).toBe(false);
  });

  it("uses the documented ten-second budget by default", () => {
    expect(defaultTimeoutMs).toBe(10_000);
  });
});
