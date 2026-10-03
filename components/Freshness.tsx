"use client";

import { describeReport } from "../lib/presentation/time";
import styles from "./Freshness.module.css";

/**
 * How current *this page's copy* of the data is, and how to ask for a newer one.
 *
 * When a refresh has failed, or the cached response has aged past two intervals, the
 * content below stays on screen but is explicitly framed as last received. That is the
 * honest option: removing it would lose information the commuter already had, while
 * presenting it unchanged would imply it is current.
 */
export default function Freshness({
  loadedAt,
  outdated,
  loading,
  failed,
  onRefresh,
  now,
}: {
  loadedAt: Date | null;
  outdated: boolean;
  loading: boolean;
  failed: boolean;
  onRefresh: () => void;
  now: Date;
}) {
  if (loadedAt === null) return null;
  const received = describeReport(loadedAt.toISOString(), now);
  return (
    <>
      {/*
        * Announced politely, and only when the *state* changes. The visible banner carries
        * a timestamp that moves as the page ages, so making the banner itself live would
        * read every tick aloud, which the architecture explicitly rules out.
        */}
      <span className="visually-hidden" role="status" aria-live="polite">
        {failed
          ? "Couldn't refresh. The information shown is what was last received."
          : outdated
            ? "The information shown is out of date."
            : ""}
      </span>
    <p className={styles.banner}>
      {failed ? (
        <span className={styles.outdated}>
          Couldn&rsquo;t refresh. Showing information received{" "}
          {received.replace(/^Reported /, "")}.
        </span>
      ) : outdated ? (
        <span className={styles.outdated}>
          This information is out of date. Received {received.replace(/^Reported /, "")}.
        </span>
      ) : (
        <span className={styles.current}>
          Received {received.replace(/^Reported /, "")}.
        </span>
      )}
      {/*
        * A quiet inline control rather than a bordered button. It keeps a full 44px target and
        * an accessible name that says what it refreshes, so compacting it costs nothing a
        * keyboard or screen-reader user relied on. The glyph is decorative; the name is not.
        */}
      <button
        type="button"
        className={styles.refresh}
        onClick={onRefresh}
        disabled={loading}
      >
        <span className={styles.refreshLabel}>
          {loading ? "Refreshing…" : "Refresh"}
        </span>
        <span aria-hidden="true" className={styles.glyph}>
          ↻
        </span>
      </button>
      </p>
    </>
  );
}
