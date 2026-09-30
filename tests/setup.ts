import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetResources } from "../lib/refresh/store";

afterEach(() => {
  cleanup();
  // The refresh store is shared across the whole app by design, so each test must start
  // from an empty one or it would render a previous test's cached response.
  resetResources();
});
