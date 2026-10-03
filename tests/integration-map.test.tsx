import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainDetailScreen from "../components/TrainDetailScreen";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { resetResources } from "../lib/refresh/store";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/trains/token",
}));

const surface = vi.hoisted(() => ({ rendered: 0, shapeIds: [] as (string | null)[] }));
vi.mock("../components/map/RouteMap", () => ({
  default: (props: { label: string; selectedShapeId: string | null }) => {
    surface.rendered += 1;
    surface.shapeIds.push(props.selectedShapeId);
    return <div data-testid="detail-map" aria-label={props.label} />;
  },
}));

function serve(routes: Array<[RegExp, unknown, number?]>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
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
    }),
  );
  return calls;
}

const detailRoutes = (detail: unknown = capturedBody("train-detail")) =>
  [
    [/\/api\/v1\/trains\//, detail],
    [/\/api\/v1\/stops/, capturedBody("stops")],
    [/\/api\/v1\/routes/, capturedBody("routes")],
    [/\/api\/v1\/shapes/, capturedBody("shapes")],
  ] as Array<[RegExp, unknown, number?]>;

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
  surface.rendered = 0;
  surface.shapeIds.length = 0;
  resetResources();
});

describe("map and detail are one journey", () => {
  it("returns to the map, still focused, when the reader came from it", async () => {
    navigation.params = new URLSearchParams({ from: "map", routeId: "11704" });
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const back = await screen.findByRole("link", { name: "← Back to map" });
    const href = back.getAttribute("href") ?? "";
    expect(href).toContain("/map?");
    expect(href).toContain("routeId=11704");
    expect(href).toContain("trainId=token");
    // The navigation hint is not carried into the destination.
    expect(href).not.toContain("from=map");
  });

  it("returns to the list, with its filters, when the reader came from there", async () => {
    navigation.params = new URLSearchParams({ serviceDate: "20261002", routeId: "11704" });
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const back = await screen.findByRole("link", { name: "← Back to trains" });
    const href = back.getAttribute("href") ?? "";
    expect(href).toContain("/trains?");
    expect(href).toContain("serviceDate=20261002");
    expect(href).toContain("routeId=11704");
  });

  it("drops the list's service date when returning to the map, which has no such filter", async () => {
    navigation.params = new URLSearchParams({ from: "map", serviceDate: "20261002" });
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const back = await screen.findByRole("link", { name: "← Back to map" });
    expect(back.getAttribute("href") ?? "").not.toContain("serviceDate");
  });

  it("offers the system map from detail", async () => {
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    const link = await screen.findByRole("link", { name: /See this train on the system map/ });
    // The backend's own train identity, not the URL token it was reached by.
    const detail = capturedBody("train-detail") as { data: { id: string } };
    expect(link.getAttribute("href")).toBe(
      `/map?trainId=${encodeURIComponent(detail.data.id)}`,
    );
  });

  it("draws this train on its own scheduled alignment", async () => {
    serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    await waitFor(() => expect(screen.getByTestId("detail-map")).toBeVisible());
    const detail = capturedBody("train-detail") as {
      data: { scheduled: { shapeId: string | null } };
    };
    expect(surface.shapeIds.at(-1)).toBe(detail.data.scheduled.shapeId);
  });

  it("reads the alignment once, on the catalog cadence, not per refresh", async () => {
    const calls = serve(detailRoutes());
    render(<TrainDetailScreen id="token" />);
    await waitFor(() => expect(screen.getByTestId("detail-map")).toBeVisible());
    expect(calls.filter((url) => /\/api\/v1\/shapes/.test(url))).toHaveLength(1);
  });

  it("stays complete when the map cannot be drawn", async () => {
    serve([...detailRoutes().filter(([p]) => !/shapes/.test(String(p))), [/\/api\/v1\/shapes/, {}, 500]]);
    render(<TrainDetailScreen id="token" />);
    // The screen's own facts are unaffected: nothing is available only on the map.
    expect(await screen.findByRole("heading", { level: 2, name: "Movement and location" })).toBeVisible();
    expect(screen.getByText(/route geometry could not be read/)).toBeVisible();
  });

  it("says plainly when a train has no published alignment, without implying it is not running", async () => {
    const detail = mutableBody("train-detail") as {
      data: { scheduled: { shapeId: string | null } };
    };
    detail.data.scheduled.shapeId = null;
    serve(detailRoutes(detail));
    render(<TrainDetailScreen id="token" />);
    const note = await screen.findByText(/publishes no alignment for this train/);
    expect(note).toBeVisible();
    expect(note.textContent ?? "").toMatch(/not a statement about whether it is running/);
  });

  it("borrows no station or line name from a different schedule version", async () => {
    const detail = mutableBody("train-detail") as { data: { scheduleVersion: string } };
    detail.data.scheduleVersion = "999";
    serve(detailRoutes(detail));
    render(<TrainDetailScreen id="token" />);
    await waitFor(() => expect(screen.getByTestId("detail-map")).toBeVisible());
    // The map still draws, but with no catalog names attached to it.
    expect(surface.rendered).toBeGreaterThan(0);
  });
});
