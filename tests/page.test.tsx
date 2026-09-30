import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../app/page";

describe("starter page", () => {
  it("identifies the service inside the main landmark", () => {
    render(<Home />);
    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        level: 1,
        name: "MARC Now DMV",
      }),
    ).toBeVisible();
  });

  it("explains that live information is not yet available", () => {
    render(<Home />);
    expect(
      screen.getByText(/Live service information is not available here yet/),
    ).toBeVisible();
  });
});
