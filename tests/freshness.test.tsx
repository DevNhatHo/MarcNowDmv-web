import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Freshness from "../components/Freshness";

const now = new Date("2026-10-03T12:00:00Z");
const loadedAt = new Date("2026-10-03T11:59:50Z");

function renderBar(overrides: Partial<Parameters<typeof Freshness>[0]> = {}) {
  const onRefresh = vi.fn();
  render(
    <Freshness
      loadedAt={loadedAt}
      outdated={false}
      loading={false}
      failed={false}
      onRefresh={onRefresh}
      now={now}
      {...overrides}
    />,
  );
  return onRefresh;
}

describe("the refresh line", () => {
  it("offers a named control, not a bare glyph", async () => {
    // The visible mark is compact; the accessible name must still say what it does.
    const onRefresh = renderBar();
    const button = screen.getByRole("button", { name: /refresh/i });
    await userEvent.click(button);
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("states when the copy on screen was received", () => {
    renderBar();
    expect(screen.getByText(/Received/)).toBeVisible();
  });

  it("says a failed refresh kept the content rather than losing it", () => {
    renderBar({ failed: true });
    // Said twice on purpose: once to the live region for assistive technology, once
    // visibly. Both must carry it, so this asserts the pair rather than picking one.
    const announced = document.querySelector('[aria-live="polite"]');
    expect(announced?.textContent ?? "").toMatch(/Couldn.t refresh/);
    const visible = screen
      .getAllByText(/Couldn.t refresh/)
      .filter((node) => !node.classList.contains("visually-hidden"));
    expect(visible).toHaveLength(1);
    // The visible line and the announcement word it differently on purpose: one is read
    // aloud once on the state change, the other is read at leisure beside a timestamp.
    expect(visible[0].textContent ?? "").toMatch(/Showing information received/);
  });

  it("says plainly when the copy on screen is out of date", () => {
    renderBar({ outdated: true });
    const visible = screen
      .getAllByText(/out of date/)
      .filter((node) => !node.classList.contains("visually-hidden"));
    expect(visible).toHaveLength(1);
  });

  it("announces only a state change, never each passing tick", () => {
    const { unmount } = render(
      <Freshness
        loadedAt={loadedAt}
        outdated={false}
        loading={false}
        failed={false}
        onRefresh={vi.fn()}
        now={now}
      />,
    );
    // Healthy and current: the live region carries nothing, so an aging timestamp is not
    // read aloud every time it changes.
    const live = document.querySelector('[aria-live="polite"]');
    expect((live?.textContent ?? "").trim()).toBe("");
    unmount();

    render(
      <Freshness
        loadedAt={loadedAt}
        outdated={false}
        loading={true}
        failed={true}
        onRefresh={vi.fn()}
        now={now}
      />,
    );
    expect(
      (document.querySelector('[aria-live="polite"]')?.textContent ?? "").trim(),
    ).toMatch(/Couldn.t refresh/);
  });

  it("disables the control while a refresh is in flight", () => {
    renderBar({ loading: true });
    expect(screen.getByRole("button", { name: /refreshing/i })).toBeDisabled();
  });

  it("renders nothing before anything has been received", () => {
    const { container } = render(
      <Freshness
        loadedAt={null}
        outdated={false}
        loading={false}
        failed={false}
        onRefresh={vi.fn()}
        now={now}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
