"use client";

import { describeReport } from "../lib/presentation/time";
import { ActionButton } from "./Feedback";
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
      <ActionButton onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </ActionButton>
    </p>
  );
}
