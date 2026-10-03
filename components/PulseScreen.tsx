"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { fetchAlerts, fetchRoutes, fetchTrains, type BackendError } from "../lib/api";
import type { AlertPage } from "../lib/types/alerts";
import type { Route } from "../lib/types/catalogs";
import type { TrainListPage } from "../lib/types/trains";
import { effectLabel, preferredText } from "../lib/presentation/alerts";
import {
  describeCoverage,
  describeLine,
  summarizeLines,
} from "../lib/presentation/pulse";
import { formatServiceDate } from "../lib/presentation/time";
import { ActionButton, LoadingRows, Notice, describeFailure } from "./Feedback";
import { useSharedResource } from "./useSharedResource";
import { useWideViewport } from "./useWideViewport";
import HomeMap from "./home/HomeMap";
import HomeTrains from "./home/HomeTrains";
import home from "./home/Home.module.css";
import Freshness from "./Freshness";
import styles from "./PulseScreen.module.css";

/** How many advisories the home page previews before sending people to /alerts. */
const advisoryPreview = 3;

interface Overview {
  trains: TrainListPage;
  routes: Route[];
  alerts: AlertPage;
}

/**
 * One bounded read of each resource. The list is read **once**, at the maximum page size,
 * and never followed: a home screen must not walk pages or fan out into per-train detail.
 */
async function loadOverview(signal: AbortSignal): Promise<Overview> {
  const trains = await fetchTrains({ limit: 200 }, { signal });
  const routes = await fetchRoutes({ limit: 200 }, { signal });
  const alerts = await fetchAlerts({ limit: 20 }, { signal });
  return { trains, routes: routes.data, alerts };
}

export default function PulseScreen() {
  const load = useCallback((signal: AbortSignal) => loadOverview(signal), []);
  const resource = useSharedResource<Overview>("pulse", "trains", load);
  const data = resource.data;
  /*
   * The desktop composition is additive. Narrow viewports render exactly what they rendered
   * before, and the extra panels are not mounted at all rather than mounted and hidden, so a
   * phone never pays for the map's geometry read.
   */
  const wide = useWideViewport();

  const names = useMemo(() => {
    const map = new Map<string, string>();
    // Names are joined only when the catalog matches the page's schedule version.
    if (data && data.trains.scheduleVersion.id) {
      for (const route of data.routes) {
        const name = route.longName ?? route.shortName;
        if (name !== null) map.set(route.id, name);
      }
    }
    return map;
  }, [data]);

  const lines = useMemo(
    () => (data ? summarizeLines(data.trains.data, names) : []),
    [data, names],
  );

  const alertFeedHealthy =
    data?.alerts.sourceHealth.find((s) => s.source === "MTA_SERVICE_ALERTS")?.state ===
    "HEALTHY";

  return (
    <div className={`${styles.screen} ${home.screenWide}`}>
      <p className={styles.question}>How is MARC running right now?</p>
      <h1 className={styles.title}>MARC Pulse</h1>

      <div className={home.layout}>
        <div>

      {data ? (
        <p className={styles.coverage}>
          {describeCoverage(
            data.trains.data.length,
            data.trains.nextAfter === null,
            formatServiceDate(data.trains.serviceDate),
          )}
        </p>
      ) : null}

      <Freshness
        loadedAt={resource.loadedAt}
        outdated={resource.outdated}
        loading={resource.loading}
        failed={resource.failures > 0}
        onRefresh={resource.refresh}
        now={new Date()}
      />

      {resource.loading && !data ? (
        <LoadingRows count={3} label="Loading the MARC overview" />
      ) : null}

      {resource.error ? (
        <OverviewFailure error={resource.error} onRetry={resource.refresh} />
      ) : null}

      {data ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Lines</h2>
            {lines.length === 0 ? (
              <p className={styles.note}>
                No trains are scheduled for this service date, so there is nothing to
                summarise.
              </p>
            ) : (
              <ul className={styles.lines} aria-label="MARC lines">
                {lines.map((line) => (
                  <li key={line.routeId}>
                    <Link
                      className={styles.line}
                      href={`/trains?serviceDate=${data.trains.serviceDate}&routeId=${encodeURIComponent(line.routeId)}`}
                    >
                      <span className={styles.lineName}>
                        {line.name ?? `Line ${line.routeId}`}
                      </span>
                      <span className={styles.lineState}>{describeLine(line)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.note}>
              These figures count scheduled trains and the operator&rsquo;s own reports.
              They do not say how many trains are running now, which this service cannot
              determine.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Advisories</h2>
            <AdvisoryPreview page={data.alerts} healthy={alertFeedHealthy} />
            <p className={styles.all}>
              <Link href="/alerts" className="standalone-link">
                See all MARC advisories
              </Link>
            </p>
          </section>
        </>
      ) : null}
        </div>

        {/*
          * The two added panels. Both are fed by the page this screen already fetched: the
          * trains panel issues no request at all, and the map panel adds only the catalog-
          * cadence geometry read any map needs. Neither duplicates a rule — the rows are the
          * list's `TrainRow`, the markers are the map's own presentation, and selection and
          * follow stay on `/map`.
          */}
        {wide && data ? (
          <>
            <HomeMap
              trains={data.trains.data}
              routes={data.routes}
              evaluatedAt={data.trains.evaluatedAt}
            />
            <HomeTrains page={data.trains} routes={data.routes} />
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A short preview. An empty preview makes a no-advisories claim only when the alert feed is
 * healthy, exactly as the alerts screen does; otherwise it says the information is
 * unavailable.
 */
function AdvisoryPreview({ page, healthy }: { page: AlertPage; healthy: boolean }) {
  if (page.data.length === 0) {
    return healthy ? (
      <p className={styles.note}>
        The operator is reporting no active MARC advisories right now.
      </p>
    ) : (
      <p className={styles.note}>
        Alert information is unavailable, so this is not evidence that there are no
        disruptions.
      </p>
    );
  }
  const preview = page.data.slice(0, advisoryPreview);
  return (
    <>
      <ul className={styles.advisories} aria-label="Recent MARC advisories">
        {preview.map((alert) => (
          <li key={`${alert.id}:${alert.observationId}`} className={styles.advisory}>
            <p className={styles.advisoryTitle}>
              {preferredText(alert.headerText) ?? "Advisory published without a title"}
            </p>
            {effectLabel(alert.effect) !== null ? (
              <p className={styles.advisoryMeta}>{effectLabel(alert.effect)}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {page.data.length > preview.length ? (
        <p className={styles.note}>{remainderNote(page.data.length - preview.length)}</p>
      ) : null}
    </>
  );
}

/** Noun and verb agree, so a single remaining advisory does not read as plural. */
function remainderNote(remaining: number): string {
  return remaining === 1
    ? "1 more retained advisory is not shown here."
    : `${remaining} more retained advisories are not shown here.`;
}

function OverviewFailure({
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
