import { describe, expect, it } from "vitest";
import { requestUrl, type FetchLike } from "../../lib/api/client";
import { BackendError } from "../../lib/api/errors";
import { collectPages, defaultMaxPages } from "../../lib/api/pagination";
import { fetchTrains } from "../../lib/api/trains";
import type { Train, TrainListPage } from "../../lib/types/trains";
import { syntheticTrainPage } from "../fixtures/synthetic";

const base = { baseUrl: "/api/backend" };

/** A fake list endpoint whose pages are addressed by cursor. */
function listing(
  pages: Record<string, Record<string, unknown>>,
  conflictsBeforeSuccess = 0,
): { fetchImpl: FetchLike; urls: string[] } {
  const urls: string[] = [];
  let conflicts = conflictsBeforeSuccess;
  const fetchImpl: FetchLike = async (url) => {
    urls.push(url);
    const after = new URL(url, "http://frontend.test").searchParams.get("after") ?? "";
    if (after !== "" && conflicts > 0) {
      conflicts -= 1;
      return new Response(
        JSON.stringify({ error: { code: "schedule_changed", message: "changed" } }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    const page = pages[after];
    if (page === undefined) throw new Error(`no fake page for cursor ${after}`);
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetchImpl, urls };
}

function walker(fetchImpl: FetchLike, maxPages?: number) {
  const read = (after?: string) =>
    fetchTrains(
      { serviceDate: "20260929", version: "1", after },
      { ...base, fetchImpl },
    );
  return {
    first: () => read(),
    cursor: (page: TrainListPage) => page.nextAfter,
    after: (cursor: string) => read(cursor),
    items: (page: TrainListPage): readonly Train[] => page.data,
    identity: (page: TrainListPage) => page.scheduleVersion.id,
    maxPages,
  };
}

describe("bounded continuation", () => {
  it("walks every page and reports the walk complete", async () => {
    const { fetchImpl, urls } = listing({
      "": syntheticTrainPage("1", "cursor-2"),
      "cursor-2": syntheticTrainPage("1", "cursor-3"),
      "cursor-3": syntheticTrainPage("1", null),
    });
    const result = await collectPages(walker(fetchImpl));
    expect(result.pages).toBe(3);
    expect(result.complete).toBe(true);
    expect(result.restarted).toBe(false);
    expect(result.items).toHaveLength(9);
    // Continuation resends the service date and version the cursor came from.
    expect(urls[1]).toContain("after=cursor-2");
    expect(urls[1]).toContain("serviceDate=20260929");
    expect(urls[1]).toContain("version=1");
  });

  it("stops at the page bound and refuses to call the result complete", async () => {
    const { fetchImpl, urls } = listing({
      "": syntheticTrainPage("1", "cursor-2"),
      "cursor-2": syntheticTrainPage("1", "cursor-3"),
      "cursor-3": syntheticTrainPage("1", "cursor-4"),
    });
    const result = await collectPages(walker(fetchImpl, 2));
    expect(result.pages).toBe(2);
    expect(result.complete).toBe(false);
    expect(result.items).toHaveLength(6);
    expect(urls).toHaveLength(2);
  });

  it("never merges pages from different schedule versions", async () => {
    const { fetchImpl } = listing({
      "": syntheticTrainPage("1", "cursor-2"),
      "cursor-2": syntheticTrainPage("2", null),
    });
    const error = await collectPages(walker(fetchImpl)).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).failure).toEqual({
      kind: "mixed_version",
      expected: "1",
      received: "2",
    });
  });

  it("restarts once from no cursor after a conflict", async () => {
    const { fetchImpl, urls } = listing(
      {
        "": syntheticTrainPage("1", "cursor-2"),
        "cursor-2": syntheticTrainPage("1", null),
      },
      1,
    );
    const result = await collectPages(walker(fetchImpl));
    expect(result.restarted).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.items).toHaveLength(6);
    // The conflicting cursor was discarded and the walk began again at the first page.
    expect(urls).toEqual([
      requestUrl("/api/backend", "/api/v1/trains", {
        serviceDate: "20260929",
        version: "1",
      }),
      expect.stringContaining("after=cursor-2"),
      requestUrl("/api/backend", "/api/v1/trains", {
        serviceDate: "20260929",
        version: "1",
      }),
      expect.stringContaining("after=cursor-2"),
    ]);
  });

  it("propagates a second conflict rather than retrying indefinitely", async () => {
    const { fetchImpl, urls } = listing(
      {
        "": syntheticTrainPage("1", "cursor-2"),
        "cursor-2": syntheticTrainPage("1", null),
      },
      2,
    );
    const error = await collectPages(walker(fetchImpl)).catch(
      (caught: unknown) => caught,
    );
    expect((error as BackendError).failure).toMatchObject({
      kind: "http",
      status: 409,
      code: "schedule_changed",
    });
    expect(urls).toHaveLength(4);
  });

  it("bounds a walk by default", () => {
    expect(defaultMaxPages).toBe(10);
  });
});
