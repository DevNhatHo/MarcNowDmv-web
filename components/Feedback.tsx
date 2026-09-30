import type { ReactNode } from "react";
import { BackendError, errorCode, httpStatus } from "../lib/api";
import styles from "./Feedback.module.css";

/** A quiet skeleton whose geometry matches the rows it will be replaced by. */
export function LoadingRows({ count = 4, label }: { count?: number; label: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.bar} aria-hidden="true" />
      ))}
    </div>
  );
}

export function Notice({
  title,
  children,
  tone = "neutral",
  actions,
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "critical";
  actions?: ReactNode;
}) {
  return (
    <div
      className={`${styles.notice} ${tone === "critical" ? styles.critical : ""}`}
      role={tone === "critical" ? "alert" : undefined}
    >
      <p className={styles.noticeTitle}>{title}</p>
      <div className={styles.noticeBody}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/**
 * Failure wording a commuter can act on. The backend's own message is diagnostic and is
 * deliberately not shown; what matters is whether the request was wrong, the train is
 * gone, the schedule moved, or the service could not be reached.
 */
export function describeFailure(error: BackendError): { title: string; body: string } {
  const failure = error.failure;
  switch (failure.kind) {
    case "http": {
      const code = errorCode(error);
      if (httpStatus(error) === 404) {
        return {
          title: "That train isn't available",
          body: "It may belong to a schedule that is no longer published. Go back to the list and choose a train from the current service date.",
        };
      }
      if (code === "schedule_changed" || code === "snapshot_changed") {
        return {
          title: "The schedule changed while loading",
          body: "A new schedule was published. Refresh to start again from the new one.",
        };
      }
      if (code === "no_active_schedule") {
        return {
          title: "No schedule is loaded",
          body: "The service has no active schedule to read from, so no trains can be listed.",
        };
      }
      if (code === "realtime_unavailable") {
        return {
          title: "Realtime information is unavailable",
          body: "Scheduled information may still load. This does not mean trains are running normally.",
        };
      }
      if (code === "invalid_query") {
        return {
          title: "That filter isn't valid",
          body: "Check the service date and line, then try again.",
        };
      }
      return {
        title: "Couldn't load this information",
        body: "The service responded with an error. Try again in a moment.",
      };
    }
    case "contract":
      return {
        title: "Couldn't read the response",
        body: "The service returned something this app does not recognise, so nothing is shown rather than guessing at it.",
      };
    case "mixed_version":
      return {
        title: "The schedule changed while loading",
        body: "Pages from two different schedules cannot be combined. Refresh to start again.",
      };
    case "timeout":
      return {
        title: "The service didn't respond",
        body: "It took too long to answer. Try again.",
      };
    case "usage":
    case "transport":
    case "aborted":
      return {
        title: "Couldn't reach the service",
        body: "Check that the local backend is running, then try again.",
      };
  }
}
