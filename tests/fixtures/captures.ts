/**
 * Capture-derived fixtures.
 *
 * These read the planning captures in docs/contract-samples directly rather than copying
 * them, so a fixture cannot drift from the response it claims to represent. They are
 * retained official observations from 2026-09-29, not a claim of live freshness: the
 * captured trains are from a completed service date and their realtime evidence is stale
 * or absent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const directory = join(process.cwd(), "docs", "contract-samples");

export interface Capture {
  method: string;
  path: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export function capture(name: string): Capture {
  return JSON.parse(
    readFileSync(join(directory, `${name}.json`), "utf8"),
  ) as Capture;
}

/** The response body alone, which is what a wire parser consumes. */
export function capturedBody(name: string): unknown {
  return capture(name).body;
}

/** A structural clone, for a test that needs to mutate a capture safely. */
export function mutableBody(name: string): Record<string, unknown> {
  return structuredClone(capturedBody(name)) as Record<string, unknown>;
}
