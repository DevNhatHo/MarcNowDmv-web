/**
 * Request limits the backend enforces, checked here so a request that is certain to be
 * rejected never leaves the browser and a caller gets a typed usage failure instead of an
 * opaque 400.
 */
import { BackendError } from "./errors";

export const maxLimit = 200;
export const defaultLimit = 50;

export function usage(detail: string): BackendError {
  return new BackendError({ kind: "usage", detail });
}

export function checkLimit(limit: number | undefined): void {
  if (limit === undefined) return;
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw usage(`limit must be a whole number between 1 and ${maxLimit}`);
  }
}

/** A nonnegative whole cursor ordinal, as the detail cursors require. */
export function checkOrdinal(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw usage(`${name} must be a whole number of at least 0`);
  }
}
