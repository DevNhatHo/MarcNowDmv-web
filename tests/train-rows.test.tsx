import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainListScreen from "../components/TrainListScreen";
import {
  destinationOf,
  isRelevantNow,
  lineLabel,
  tripDelaySeconds,
} from "../lib/presentation/trains";
import { parseTrainListPage } from "../lib/api/parse";
import type { Route } from "../lib/types/catalogs";
import type { Train } from "../lib/types/trains";
import { capturedBody, mutableBody } from "./fixtures/captures";
import { syntheticWeekdayList } from "./fixtures/synthetic";
import { resetResources } from "../lib/refresh/store";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => "/trains",
}));

function serve(trains: unknown = capturedBody("trains")) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = /\/api\/v1\/routes/.test(url) ? capturedBody("routes") : trains;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

const route = (over: Partial<Route>): Route =>
  ({ id: "r", shortName: "MARC", longName: "PENN - WASHINGTON", sortOrder: null, ...over }) as Route;

const captured = parseTrainListPage(capturedBody("trains"));
const sample = captured.data[0];
const withMembership = (train: Train, over: Partial<Train["membership"]>): Train => ({
  ...train,
  membership: { ...train.membership, ...over },
});

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.params = new URLSearchParams();
  resetResources();
});

describe("line and destination are different facts", () => {
  it("shortens the operator's route name rather than inventing one", () => {
    expect(lineLabel(route({}), "r")).toBe("Penn Line");
    expect(lineLabel(route({ longName: "CAMDEN - WASHINGTON" }), "r")).toBe("Camden Line");
  });

  it("keeps a route name that does not split cleanly", () => {
    expect(lineLabel(route({ longName: "MARC SPECIAL" }), "r")).toBe("MARC SPECIAL");
  });

  it("falls back to the identifier when the operator published no name", () => {
    expect(lineLabel(route({ longName: null, shortName: null }), "11705")).toBe("11705");
  });

  it("takes the destination from the headsign, never from the route name", async () => {
    // The capture's Penn trains are headed to WASHINGTON and BALTIMORE on the same route, so
    // a route name rendered as a journey would mislabel half of them.
    serve();
    render(<TrainListScreen />);
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    for (const train of captured.data) {
      const headsign = train.scheduled.headsign;
      if (headsign === null) continue;
      expect(within(list).getAllByText(new RegExp(headsign)).length).toBeGreaterThan(0);
    }
  });

  it("omits a destination the operator did not publish", () => {
    expect(
      destinationOf({ ...sample, scheduled: { ...sample.scheduled, headsign: null } }),
    ).toBeNull();
    expect(
      destinationOf({ ...sample, scheduled: { ...sample.scheduled, headsign: "  " } }),
    ).toBeNull();
  });
});

describe("the Now view", () => {
  it("includes a train inside its scheduled window with no realtime at all", () => {
    expect(
      isRelevantNow(
        withMembership(sample, {
          scheduledActive: true,
          realtimeObserved: false,
          positionFresh: false,
        }),
      ),
    ).toBe(true);
  });

  it("includes a late train still reporting outside its window", () => {
    // MARC-508 observed exactly this. Dropping it would hide the train a commuter most wants.
    expect(
      isRelevantNow(
        withMembership(sample, {
          scheduledActive: false,
          realtimeObserved: true,
          positionFresh: true,
        }),
      ),
    ).toBe(true);
  });

  it("excludes a finished train with a retained stale position", () => {
    expect(
      isRelevantNow(
        withMembership(sample, {
          scheduledActive: false,
          realtimeObserved: true,
          positionFresh: false,
        }),
      ),
    ).toBe(false);
  });

  it("never stores a collapsed active flag on a train", () => {
    const train = withMembership(sample, { scheduledActive: true });
    expect(train).not.toHaveProperty("active");
    expect(Object.keys(train.membership).sort()).toEqual([
      "positionFresh",
      "realtimeObserved",
      "scheduledActive",
    ]);
  });

  it("defaults to Today and shows the whole service date", async () => {
    serve();
    render(<TrainListScreen />);
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(captured.data.length);
    expect(screen.getByText(/including\s+services that have already finished/)).toBeVisible();
  });

  it("states what Now filtered on, and never calls it running", async () => {
    navigation.params = new URLSearchParams({ when: "now" });
    serve();
    render(<TrainListScreen />);
    const rule = await screen.findByText(/Scheduled to be running now, or still reporting/);
    expect(rule).toBeVisible();
    expect(rule.textContent ?? "").toMatch(/not a claim that a train is running/);
  });

  it("explains an empty Now instead of looking broken", async () => {
    const body = mutableBody("trains") as {
      data: { membership: Record<string, boolean> }[];
    };
    for (const row of body.data) {
      row.membership.scheduledActive = false;
      row.membership.positionFresh = false;
    }
    navigation.params = new URLSearchParams({ when: "now" });
    serve(body);
    render(<TrainListScreen />);
    const notice = await screen.findByText(/No trains are scheduled or reporting right now/);
    expect(notice).toBeVisible();
    expect(
      screen.getByText(/not a statement about whether trains are running/),
    ).toBeVisible();
  });

  it("filters the page it already has, issuing no extra request", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const body = /\/api\/v1\/routes/.test(url) ? capturedBody("routes") : capturedBody("trains");
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    navigation.params = new URLSearchParams({ when: "now" });
    render(<TrainListScreen />);
    await screen.findByText(/Scheduled to be running now/);
    expect(calls.filter((url) => /\/api\/v1\/trains/.test(url))).toHaveLength(1);
  });
});

describe("what a row may claim", () => {
  it("shows no trip delay when the operator published none", () => {
    expect(tripDelaySeconds({ ...sample, official: { ...sample.official, delaySeconds: null } }))
      .toBeNull();
  });

  it("never renders an unknown status as on time", async () => {
    const body = mutableBody("trains") as { data: { status: string }[] };
    for (const row of body.data) row.status = "UNKNOWN";
    serve(body);
    render(<TrainListScreen />);
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    expect(within(list).queryByText(/On time/)).toBeNull();
  });

  it("gives each row one interaction, with no nested control", async () => {
    serve();
    const { container } = render(<TrainListScreen />);
    await screen.findByRole("list", { name: "Scheduled trains" });
    for (const item of container.querySelectorAll('[aria-label="Scheduled trains"] > li')) {
      expect(item.querySelectorAll("a")).toHaveLength(1);
      expect(item.querySelector("button")).toBeNull();
    }
  });
});

describe("density", () => {
  it("renders a weekday-sized list without a container per train", async () => {
    // SYNTHETIC: 97 generated rows, not observed MARC service.
    serve(syntheticWeekdayList(capturedBody("trains") as Record<string, unknown>, 97));
    const { container } = render(<TrainListScreen />);
    const list = await screen.findByRole("list", { name: "Scheduled trains" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(97);
    // One rule per row, not a bordered box around each.
    expect(container.querySelectorAll('[aria-label="Scheduled trains"] > li').length).toBe(97);
  });
});
