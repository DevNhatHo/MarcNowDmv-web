/**
 * Bounded continuation across pages.
 *
 * Three rules come from the verified contract:
 *
 *  - Pages from different schedule versions or snapshots are never merged. A changed
 *    identity fails with `mixed_version` rather than producing a plausible blend.
 *  - A 409 restarts the walk once, from no cursor. A second conflict propagates, because
 *    a schedule that keeps changing must not be retried indefinitely.
 *  - The walk is bounded by `maxPages`. When the bound is reached with a cursor still
 *    outstanding the result is explicitly incomplete, so a partial list can never be
 *    reported as a complete total.
 *
 * The cursor is inspected before the next request is constructed, so reaching the bound
 * issues no further request and leaves no unawaited promise behind.
 */
import { BackendError, isVersionConflict } from "./errors";

/** Default bound: ten pages of at most 200 rows. */
export const defaultMaxPages = 10;

export interface Continuation<TPage, TItem> {
  /** Reads the first page, with no cursor. */
  first: () => Promise<TPage>;
  /** The cursor that continues after this page, or null when the page is the last. */
  cursor: (page: TPage) => string | null;
  /** Reads the page following that cursor. */
  after: (cursor: string) => Promise<TPage>;
  items: (page: TPage) => readonly TItem[];
  /** The identity every page in one walk must share, such as `scheduleVersion.id`. */
  identity: (page: TPage) => string;
  maxPages?: number;
}

export interface Collected<TItem> {
  items: TItem[];
  pages: number;
  /** False when the page bound stopped a walk that still had a cursor. */
  complete: boolean;
  /** True when a version or snapshot conflict forced one fresh restart. */
  restarted: boolean;
}

async function walk<TPage, TItem>(
  source: Continuation<TPage, TItem>,
  maxPages: number,
): Promise<Omit<Collected<TItem>, "restarted">> {
  let page = await source.first();
  const expected = source.identity(page);
  const items: TItem[] = [...source.items(page)];
  let pages = 1;

  for (;;) {
    const cursor = source.cursor(page);
    if (cursor === null) return { items, pages, complete: true };
    if (pages >= maxPages) return { items, pages, complete: false };
    page = await source.after(cursor);
    const received = source.identity(page);
    if (received !== expected) {
      throw new BackendError({ kind: "mixed_version", expected, received });
    }
    items.push(...source.items(page));
    pages += 1;
  }
}

export async function collectPages<TPage, TItem>(
  source: Continuation<TPage, TItem>,
): Promise<Collected<TItem>> {
  const maxPages = source.maxPages ?? defaultMaxPages;
  try {
    return { ...(await walk(source, maxPages)), restarted: false };
  } catch (error) {
    if (!isVersionConflict(error)) throw error;
    // One bounded restart, discarding every cursor from the superseded version.
    return { ...(await walk(source, maxPages)), restarted: true };
  }
}
