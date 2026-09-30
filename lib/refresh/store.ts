/**
 * The shared resource lifecycle.
 *
 * One entry per resource key, however many components subscribe to it. That gives
 * deduplication for free: two screens showing the same catalog share one request and one
 * timer rather than racing each other.
 *
 * Rules this store owns, so no screen has to remember them:
 *
 *  - One request in flight per key. Starting another aborts the previous one, and a
 *    response that arrives after it was superseded is discarded rather than rendered.
 *  - Polling pauses while the document is hidden. A hidden tab is not watching, and a
 *    phone in a pocket must not poll all day.
 *  - Becoming visible, or the window regaining focus, refreshes immediately if the data is
 *    already due, so returning to the tab does not show a stale screen while a timer runs
 *    down.
 *  - A failed refresh backs off, doubling to a two-minute ceiling, and **keeps the last
 *    successful content**. Failure changes how the content is labelled, never whether it is
 *    there.
 *  - The timer keeps ticking even when paused or failing, so an age label and the outdated
 *    state stay truthful without any network call.
 *
 * Pagination is deliberately not automated here. Following cursors on a timer is what the
 * architecture forbids, so screens load more pages only when someone asks.
 */
import { BackendError, isAborted } from "../api";
import { backoffMs, policyFor, type ResourceKind } from "./policy";

export interface ResourceSnapshot<T> {
  data: T | null;
  /** The failure from the most recent attempt, if it failed. */
  error: BackendError | null;
  loading: boolean;
  /** When the last **successful** response arrived. */
  loadedAt: Date | null;
  /** Consecutive failures since the last success, for backoff and for wording. */
  failures: number;
  /** Bumped by every notification, so age-dependent rendering re-runs. */
  tick: number;
}

type Loader<T> = (signal: AbortSignal) => Promise<T>;

interface Entry {
  kind: ResourceKind;
  loader: Loader<unknown>;
  listeners: Set<() => void>;
  snapshot: ResourceSnapshot<unknown>;
  controller: AbortController | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Monotonic id of the newest request, so an older response can be recognised. */
  request: number;
}

const entries = new Map<string, Entry>();

const empty: ResourceSnapshot<unknown> = {
  data: null,
  error: null,
  loading: true,
  loadedAt: null,
  failures: 0,
  tick: 0,
};

function hidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function notify(entry: Entry, snapshot: Partial<ResourceSnapshot<unknown>>): void {
  entry.snapshot = { ...entry.snapshot, ...snapshot, tick: entry.snapshot.tick + 1 };
  for (const listener of entry.listeners) listener();
}

function schedule(entry: Entry, delayMs: number): void {
  if (entry.timer !== null) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    if (entry.listeners.size === 0) return;
    if (hidden()) {
      // Paused, not stopped: notify so age and outdated wording stay truthful, then wait.
      notify(entry, {});
      schedule(entry, policyFor(entry.kind).intervalMs);
      return;
    }
    void run(entry);
  }, delayMs);
}

function run(entry: Entry): Promise<void> {
  entry.controller?.abort();
  const controller = new AbortController();
  entry.controller = controller;
  const request = ++entry.request;
  notify(entry, { loading: true });

  return entry.loader(controller.signal).then(
    (data) => {
      // A response for a superseded request must never reach the screen.
      if (request !== entry.request) return;
      notify(entry, { data, error: null, loading: false, loadedAt: new Date(), failures: 0 });
      schedule(entry, policyFor(entry.kind).intervalMs);
    },
    (caught: unknown) => {
      if (request !== entry.request) return;
      if (isAborted(caught)) return;
      const failures = entry.snapshot.failures + 1;
      // The previous data stays; only its labelling changes.
      notify(entry, {
        error:
          caught instanceof BackendError ? caught : new BackendError({ kind: "transport" }),
        loading: false,
        failures,
      });
      schedule(entry, backoffMs(entry.kind, failures));
    },
  );
}

/** Refresh every subscribed resource that is due, used when the tab becomes visible. */
function wake(): void {
  if (hidden()) return;
  for (const entry of entries.values()) {
    if (entry.listeners.size === 0) continue;
    const { loadedAt } = entry.snapshot;
    const due =
      loadedAt === null ||
      Date.now() - loadedAt.getTime() >= policyFor(entry.kind).intervalMs;
    if (due) void run(entry);
  }
}

let listening = false;
function listenForVisibility(): void {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
}

export function subscribe(
  key: string,
  kind: ResourceKind,
  loader: Loader<unknown>,
  listener: () => void,
): () => void {
  listenForVisibility();
  let entry = entries.get(key);
  if (entry === undefined) {
    entry = {
      kind,
      loader,
      listeners: new Set(),
      snapshot: empty,
      controller: null,
      timer: null,
      request: 0,
    };
    entries.set(key, entry);
  }
  // The newest subscriber's loader wins, so a re-rendered closure stays current.
  entry.loader = loader;
  const first = entry.listeners.size === 0;
  entry.listeners.add(listener);
  if (first && entry.snapshot.loadedAt === null) void run(entry);
  else if (first) schedule(entry, policyFor(entry.kind).intervalMs);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size > 0) return;
    // Nobody is watching: stop the timer and the request, but keep the cached response so
    // returning to the screen shows content immediately.
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = null;
    entry.controller?.abort();
    entry.controller = null;
  };
}

export function snapshotOf(key: string): ResourceSnapshot<unknown> {
  return entries.get(key)?.snapshot ?? empty;
}

/** An explicit, user-initiated refresh. */
export function refresh(key: string): void {
  const entry = entries.get(key);
  if (entry !== undefined) void run(entry);
}

/** Test seam: drops all cached state and timers. */
export function resetResources(): void {
  for (const entry of entries.values()) {
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.controller?.abort();
  }
  entries.clear();
}
