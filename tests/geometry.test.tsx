import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapScreen from "../components/map/MapScreen";
import { fetchShapes } from "../lib/api/geometry";
import { parseShapePage } from "../lib/api/parse";
import { isAllowedPath } from "../lib/api/paths";
import { BackendError } from "../lib/api/errors";
import { capturedBody, mutableBody } from "./fixtures/captures";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/map",
}));

// MapLibre needs WebGL and touches window at module scope, so it draws nothing useful in
// jsdom and the map surface is stubbed. What these tests check is the data path and the text
// equivalent, which is what a commuter without a working map actually relies on. The marker
// layer's own behaviour is covered by tests/e2e/map.spec.ts, which has a real browser.
vi.mock("../components/map/RouteMap", () => ({
  default: ({ label }: { label: string }) => <div data-testid="map" aria-label={label} />,
}));

const base = { baseUrl: "/api/backend" };

function serve(shapes: unknown, trains: unknown = capturedBody("trains")) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const body = /\/api\/v1\/routes/.test(url)
        ? capturedBody("routes")
        : /\/api\/v1\/stops/.test(url)
          ? capturedBody("stops")
          : /\/api\/v1\/trains/.test(url)
            ? trains
            : shapes;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

function contractPath(parse: () => unknown): string {
  try {
    parse();
  } catch (error) {
    if (error instanceof BackendError && error.failure.kind === "contract") {
      return error.failure.path;
    }
    throw error;
  }
  throw new Error("expected a contract failure");
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
});

describe("geometry contract", () => {
  it("parses the captured shape page", () => {
    const page = parseShapePage(capturedBody("shapes"));
    expect(page.provenance).toBe("SCHEDULED");
    const shape = page.data[0];
    expect(shape.shapeId).toBe("116473");
    expect(shape.geometry.type).toBe("LineString");
    expect(shape.geometry.coordinates).toHaveLength(4);
  });

  it("keeps coordinates in GeoJSON longitude-first order", () => {
    const page = parseShapePage(capturedBody("shapes"));
    const [longitude, latitude] = page.data[0].geometry.coordinates[0];
    // MARC sits near -77 longitude and +39 latitude. A transposed pair would be obvious.
    expect(longitude).toBeCloseTo(-77, 1);
    expect(latitude).toBeCloseTo(39, 1);
    expect(longitude).toBeLessThan(0);
    expect(latitude).toBeGreaterThan(0);
  });

  it("refuses geometry that is not a drawable line", () => {
    const single = mutableBody("shapes");
    (single.data as Record<string, unknown>[])[0].geometry = {
      type: "LineString",
      coordinates: [[-77, 39]],
    };
    // One point is not a route; drawing it would invent a segment the feed does not have.
    expect(contractPath(() => parseShapePage(single))).toBe("shapes.data[0].geometry.coordinates");

    const polygon = mutableBody("shapes");
    (polygon.data as Record<string, unknown>[])[0].geometry = {
      type: "Polygon",
      coordinates: [[-77, 39], [-76, 39]],
    };
    expect(contractPath(() => parseShapePage(polygon))).toBe("shapes.data[0].geometry.type");

    const malformed = mutableBody("shapes");
    (malformed.data as Record<string, unknown>[])[0].geometry = {
      type: "LineString",
      coordinates: [[-77], [-76, 39]],
    };
    expect(contractPath(() => parseShapePage(malformed))).toBe(
      "shapes.data[0].geometry.coordinates[0]",
    );

    const missing = mutableBody("shapes");
    delete (missing.data as Record<string, unknown>[])[0].geometry;
    expect(contractPath(() => parseShapePage(missing))).toBe("shapes.data[0].geometry");
  });

  it("is reachable through the proxy allowlist", () => {
    expect(isAllowedPath("/api/v1/shapes")).toBe(true);
    expect(isAllowedPath("/api/v1/shapes/116473")).toBe(false);
  });

  it("refuses a cursor without the version it came from", async () => {
    const calls = serve(capturedBody("shapes"));
    await expect(fetchShapes({ after: "116473" }, base)).rejects.toMatchObject({
      failure: { kind: "usage" },
    });
    expect(calls).toHaveLength(0);
  });
});

describe("map screen", () => {
  it("draws the published alignments and offers the lines as text", async () => {
    serve(capturedBody("shapes"));
    render(<MapScreen />);
    expect(await screen.findByTestId("map")).toBeVisible();
    // The text equivalent of the map is the set of lines, which is what a commuter can use.
    const lines = screen.getByRole("list", { name: "MARC lines" });
    expect(within(lines).getAllByRole("listitem").length).toBeGreaterThan(0);
    // Geometry statistics are secondary now: present, reachable, and behind a closed
    // disclosure rather than competing with the map.
    const details = screen.getByText("Map data details").closest("details");
    expect(details?.open).toBe(false);
    expect(
      screen.getByText(/One alignment is drawn, from schedule version 1/),
    ).toBeInTheDocument();
    expect(details?.textContent).toContain("Shape 116473");
    expect(details?.textContent).toContain("54.2 km");
  });

  it("says plainly that geometry is not a train position", async () => {
    serve(capturedBody("shapes"));
    render(<MapScreen />);
    await screen.findByTestId("map");
    expect(
      screen.getByText(/not where any train is now/),
    ).toBeVisible();
  });

  it("says the alignment total is not the length of the network", async () => {
    serve(capturedBody("shapes"));
    render(<MapScreen />);
    await screen.findByTestId("map");
    // Several alignments per line cover the same track, so the sum is not a network length.
    // It stays with the figure it qualifies, inside the Map data details disclosure, and is
    // visible the moment that is opened.
    const caveat = screen.getByText(
      /counts the same track more than once and is not the length of the/,
    );
    expect(caveat).toBeInTheDocument();
    await userEvent.click(screen.getByText("Map data details"));
    expect(caveat).toBeVisible();
  });

  it("reads geometry once, on the catalog cadence, not per refresh tick", async () => {
    const calls = serve(capturedBody("shapes"));
    render(<MapScreen />);
    await screen.findByTestId("map");
    // One geometry read and one catalog read; geometry is immutable for a version.
    expect(calls.filter((url) => url.includes("/shapes"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("after="))).toHaveLength(0);
  });

  it("passes a line filter through to the geometry read", async () => {
    navigation.params = new URLSearchParams({ routeId: "11704" });
    const calls = serve(capturedBody("shapes"));
    render(<MapScreen />);
    await screen.findByTestId("map");
    expect(calls.find((url) => url.includes("/shapes"))).toContain("routeId=11704");
  });

  it("explains an absent alignment without implying anything about service", async () => {
    const empty = mutableBody("shapes");
    empty.data = [];
    empty.nextAfter = null;
    serve(empty);
    render(<MapScreen />);
    expect(await screen.findByText("No route geometry published")).toBeVisible();
    expect(
      screen.getByText(/not a statement about whether trains are running/),
    ).toBeVisible();
    expect(screen.queryByTestId("map")).toBeNull();
  });

  it("explains a failure and offers a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "schedule_changed", message: "x" } }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<MapScreen />);
    expect(await screen.findByText("The schedule changed while loading")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
