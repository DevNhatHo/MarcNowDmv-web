"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BackendError } from "../lib/api";
import { isOutdated, type ResourceKind } from "../lib/refresh/policy";
import { refresh, snapshotOf, subscribe } from "../lib/refresh/store";

/**
 * A screen's view of a shared resource.
 *
 * `outdated` is about **this app's response cache**, not the backend's freshness. It means
 * the last successful response is old enough, or the last refresh failed, that its positive
 * claims should no longer be presented as current. The backend's own freshness and
 * `sourceHealth` remain the authority on the data itself.
 */
/** A stable empty snapshot, so an unsubscribed read returns the same object every time. */
const idle = {
  data: null,
  error: null,
  loading: false,
  loadedAt: null,
  failures: 0,
} as const;

export interface SharedResource<T> {
  data: T | null;
  error: BackendError | null;
  loading: boolean;
  loadedAt: Date | null;
  outdated: boolean;
  failures: number;
  refresh: () => void;
}

/**
 * A null `key` means **there is nothing to read right now** — no subscription is made and no
 * request is issued. It exists so a screen can own a conditional resource, such as the detail
 * of whichever train is selected, without a conditional hook and without a child component
 * holding a read the screen needs the result of.
 */
export function useSharedResource<T>(
  key: string | null,
  kind: ResourceKind,
  load: (signal: AbortSignal) => Promise<T>,
): SharedResource<T> {
  const listen = useCallback(
    (onChange: () => void) => {
      if (key === null) return () => {};
      return subscribe(
        key,
        kind,
        load as (signal: AbortSignal) => Promise<unknown>,
        onChange,
      );
    },
    [key, kind, load],
  );
  const read = useCallback(() => (key === null ? idle : snapshotOf(key)), [key]);
  // The server has no cache, so it renders the loading state the client starts from.
  const snapshot = useSyncExternalStore(listen, read, read);

  return {
    data: snapshot.data as T | null,
    error: snapshot.error,
    loading: snapshot.loading,
    loadedAt: snapshot.loadedAt,
    // A failed refresh makes the retained content outdated immediately; otherwise age does.
    outdated:
      snapshot.failures > 0 || isOutdated(kind, snapshot.loadedAt, new Date()),
    failures: snapshot.failures,
    refresh: useCallback(() => {
      if (key !== null) refresh(key);
    }, [key]),
  };
}
