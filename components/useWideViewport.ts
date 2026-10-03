"use client";

import { useSyncExternalStore } from "react";

/**
 * True at desktop width, as a subscription rather than a resize listener.
 *
 * The desktop composition is a **progressive enhancement**: below this width its panels are
 * not rendered at all, rather than rendered and hidden, so a phone never pays for a map's
 * geometry read to display nothing.
 *
 * The server snapshot is `false`, so the first client render matches the server and the
 * composition appears after hydration on a wide screen. That is the honest trade for not
 * guessing a viewport the server cannot know.
 */
const query = "(min-width: 64rem)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || window.matchMedia === undefined) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  if (typeof window === "undefined" || window.matchMedia === undefined) return false;
  return window.matchMedia(query).matches;
}

export function useWideViewport(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
