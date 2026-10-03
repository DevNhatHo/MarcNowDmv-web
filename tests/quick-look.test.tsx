import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrainListScreen from "../components/TrainListScreen";
import { parseTrainListPage } from "../lib/api/parse";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { resetResources } from "../lib/refresh/store";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/trains",
}));

const captured = parseTrainListPage(capturedBody("trains"));
const first = captured.data[0];

function serve(options: { detail?: unknown; detailStatus?: number; trains?: unknown } = {}) {
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
          : (options.trains ?? capturedBody("trains"));
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

const detailCalls = (calls: string[]) =>
  calls.filter((url) => /\/api\/v1\/trains\/[^?]/.test(url));

beforeEach(() => {
  // jsdom implements <dialog> but not showModal in every version; make it observable.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
  resetResources();
});

describe("quick look", () => {
  it("is closed until a train is opened, and reads no detail", async () => {
    const calls = serve();
    render(<TrainListScreen />);
    await screen.findByRole("list", { name: "Scheduled trains" });
    expect(screen.queryByRole("dialog")).toBeNull();
    // The whole point of the request rule: nothing is prefetched for rows nobody opened.
    expect(detailCalls(calls)).toHaveLength(0);
  });

  it("opens from the URL and reads detail for that one train only", async () => {
    navigation.params = new URLSearchParams({ preview: first.id });
    const calls = serve();
    render(<TrainListScreen />);
    await screen.findByRole("dialog", { name: new RegExp("Quick look at") });
    await waitFor(() => expect(detailCalls(calls)).toHaveLength(1));
    expect(detailCalls(calls)[0]).toContain(encodeURIComponent(first.id));
  });

  it("offers a close that returns to the list, keeping the filters", async () => {
    navigation.params = new URLSearchParams({ preview: first.id, routeId: "11007" });
    serve();
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    const close = within(dialog).getByRole("link", { name: "Close quick look" });
    const href = close.getAttribute("href") ?? "";
    expect(href).toContain("routeId=11007");
    expect(href).not.toContain("preview=");
  });

  it("leads on to the full train page", async () => {
    navigation.params = new URLSearchParams({ preview: first.id });
    serve();
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    const details = within(dialog).getByRole("link", { name: /View train details/ });
    expect(details.getAttribute("href") ?? "").toMatch(
      new RegExp(`^/trains/${encodeURIComponent(first.id).replace(/[.*+?^$()|[\]\\]/g, "\\$&")}\\?`),
    );
  });

  it("keeps the list usable when the detail read fails", async () => {
    navigation.params = new URLSearchParams({ preview: first.id });
    serve({ detailStatus: 500 });
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    // The facts that come from the list survive a failed detail read.
    expect(within(dialog).getByText(/Official MTA/)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Close quick look" })).toBeVisible();
  });

  it("shows nothing for a preview identifier that is not on this page", async () => {
    navigation.params = new URLSearchParams({ preview: "not-a-train" });
    const calls = serve();
    render(<TrainListScreen />);
    await screen.findByRole("list", { name: "Scheduled trains" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(detailCalls(calls)).toHaveLength(0);
  });

  it("is reachable from the keyboard, with no hover-only content", async () => {
    serve();
    render(<TrainListScreen />);
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    const row = within(list).getAllByRole("link")[0];
    row.focus();
    expect(document.activeElement).toBe(row);
    // The row is a link, so Enter activates it; nothing here depends on a pointer hovering.
    expect(row.getAttribute("href") ?? "").toContain("preview=");
  });

  it("states what a last-known position does and does not mean", async () => {
    const body = mutableBody("trains") as {
      data: { membership: Record<string, boolean> }[];
    };
    body.data[0].membership.positionFresh = false;
    body.data[0].membership.realtimeObserved = true;
    navigation.params = new URLSearchParams({ preview: first.id });
    serve({ trains: body });
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    expect(within(dialog).getByText(/Last known position/)).toBeVisible();
    expect(
      within(dialog).getByText(/not a claim that it has stopped/),
    ).toBeVisible();
  });

  it("never renders an unknown status as on time", async () => {
    const body = mutableBody("trains") as { data: { status: string }[] };
    for (const row of body.data) row.status = "UNKNOWN";
    navigation.params = new URLSearchParams({ preview: first.id });
    serve({ trains: body });
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    expect(within(dialog).queryByText(/On time/)).toBeNull();
  });

  it("labels calculated values as MARC Now, never as the operator's", async () => {
    navigation.params = new URLSearchParams({ preview: first.id });
    serve();
    render(<TrainListScreen />);
    const dialog = await screen.findByRole("dialog", { name: /Quick look at/ });
    await waitFor(() =>
      expect(within(dialog).getAllByText(/MARC Now ·/).length).toBeGreaterThan(0),
    );
    // Official and calculated never share a label.
    for (const node of within(dialog).getAllByText(/MARC Now ·/)) {
      expect(node.textContent ?? "").not.toMatch(/Official MTA/);
    }
  });

  it("reads station names once, however many previews are opened", async () => {
    navigation.params = new URLSearchParams({ preview: first.id });
    const calls = serve();
    const { unmount } = render(<TrainListScreen />);
    await screen.findByRole("dialog", { name: /Quick look at/ });
    await waitFor(() => expect(detailCalls(calls)).toHaveLength(1));
    unmount();
    render(<TrainListScreen />);
    await screen.findByRole("dialog", { name: /Quick look at/ });
    // The catalog read is shared and cached on its own cadence.
    expect(calls.filter((url) => /\/api\/v1\/stops/.test(url)).length).toBeLessThanOrEqual(1);
  });
});
