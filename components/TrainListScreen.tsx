"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchRoutes, fetchTrains, type BackendError } from "../lib/api";
import type { Route } from "../lib/types/catalogs";
import type { Train, TrainListPage } from "../lib/types/trains";
import { formatServiceDate, isServiceDate } from "../lib/presentation/time";
import {
  ActionButton,
  LoadingRows,
  Notice,
  describeFailure,
} from "./Feedback";
import TrainRow from "./TrainRow";
import { useSharedResource } from "./useSharedResource";
import Freshness from "./Freshness";
import styles from "./TrainListScreen.module.css";

/** A page of the list plus the catalog read alongside it, so both share one snapshot. */
interface Listing {
  page: TrainListPage;
  routes: Route[];
  routesVersion: string;
}

async function loadListing(
  serviceDate: string | undefined,
  routeId: string | undefined,
  signal: AbortSignal,
): Promise<Listing> {
  const page = await fetchTrains({ serviceDate, routeId, limit: 50 }, { signal });
  const catalog = await fetchRoutes({ limit: 200 }, { signal });
  return {
    page,
    routes: catalog.data,
    routesVersion: catalog.scheduleVersion.id,
  };
}

export default function TrainListScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const serviceDate = params.get("serviceDate") ?? undefined;
  const routeId = params.get("routeId") ?? undefined;
  const [extra, setExtra] = useState<Train[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const key = `${serviceDate ?? ""}|${routeId ?? ""}`;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const listing = await loadListing(serviceDate, routeId, signal);
      // A new filter starts a new list; pages from the previous one are discarded.
      setExtra([]);
      setMoreError(null);
      setCursor(listing.page.nextAfter);
      return listing;
    },
    [serviceDate, routeId],
  );
  const listing = useSharedResource<Listing>(`trains:${key}`, "trains", load);

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "") next.delete(name);
    else next.set(name, value);
    router.replace(next.size > 0 ? `/trains?${next}` : "/trains");
  };

  const page = listing.data?.page;
  /**
   * Rows are ordered by scheduled departure, because the question this screen answers is
   * which train to catch. The backend paginates by run identity, so its order is not
   * chronological; sorting is presentation over published scheduled times and infers
   * nothing. A later page can therefore insert rows above existing ones, which the partial
   * notice says explicitly.
   */
  const trains = useMemo(() => {
    if (page === undefined) return [];
    return [...page.data, ...extra].sort((left, right) =>
      left.scheduled.start.localeCompare(right.scheduled.start),
    );
  }, [page, extra]);

  /**
   * One more page, on request. The continuation resends the service date and version this
   * page came from, which the backend requires and the client enforces. A conflict is
   * reported rather than silently merged across schedule versions.
   */
  const loadMore = async () => {
    if (page === undefined || cursor === null) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await fetchTrains({
        serviceDate: page.serviceDate,
        version: page.scheduleVersion.id,
        routeId,
        after: cursor,
        limit: 50,
      });
      if (next.scheduleVersion.id !== page.scheduleVersion.id) {
        setMoreError(
          "The schedule changed while loading more trains, so this page was not added. Refresh to start again.",
        );
        setCursor(null);
        return;
      }
      setExtra((current) => [...current, ...next.data]);
      setCursor(next.nextAfter);
    } catch {
      setMoreError("Couldn't load more trains. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const lineNames = useMemo(() => {
    const names = new Map<string, string>();
    // Names may only be joined when the catalog and the page share a schedule version.
    if (listing.data && listing.data.routesVersion === page?.scheduleVersion.id) {
      for (const route of listing.data.routes) {
        const name = route.longName ?? route.shortName;
        if (name !== null) names.set(route.id, name);
      }
    }
    return names;
  }, [listing.data, page]);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div>
          <p className={styles.question}>Which train do I care about?</p>
          <h1 className={styles.title}>Trains</h1>
        </div>
      </div>
      {page ? (
        <p className={styles.scope}>
          Every train scheduled for {formatServiceDate(page.serviceDate)}, including
          services that have already finished. This is not a list of trains running now.
        </p>
      ) : null}

      <div className={styles.filters}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="serviceDate">
            Service date
          </label>
          <input
            id="serviceDate"
            className={styles.control}
            type="date"
            value={toInputDate(serviceDate ?? page?.serviceDate)}
            onChange={(event) => setFilter("serviceDate", toServiceDate(event.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="routeId">
            Line
          </label>
          <select
            id="routeId"
            className={styles.control}
            value={routeId ?? ""}
            onChange={(event) => setFilter("routeId", event.target.value)}
          >
            <option value="">All lines</option>
            {(listing.data?.routes ?? []).map((route) => (
              <option key={route.id} value={route.id}>
                {route.longName ?? route.shortName ?? route.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Freshness
        loadedAt={listing.loadedAt}
        outdated={listing.outdated}
        loading={listing.loading}
        failed={listing.failures > 0}
        onRefresh={listing.refresh}
        now={new Date()}
      />

      {listing.loading && !page ? (
        <LoadingRows label="Loading scheduled trains" />
      ) : null}

      {listing.error ? <ListFailure error={listing.error} onRetry={listing.refresh} /> : null}

      {page && trains.length === 0 ? (
        <Notice title="No scheduled trains">
          No scheduled trains for {formatServiceDate(page.serviceDate)}
          {routeId ? " on the selected line" : ""}.
        </Notice>
      ) : null}

      {trains.length > 0 && page ? (
        <>
          <ul className={styles.list} aria-label="Scheduled trains">
            <TrainRows
              trains={trains}
              lineNames={lineNames}
              timeZone={page.scheduleVersion.timezone}
              loadedAt={listing.loadedAt ?? new Date(page.evaluatedAt)}
              serviceDate={page.serviceDate}
              routeId={routeId}
            />
          </ul>
          <div className={styles.more}>
            {cursor !== null ? (
              <>
                <ActionButton onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more trains"}
                </ActionButton>
                <p className={styles.partial}>
                  Showing {trains.length} trains so far, ordered by scheduled departure.
                  More are available for this service date and may fall at any time of day.
                </p>
              </>
            ) : (
              <p className={styles.partial}>
                All {trains.length} scheduled trains for this date are shown, ordered by
                scheduled departure.
              </p>
            )}
            {moreError ? <p className={styles.partial}>{moreError}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ListFailure({
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

function TrainRows({
  trains,
  lineNames,
  timeZone,
  loadedAt,
  serviceDate,
  routeId,
}: {
  trains: Train[];
  lineNames: Map<string, string>;
  timeZone: string;
  loadedAt: Date;
  serviceDate: string;
  routeId: string | undefined;
}) {
  // The filters travel with the link so detail can offer an exact way back.
  const back = new URLSearchParams({ serviceDate });
  if (routeId !== undefined) back.set("routeId", routeId);
  return (
    <>
      {trains.map((train) => (
        <TrainRow
          key={train.id}
          train={train}
          lineName={lineNames.get(train.routeId) ?? null}
          timeZone={timeZone}
          loadedAt={loadedAt}
          href={`/trains/${encodeURIComponent(train.id)}?${back}`}
        />
      ))}
    </>
  );
}

function toInputDate(serviceDate: string | undefined): string {
  if (serviceDate === undefined || !isServiceDate(serviceDate)) return "";
  return `${serviceDate.slice(0, 4)}-${serviceDate.slice(4, 6)}-${serviceDate.slice(6, 8)}`;
}

function toServiceDate(value: string): string {
  return value.replaceAll("-", "");
}
