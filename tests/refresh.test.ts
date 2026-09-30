import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "../lib/api";
import {
  backoffMs,
  isOutdated,
  maxBackoffMs,
  policyFor,
} from "../lib/refresh/policy";
import { refresh, resetResources, snapshotOf, subscribe } from "../lib/refresh/store";

/** Lets a chain of already-resolved promises settle under fake timers. */
async function settle() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function visibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility("visible");
});

afterEach(() => {
  resetResources();
  vi.useRealTimers();
});

describe("refresh policy", () => {
  it("polls each resource at its own cadence", () => {
    expect(policyFor("trains").intervalMs).toBe(30_000);
    expect(policyFor("detail").intervalMs).toBe(30_000);
    expect(policyFor("alerts").intervalMs).toBe(60_000);
    expect(policyFor("catalog").intervalMs).toBe(600_000);
  });

  it("treats a response as outdated after two missed intervals", () => {
    const loadedAt = new Date("2026-09-30T12:00:00Z");
    const at = (seconds: number) =>
      new Date(loadedAt.getTime() + seconds * 1000);
    expect(isOutdated("trains", loadedAt, at(59))).toBe(false);
    expect(isOutdated("trains", loadedAt, at(60))).toBe(true);
    expect(isOutdated("alerts", loadedAt, at(119))).toBe(false);
    expect(isOutdated("alerts", loadedAt, at(120))).toBe(true);
    // Nothing loaded yet is not outdated; it is simply absent.
    expect(isOutdated("trains", null, at(10_000))).toBe(false);
  });

  it("backs off on repeated failure but never past the ceiling", () => {
    expect(backoffMs("trains", 1)).toBe(60_000);
    expect(backoffMs("trains", 2)).toBe(120_000);
    expect(backoffMs("trains", 9)).toBe(maxBackoffMs);
    expect(backoffMs("alerts", 5)).toBe(maxBackoffMs);
    expect(backoffMs("trains", 0)).toBe(30_000);
  });
});

describe("shared resource store", () => {
  it("polls on the resource interval", async () => {
    const load = vi.fn(async () => "value");
    subscribe("k", "trains", load, () => {});
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("serves many subscribers from one request and one timer", async () => {
    const load = vi.fn(async () => "value");
    const a = vi.fn();
    const b = vi.fn();
    const stopA = subscribe("k", "trains", load, a);
    const stopB = subscribe("k", "trains", load, b);
    await settle();
    // One request, not one per subscriber.
    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    stopA();
    stopB();
  });

  it("stops polling once nobody is subscribed, keeping the cached response", async () => {
    const load = vi.fn(async () => "value");
    const stop = subscribe("k", "trains", load, () => {});
    await settle();
    stop();
    await vi.advanceTimersByTimeAsync(180_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    // The content survives, so returning to the screen is not a blank page.
    expect(snapshotOf("k").data).toBe("value");
  });

  it("pauses while the document is hidden and resumes on visibility", async () => {
    const load = vi.fn(async () => "value");
    subscribe("k", "trains", load, () => {});
    await settle();
    expect(load).toHaveBeenCalledTimes(1);

    visibility("hidden");
    await vi.advanceTimersByTimeAsync(120_000);
    await settle();
    // Four intervals passed while hidden and none of them fetched.
    expect(load).toHaveBeenCalledTimes(1);

    visibility("visible");
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the age label truthful while paused, without a request", async () => {
    const load = vi.fn(async () => "value");
    const changed = vi.fn();
    subscribe("k", "trains", load, changed);
    await settle();
    const before = snapshotOf("k").tick;
    visibility("hidden");
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    // Notified so the outdated wording can appear, but no network call was made.
    expect(snapshotOf("k").tick).toBeGreaterThan(before);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps the last successful content when a refresh fails", async () => {
    let attempt = 0;
    const load = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return "first";
      throw new BackendError({ kind: "transport" });
    });
    subscribe("k", "trains", load, () => {});
    await settle();
    expect(snapshotOf("k").data).toBe("first");

    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    const snapshot = snapshotOf("k");
    // Content retained; only the failure and its count are new.
    expect(snapshot.data).toBe("first");
    expect(snapshot.error).toBeInstanceOf(BackendError);
    expect(snapshot.failures).toBe(1);
  });

  it("backs off after consecutive failures instead of retrying at full rate", async () => {
    const load = vi.fn(async () => {
      throw new BackendError({ kind: "transport" });
    });
    subscribe("k", "trains", load, () => {});
    await settle();
    expect(load).toHaveBeenCalledTimes(1);

    // First backoff is 60s, so nothing happens at the normal 30s interval.
    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);

    // Second backoff is 120s.
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("clears the failure count after a success", async () => {
    let attempt = 0;
    const load = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new BackendError({ kind: "transport" });
      return "recovered";
    });
    subscribe("k", "trains", load, () => {});
    await settle();
    expect(snapshotOf("k").failures).toBe(1);
    refresh("k");
    await settle();
    expect(snapshotOf("k")).toMatchObject({ data: "recovered", failures: 0, error: null });
  });

  it("discards a response that was superseded before it arrived", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const load = vi.fn(
      () => new Promise<string>((resolve) => resolvers.push(resolve)),
    );
    subscribe("k", "trains", load, () => {});
    await settle();
    refresh("k");
    await settle();
    expect(resolvers).toHaveLength(2);
    // The newer request answers first, then the stale one answers late.
    resolvers[1]("newer");
    await settle();
    resolvers[0]("older");
    await settle();
    expect(snapshotOf("k").data).toBe("newer");
  });

  it("aborts the in-flight request when a new one starts", async () => {
    const signals: AbortSignal[] = [];
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          signals.push(signal);
          signal.addEventListener("abort", () => resolve("unused"));
        }),
    );
    subscribe("k", "trains", load, () => {});
    await settle();
    refresh("k");
    await settle();
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("never walks pagination on a timer", async () => {
    const urls: string[] = [];
    const load = vi.fn(async () => {
      urls.push("page");
      return "value";
    });
    subscribe("k", "trains", load, () => {});
    await settle();
    await vi.advanceTimersByTimeAsync(90_000);
    await settle();
    // Each tick re-reads the first page; it never follows a cursor on its own.
    expect(urls).toHaveLength(4);
  });
});
