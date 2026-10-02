import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapScreen from "../components/map/MapScreen";
import { parseTrainListPage } from "../lib/api/parse";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { resetResources } from "../lib/refresh/store";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/map",
}));

/**
 * The map surface records what it was told to emphasise and follow, so these tests can
 * assert the renderer's instructions without WebGL. The real camera behaviour is covered by
 * tests/e2e/map.spec.ts in a browser.
 */
const surface = vi.hoisted(() => ({
  calls: [] as {
    selectedTrainId: string | null;
    selectedShapeId: string | null;
    follow: boolean;
  }[],
  interrupt: null as null | (() => void),
}));
vi.mock("../components/map/RouteMap", () => ({
  default: (props: {
    label: string;
    selectedTrainId: string | null;
    selectedShapeId: string | null;
    follow: boolean;
    onFollowInterrupted?: () => void;
  }) => {
    surface.calls.push({
      selectedTrainId: props.selectedTrainId,
      selectedShapeId: props.selectedShapeId,
      follow: props.follow,
    });
    surface.interrupt = props.onFollowInterrupted ?? null;
    return <div data-testid="map" aria-label={props.label} />;
  },
}));

const page = parseTrainListPage(capturedBody("trains"));
const drawnTrain = page.data.find((row) => row.position.latitude !== null)!;

function serve(options: { trains?: unknown; detail?: unknown; detailStatus?: number } = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (/\/api\/v1\/trains\/[^?]/.test(url)) {
        return new Response(JSON.stringify(options.detail ?? capturedBody("train-detail")), {
          status: options.detailStatus ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = /\/api\/v1\/routes/.test(url)
        ? capturedBody("routes")
        : /\/api\/v1\/stops/.test(url)
          ? capturedBody("stops")
          : /\/api\/v1\/trains/.test(url)
            ? (options.trains ?? capturedBody("trains"))
            : capturedBody("shapes");
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

function latest() {
  return surface.calls[surface.calls.length - 1];
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
  surface.calls.length = 0;
  surface.interrupt = null;
  resetResources();
});

describe("train focus", () => {
  it("takes the selection from the URL, so a focused train is a shareable link", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve();
    render(<MapScreen />);
    await screen.findByRole("region", { name: new RegExp("Focused train") });
    expect(latest().selectedTrainId).toBe(drawnTrain.id);
  });

  it("emphasises the selected train's own scheduled alignment", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve();
    render(<MapScreen />);
    await screen.findByRole("region", { name: new RegExp("Focused train") });
    expect(latest().selectedShapeId).toBe(drawnTrain.scheduled.shapeId);
  });

  it("emphasises nothing when no train is selected", async () => {
    serve();
    render(<MapScreen />);
    await screen.findByTestId("map");
    expect(latest().selectedTrainId).toBeNull();
    expect(latest().selectedShapeId).toBeNull();
  });

  it("offers an exit that keeps the line filter", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id, routeId: "11704" });
    serve();
    render(<MapScreen />);
    const panel = await screen.findByRole("region", { name: new RegExp("Focused train") });
    const exit = within(panel).getByRole("link", { name: "Exit focus" });
    expect(exit.getAttribute("href")).toBe("/map?routeId=11704");
  });

  it("reads detail once for the selected train, and for no other", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    const calls = serve();
    render(<MapScreen />);
    await screen.findByRole("region", { name: new RegExp("Focused train") });
    await waitFor(() => {
      const detailCalls = calls.filter((url) => /\/api\/v1\/trains\/[^?]/.test(url));
      expect(detailCalls).toHaveLength(1);
      expect(detailCalls[0]).toContain(encodeURIComponent(drawnTrain.id));
    });
  });

  it("makes no detail request at all when nothing is selected", async () => {
    const calls = serve();
    render(<MapScreen />);
    await screen.findByTestId("map");
    expect(calls.filter((url) => /\/api\/v1\/trains\/[^?]/.test(url))).toHaveLength(0);
  });

  it("explains an identifier that is not on this view instead of showing an empty panel", async () => {
    navigation.params = new URLSearchParams({ trainId: "not-a-train" });
    serve();
    render(<MapScreen />);
    expect(await screen.findByText(/That train is not on this view/)).toBeVisible();
    expect(screen.queryByRole("region", { name: /Focused train/ })).toBeNull();
  });

  it("keeps the panel's own facts when the detail read fails", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve({ detailStatus: 500 });
    render(<MapScreen />);
    const panel = await screen.findByRole("region", { name: new RegExp("Focused train") });
    // Identity, trust and official status come from the list and survive a failed detail.
    expect(within(panel).getByText(/Official MTA/)).toBeVisible();
    expect(within(panel).getByRole("link", { name: "Exit focus" })).toBeVisible();
  });
});

describe("follow", () => {
  /** The captured train is retained and stale, which is the case follow must refuse. */
  it("is not offered while the position is out of date", async () => {
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve();
    render(<MapScreen />);
    const panel = await screen.findByRole("region", { name: new RegExp("Focused train") });
    expect(within(panel).queryByRole("button", { name: /Follow train/ })).toBeNull();
    expect(
      within(panel).getByText(/Following is unavailable while the position is out of date/),
    ).toBeVisible();
    expect(latest().follow).toBe(false);
  });

  it("is off until it is chosen, and never follows by default", async () => {
    const body = mutableBody("trains") as {
      data: { membership: { positionFresh: boolean } }[];
    };
    for (const row of body.data) row.membership.positionFresh = true;
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve({ trains: body });
    render(<MapScreen />);
    await screen.findByRole("region", { name: new RegExp("Focused train") });
    expect(latest().follow).toBe(false);
  });

  it("follows once chosen, and stops when the viewer moves the map", async () => {
    const body = mutableBody("trains") as {
      data: { membership: { positionFresh: boolean } }[];
    };
    for (const row of body.data) row.membership.positionFresh = true;
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve({ trains: body });
    render(<MapScreen />);
    const panel = await screen.findByRole("region", { name: new RegExp("Focused train") });

    await userEvent.click(within(panel).getByRole("button", { name: "Follow train" }));
    await waitFor(() => expect(latest().follow).toBe(true));

    // A real pan or zoom. The camera must yield at once rather than fight the gesture.
    surface.interrupt?.();
    await waitFor(() => expect(latest().follow).toBe(false));
    expect(await screen.findByText(/You moved the map, so it has stopped recentring/)).toBeVisible();
  });

  it("offers a deliberate way to resume after the viewer moved the map", async () => {
    const body = mutableBody("trains") as {
      data: { membership: { positionFresh: boolean } }[];
    };
    for (const row of body.data) row.membership.positionFresh = true;
    navigation.params = new URLSearchParams({ trainId: drawnTrain.id });
    serve({ trains: body });
    render(<MapScreen />);
    const panel = await screen.findByRole("region", { name: new RegExp("Focused train") });
    await userEvent.click(within(panel).getByRole("button", { name: "Follow train" }));
    surface.interrupt?.();
    await waitFor(() => expect(latest().follow).toBe(false));

    // Resuming is an explicit choice, never a timer that snatches the viewport back.
    await userEvent.click(within(panel).getByRole("button", { name: "Stop following" }));
    await userEvent.click(within(panel).getByRole("button", { name: "Follow train" }));
    await waitFor(() => expect(latest().follow).toBe(true));
  });
});
