"use client";

import { useCallback, useMemo, useState } from "react";
import { fetchAlerts, fetchRoutes, fetchStops, type BackendError } from "../lib/api";
import type { Alert, AlertPage } from "../lib/types/alerts";
import type { Route, Stop } from "../lib/types/catalogs";
import { formatClockTime, describeReport } from "../lib/presentation/time";
import AlertCard from "./AlertCard";
import { ActionButton, LoadingRows, Notice, describeFailure } from "./Feedback";
import { useSharedResource } from "./useSharedResource";
import Freshness from "./Freshness";
import styles from "./AlertsScreen.module.css";

const timeZone = "America/New_York";

interface Loaded {
  page: AlertPage;
  routes: Route[];
  stops: Stop[];
}

async function loadAlerts(signal: AbortSignal): Promise<Loaded> {
  const page = await fetchAlerts({ limit: 200 }, { signal });
  const routes = await fetchRoutes({ limit: 200 }, { signal });
  const stops = await fetchStops({ limit: 200 }, { signal });
  return { page, routes: routes.data, stops: stops.data };
}

/** The health of the alerts feed itself, which decides what an empty list may claim. */
function alertFeedState(page: AlertPage): string {
  return (
    page.sourceHealth.find((source) => source.source === "MTA_SERVICE_ALERTS")?.state ??
    "UNAVAILABLE"
  );
}

export default function AlertsScreen() {
  const [extra, setExtra] = useState<Alert[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    const loaded = await loadAlerts(signal);
    setExtra([]);
    setMoreError(null);
    setCursor(loaded.page.nextAfter);
    return loaded;
  }, []);
  const resource = useSharedResource<Loaded>("alerts", "alerts", load);
  const page = resource.data?.page;

  const names = useMemo(() => {
    const routes = new Map<string, string>();
    const stops = new Map<string, string>();
    for (const route of resource.data?.routes ?? []) {
      const name = route.longName ?? route.shortName;
      if (name !== null) routes.set(route.id, name);
    }
    for (const stop of resource.data?.stops ?? []) {
      if (stop.name !== null) stops.set(stop.id, stop.name);
    }
    return { routes, stops };
  }, [resource.data]);

  const alerts = useMemo(
    () => (page ? [...page.data, ...extra] : []),
    [page, extra],
  );

  /** Continuation resends the snapshot and version this page came from, as required. */
  const loadMore = async () => {
    if (page === undefined || cursor === null) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await fetchAlerts({
        after: cursor,
        snapshot: page.snapshot,
        version: page.scheduleVersion,
        limit: 200,
      });
      if (next.snapshot !== page.snapshot) {
        setMoreError(
          "The alert feed was updated while loading more, so this page was not added. Refresh to start again.",
        );
        setCursor(null);
        return;
      }
      setExtra((current) => [...current, ...next.data]);
      setCursor(next.nextAfter);
    } catch {
      setMoreError("Couldn't load more advisories. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const feedState = page ? alertFeedState(page) : "UNAVAILABLE";
  const formatTime = (iso: string) => formatClockTime(iso, timeZone);

  return (
    <div className={styles.screen}>
      <p className={styles.question}>Is there anything important I need to know?</p>
      <h1 className={styles.title}>Alerts</h1>

      <Freshness
        loadedAt={resource.loadedAt}
        outdated={resource.outdated}
        loading={resource.loading}
        failed={resource.failures > 0}
        onRefresh={resource.refresh}
        now={new Date()}
      />
      {page && resource.loadedAt ? (
        <p className={styles.updated}>
          {describeReport(page.sourceTimestamp, resource.loadedAt)} by the operator
        </p>
      ) : null}

      {/*
        * A degraded feed is still usable, so its content stays visible and labelled. The
        * strip is compact but not quiet: this is a real limitation on what the list below can
        * be trusted to contain, and it is marked by an icon, a rule and its wording as well
        * as by colour.
        */}
      {page && (feedState === "DEGRADED" || feedState === "STALE") ? (
        <p className={styles.degraded}>
          <span className={styles.degradedMark} aria-hidden="true">
            !
          </span>
          <span>
            {feedState === "DEGRADED"
              ? "Alert data may be incomplete. The operator feed is degraded, so these advisories are what was last received."
              : "Alert information is out of date. These advisories are what was last received."}
          </span>
        </p>
      ) : null}

      {resource.loading && !page ? (
        <LoadingRows count={3} label="Loading MARC advisories" />
      ) : null}

      {resource.error ? (
        <AlertsFailure error={resource.error} onRetry={resource.refresh} />
      ) : null}

      {page && alerts.length === 0 ? <EmptyAlerts feedState={feedState} /> : null}

      {alerts.length > 0 ? (
        <>
          {/*
            * Said once for the whole list rather than repeated on every card: the caveat
            * is identical each time, and repeating it four times is noise, not honesty.
            */}
          <p className={styles.scopeNote}>
            Each advisory lists the scope the operator published. A line or station entry
            does not say which individual trains are affected.
          </p>
          <ul className={styles.list} aria-label="MARC advisories">
            {alerts.map((alert) => (
              // Distinct advisories keep distinct identity even when their titles match.
              <AlertCard
                key={`${alert.id}:${alert.observationId}`}
                alert={alert}
                names={names}
                formatTime={formatTime}
              />
            ))}
          </ul>
          <div className={styles.more}>
            {cursor !== null ? (
              <ActionButton onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more advisories"}
              </ActionButton>
            ) : (
              <p className={styles.partial}>
                All {alerts.length} retained MARC advisories are shown.
              </p>
            )}
            {moreError ? <p className={styles.partial}>{moreError}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * An empty list is only good news when the evidence supports it. Without a healthy feed,
 * the screen says the information is unavailable rather than implying all is well.
 */
function EmptyAlerts({ feedState }: { feedState: string }) {
  if (feedState === "HEALTHY") {
    return (
      <Notice title="No active MARC alerts reported">
        The operator is reporting no active MARC advisories right now.
      </Notice>
    );
  }
  return (
    <Notice title="Alert information is unavailable">
      No advisories could be read from the operator&rsquo;s feed, so this is not evidence
      that MARC service is running without disruption.
    </Notice>
  );
}

function AlertsFailure({
  error,
  onRetry,
}: {
  error: BackendError;
  onRetry: () => void;
}) {
  const { title, body } = describeFailure(error);
  return (
    <Notice
      tone="critical"
      title={title}
      actions={<ActionButton onClick={onRetry}>Try again</ActionButton>}
    >
      {body}
    </Notice>
  );
}
