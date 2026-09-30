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
export interface SharedResource<T> {
  data: T | null;
  error: BackendError | null;
  loading: boolean;
  loadedAt: Date | null;
  outdated: boolean;
  failures: number;
  refresh: () => void;
}

export function useSharedResource<T>(
  key: string,
  kind: ResourceKind,
  load: (signal: AbortSignal) => Promise<T>,
): SharedResource<T> {
  const listen = useCallback(
    (onChange: () => void) =>
      subscribe(key, kind, load as (signal: AbortSignal) => Promise<unknown>, onChange),
    [key, kind, load],
  );
  const read = useCallback(() => snapshotOf(key), [key]);
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
    refresh: useCallback(() => refresh(key), [key]),
  };
}
