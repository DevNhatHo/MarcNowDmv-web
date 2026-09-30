import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppShell, { independenceNotice } from "../components/AppShell";
import { isCurrent } from "../components/SiteNavigation";
import AlertsPage from "../app/alerts/page";
import PulsePage from "../app/page";
import TrainsPage from "../app/trains/page";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

beforeEach(() => {
  pathname.value = "/";
});

function renderShell(children: React.ReactNode = <p>content</p>) {
  return render(<AppShell>{children}</AppShell>);
}

describe("application shell", () => {
  it("provides the landmarks a page needs", () => {
    renderShell();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("offers a skip link that targets the main landmark", () => {
    renderShell();
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    // The skip link must come first, so it is the first thing a keyboard reaches.
    expect(skip.compareDocumentPosition(screen.getByRole("banner"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("links all three destinations from the header", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Pulse", "/"],
      ["Trains", "/trains"],
      ["Alerts", "/alerts"],
    ]);
  });

  it("keeps the brand a link rather than a competing heading", () => {
    renderShell(<h1>Trains</h1>);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "MARC Now DMV" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(banner).queryByRole("heading")).toBeNull();
    // Exactly one first-level heading, and it names what the page answers.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("states the independence notice exactly once, verbatim", () => {
    renderShell();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(independenceNotice)).toBeVisible();
    expect(independenceNotice).toBe(
      "MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.",
    );
    expect(screen.getAllByText(independenceNotice)).toHaveLength(1);
  });
});

describe("current destination", () => {
  it("marks only the active destination", () => {
    pathname.value = "/trains";
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const current = within(nav).getAllByRole("link").filter(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(current.map((link) => link.textContent)).toEqual(["Trains"]);
  });

  it("treats a nested route as part of its section", () => {
    // Train detail must keep Trains current, while home matches exactly.
    expect(isCurrent("/trains/abc123", "/trains")).toBe(true);
    expect(isCurrent("/trains", "/trains")).toBe(true);
    expect(isCurrent("/trains/abc123", "/")).toBe(false);
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/alerts", "/trains")).toBe(false);
    // A sibling route that merely shares a prefix is not the same section.
    expect(isCurrent("/trainspotting", "/trains")).toBe(false);
  });
});

describe("route placeholders", () => {
  it.each([
    ["Pulse", PulsePage, "MARC Pulse", "How is MARC running right now?"],
    ["Trains", TrainsPage, "Trains", "Which train do I care about?"],
    ["Alerts", AlertsPage, "Alerts", "Is there anything important I need to know?"],
  ])("says plainly that %s is not built yet", (_name, Page, title, question) => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(screen.getByText(question)).toBeVisible();
    expect(screen.getByText("Not built yet")).toBeVisible();
  });

  it("explains that an empty screen is not an operational claim", () => {
    render(<TrainsPage />);
    expect(
      screen.getByText(/means the screen is unfinished, not that no trains are scheduled/),
    ).toBeVisible();
    render(<AlertsPage />);
    expect(
      screen.getByText(/not evidence that there are no disruptions/),
    ).toBeVisible();
  });

  it("shows no figure that could be mistaken for reported data", () => {
    const { container } = render(<PulsePage />);
    // A placeholder with digits in it would read as a count, a delay or a time.
    expect(container.textContent).not.toMatch(/\d/);
  });
});
