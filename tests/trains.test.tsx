import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrainListScreen from "../components/TrainListScreen";
import TrainDetailScreen from "../components/TrainDetailScreen";
import { capturedBody, mutableBody } from "./fixtures/captures";
import type { TrainListPage } from "../lib/types/trains";
import { syntheticEmptyDetail, syntheticUnresolvedUpdate } from "./fixtures/synthetic";
import { resetResources } from "../lib/refresh/store";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/trains",
}));

/** Routes each request to a body by path, so a screen exercises the real client. */
function serve(routes: Array<[RegExp, unknown, number?]>) {
  const calls: string[] = [];
  const impl = vi.fn(async (url: string) => {
    calls.push(url);
    for (const [pattern, body, status] of routes) {
      if (pattern.test(url)) {
        return new Response(JSON.stringify(body), {
          status: status ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    throw new Error(`unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", impl);
  return calls;
}

/**
 * The captured list's own service date. Read from the sample rather than written as a
 * literal, so re-capturing against the local backend cannot silently break tests that are
 * not about the date.
 */
const capturedServiceDate = (capturedBody("trains") as TrainListPage).serviceDate;

const listRoutes = (page: unknown = capturedBody("trains")) =>
  [
    [/\/api\/v1\/trains(\?|$)/, page],
    [/\/api\/v1\/routes/, capturedBody("routes")],
  ] as Array<[RegExp, unknown, number?]>;

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.replace.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("train list", () => {
  it("lists scheduled trains and says the list is a whole service day", async () => {
    serve(listRoutes());
    render(<TrainListScreen />);
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(
      screen.getByText(/including\s+services that have already finished/i),
    ).toBeVisible();
    expect(screen.getByText(/not a list of trains running now/i)).toBeVisible();
  });

  it("orders rows by scheduled departure, not by the backend's page order", async () => {
    serve(listRoutes());
    render(<TrainListScreen />);
    const rows = await screen.findAllByRole("listitem");
    const times = rows.map((row) => row.textContent?.slice(0, 5) ?? "");
    expect([...times]).toEqual([...times].sort());
    expect(screen.getByText(/ordered by\s+scheduled departure/)).toBeVisible();
  });

  it("never renders stale or unknown official evidence as On time", async () => {
    serve(listRoutes());
    render(<TrainListScreen />);
    await screen.findAllByRole("listitem");
    // The capture's rows are retained evidence with no current claim.
    expect(screen.queryByText("On time")).toBeNull();
    expect(screen.getAllByText("Realtime status unavailable").length).toBeGreaterThan(0);
  });

  it("shows a published zero delay differently from no published delay", async () => {
    const page = mutableBody("trains");
    const rows = page.data as Record<string, unknown>[];
    const withZero = rows[0].official as Record<string, unknown>;
    withZero.delaySeconds = 0;
    withZero.freshness = "FRESH";
    serve(listRoutes(page));
    render(<TrainListScreen />);
    expect(await screen.findByText(/Official MTA · No delay$/)).toBeVisible();
    expect(screen.queryByText(/Official MTA · No delay reported/)).toBeNull();
  });

  it("opens a preview from each row, keeping the active filters", async () => {
    navigation.params = new URLSearchParams({
      serviceDate: capturedServiceDate,
      routeId: "11007",
    });
    serve(listRoutes());
    render(<TrainListScreen />);
    // A row opens the contextual preview rather than navigating away; the preview itself
    // carries the link on to the full page. One interaction per row, and it is URL-backed.
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    const links = within(list).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/trains\?/);
      expect(href).toContain("preview=");
      expect(href).toContain(`serviceDate=${capturedServiceDate}`);
      expect(href).toContain("routeId=11007");
    }
  });

  it("requests the filters from the URL", async () => {
    navigation.params = new URLSearchParams({ serviceDate: "20260928", routeId: "11007" });
    const calls = serve(listRoutes(capturedBody("previous-service-date")));
    render(<TrainListScreen />);
    await screen.findAllByRole("listitem");
    expect(calls[0]).toContain("serviceDate=20260928");
    expect(calls[0]).toContain("routeId=11007");
  });

  it("says plainly when a date and filter have no scheduled trains", async () => {
    const page = mutableBody("trains");
    page.data = [];
    page.nextAfter = null;
    serve(listRoutes(page));
    render(<TrainListScreen />);
    expect(await screen.findByText(/No scheduled trains for/)).toBeVisible();
    // Absence of scheduled trains is never phrased as absence of running trains.
    expect(screen.queryByText(/no active trains/i)).toBeNull();
  });

  it("identifies a partial page and never calls it a complete total", async () => {
    serve(listRoutes());
    render(<TrainListScreen />);
    expect(await screen.findByText(/More are available for this\s+service date/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Load more trains" })).toBeVisible();
  });

  it("continues with the service date and version the cursor came from", async () => {
    const second = mutableBody("trains");
    second.nextAfter = null;
    let call = 0;
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const body = /\/routes/.test(url)
          ? capturedBody("routes")
          : call++ === 0
            ? capturedBody("trains")
            : second;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    render(<TrainListScreen />);
    await screen.findByRole("button", { name: "Load more trains" });
    await userEvent.click(screen.getByRole("button", { name: "Load more trains" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(6));
    const continuation = calls.find((url) => url.includes("after="));
    expect(continuation).toContain(`serviceDate=${capturedServiceDate}`);
    expect(continuation).toContain("version=1");
    expect(screen.getByText(/All 6 scheduled trains/)).toBeVisible();
  });

  it("refuses to merge a page from a different schedule version", async () => {
    const other = mutableBody("trains");
    (other.scheduleVersion as Record<string, unknown>).id = "2";
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        new Response(
          JSON.stringify(
            /\/routes/.test(url)
              ? capturedBody("routes")
              : call++ === 0
                ? capturedBody("trains")
                : other,
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<TrainListScreen />);
    await screen.findByRole("button", { name: "Load more trains" });
    await userEvent.click(screen.getByRole("button", { name: "Load more trains" }));
    expect(await screen.findByText(/schedule changed while loading more/i)).toBeVisible();
    // The superseded page was not appended.
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("explains a failure and offers a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "invalid_query", message: "bad" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<TrainListScreen />);
    expect(await screen.findByText("That filter isn't valid")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

describe("train detail", () => {
  const detailRoutes = (detail: unknown = capturedBody("train-detail")) =>
    [
      [/\/api\/v1\/trains\//, detail],
      [/\/api\/v1\/stops/, capturedBody("stops")],
      [/\/api\/v1\/routes/, capturedBody("routes")],
      // The embedded focused map reads this train's own alignment, on the catalog cadence.
      [/\/api\/v1\/shapes/, capturedBody("shapes")],
    ] as Array<[RegExp, unknown, number?]>;

  it("keeps scheduled times and official estimates separately labelled", async () => {
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByRole("heading", { level: 2, name: "Stop times" })).toBeVisible();
    expect(screen.getAllByText(/Official estimate/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Scheduled times are from the published timetable/),
    ).toBeVisible();
    expect(screen.getByText(/nothing here is calculated/)).toBeVisible();
  });

  it("does not present a retained ON_TIME as the current claim", async () => {
    const detail = mutableBody("train-detail");
    const train = detail.data as Record<string, unknown>;
    (train.official as Record<string, unknown>).status = "ON_TIME";
    train.status = "UNKNOWN";
    serve(detailRoutes(detail));
    render(<TrainDetailScreen id="token" />);
    // The dominant claim is the top-level status.
    expect(
      await screen.findByRole("heading", { level: 1, name: (detail.data as { tripId: string }).tripId }),
    ).toBeVisible();
    // The capture carries per-stop delays, so the dominant line names what is missing
    // rather than claiming nothing is known.
    expect(screen.getByText("No overall status reported")).toBeVisible();
    expect(screen.getByText(/last published .On time./)).toBeVisible();
    expect(screen.getByText(/no longer current/)).toBeVisible();
  });

  it("describes a retained coordinate as last reported", async () => {
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Last reported location")).toBeVisible();
    // The coordinate sits beside its age in one paragraph, so match the container's text.
    expect(
      screen.getByText((_content, element) =>
        (element?.textContent ?? "").startsWith("39.14573, -76.78135 · "),
      ),
    ).toBeInTheDocument();
  });

  it("stays useful when every realtime value is absent", async () => {
    serve(detailRoutes(syntheticEmptyDetail()));
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Position unavailable")).toBeVisible();
    expect(screen.getByText(/No position has been reported/)).toBeVisible();
    expect(screen.getByText("Realtime status unavailable")).toBeVisible();
    expect(screen.getByText(/No delay reported/)).toBeVisible();
  });

  it("does not place an unresolved official update on the schedule", async () => {
    serve(detailRoutes(syntheticUnresolvedUpdate()));
    render(<TrainDetailScreen id="token" />);
    expect(
      await screen.findByText(/1 official update could not be matched to a scheduled stop/),
    ).toBeVisible();
    expect(screen.queryByText(/Official estimate/)).toBeNull();
  });

  it("marks an officially skipped call without advancing past it", async () => {
    const detail = mutableBody("train-detail");
    const updates = detail.officialStopUpdates as Record<string, unknown>[];
    updates[0].scheduleRelationship = 1;
    serve(detailRoutes(detail));
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("Reported skipped")).toBeVisible();
  });

  it("offers a back link that restores the list filters", async () => {
    navigation.params = new URLSearchParams({ serviceDate: "20260928", routeId: "11007" });
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const back = await screen.findByRole("link", { name: /Back to trains/ });
    expect(back).toHaveAttribute("href", "/trains?serviceDate=20260928&routeId=11007");
  });

  it("explains a missing train instead of showing an empty page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "not_found", message: "no" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<TrainDetailScreen id="gone" />);
    expect(await screen.findByText("That train isn't available")).toBeVisible();
  });

  /** A catalog that genuinely names one of this train's stops, under a chosen version. */
  function stopsNaming(stopId: string, version: string) {
    const stops = mutableBody("stops");
    (stops.scheduleVersion as Record<string, unknown>).id = version;
    const rows = stops.data as Record<string, unknown>[];
    rows[0].id = stopId;
    rows[0].name = "BALTIMORE PENN STATION";
    return stops;
  }

  it("uses a catalog name only when the schedule versions match", async () => {
    const detail = capturedBody("train-detail") as {
      scheduledStops: { stopId: string }[];
      data: { scheduleVersion: string };
    };
    const first = detail.scheduledStops[0].stopId;
    const version = detail.data.scheduleVersion;

    serve([
      [/\/api\/v1\/trains\//, detail],
      [/\/api\/v1\/stops/, stopsNaming(first, version)],
      [/\/api\/v1\/routes/, capturedBody("routes")],
    ]);
    const matching = render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText("BALTIMORE PENN STATION")).toBeVisible();
    matching.unmount();
    resetResources();

    // The same catalog under a different version must not lend its name to this train.
    serve([
      [/\/api\/v1\/trains\//, detail],
      [/\/api\/v1\/stops/, stopsNaming(first, "99")],
      [/\/api\/v1\/routes/, capturedBody("routes")],
    ]);
    render(<TrainDetailScreen id="token" />);
    expect(await screen.findByText(first)).toBeVisible();
    expect(screen.queryByText("BALTIMORE PENN STATION")).toBeNull();
  });

  it("reports feed health in a secondary disclosure", async () => {
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const disclosure = await screen.findByText("Data status");
    expect(disclosure.tagName).toBe("SUMMARY");
    expect(disclosure.closest("details")?.open).toBe(false);
  });
});
