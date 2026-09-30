"use client";

import { useCallback, useEffect, useState } from "react";
import { BackendError, isAborted } from "../lib/api";

/**
 * One resource read with explicit refresh.
 *
 * Only one request per resource is in flight: a new key or a refresh aborts the previous
 * one, and a response that arrives after it was superseded is ignored rather than
 * rendered. Automatic polling is deliberately absent; WEB-010 owns that.
 *
 * `loading` is derived by comparing the settled result against the request being asked
 * for, rather than being set inside the effect, so there is no cascading render and no
 * window in which the two disagree.
 *
 * A previous successful result stays visible while a refresh of the *same* key is in
 * flight, so the screen does not blank out. A result for a different key is withheld,
 * because data for one filter must never be shown under another.
 *
 * `loadedAt` is the clock captured when the response arrived. Ages are rendered against it
 * rather than a live clock, so no label ticks on its own and no displayed duration can
 * drift away from the evidence it describes.
 */
export interface Resource<T> {
  data: T | null;
  error: BackendError | null;
  loading: boolean;
  loadedAt: Date | null;
  refresh: () => void;
}

interface Settled<T> {
  key: string;
  attempt: number;
  data: T | null;
  error: BackendError | null;
  loadedAt: Date | null;
}

export function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    load(controller.signal)
      .then((data) => {
        if (current) {
          setSettled({ key, attempt, data, error: null, loadedAt: new Date() });
        }
      })
      .catch((caught: unknown) => {
        // A cancelled request was replaced on purpose; it is not a failure to report.
        if (!current || isAborted(caught)) return;
        setSettled({
          key,
          attempt,
          data: null,
          error:
            caught instanceof BackendError
              ? caught
              : new BackendError({ kind: "transport" }),
          loadedAt: null,
        });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [key, attempt, load]);

  const matches = settled !== null && settled.key === key;
  return {
    data: matches ? settled.data : null,
    error: matches && settled.attempt === attempt ? settled.error : null,
    loading: !matches || settled.attempt !== attempt,
    loadedAt: matches ? settled.loadedAt : null,
    refresh: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
