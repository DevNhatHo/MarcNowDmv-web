/**
 * Typed backend failures.
 *
 * Every failure is one of a closed set of kinds so a caller can react without matching on
 * message text. The `Error` message is deliberately generic; backend wording and contract
 * paths stay in `failure` for diagnostics, because technical detail is not commuter copy.
 */

/** A response the backend itself rejected, carrying its error envelope code. */
export interface HttpFailure {
  kind: "http";
  status: number;
  code: string;
  /** Backend wording. Diagnostic only; never rendered as commuter copy. */
  detail: string;
}

/** The response did not match the verified contract, so it cannot be trusted at all. */
export interface ContractFailure {
  kind: "contract";
  path: string;
  detail: string;
}

/** Pages from different schedule versions or snapshots must never be merged. */
export interface MixedVersionFailure {
  kind: "mixed_version";
  expected: string;
  received: string;
}

/** The caller asked for something the verified contract cannot express. */
export interface UsageFailure {
  kind: "usage";
  detail: string;
}

export interface TransportFailure {
  kind: "transport";
}

export interface TimeoutFailure {
  kind: "timeout";
  timeoutMs: number;
}

export interface AbortedFailure {
  kind: "aborted";
}

export type Failure =
  | HttpFailure
  | ContractFailure
  | MixedVersionFailure
  | UsageFailure
  | TransportFailure
  | TimeoutFailure
  | AbortedFailure;

function summarize(failure: Failure): string {
  switch (failure.kind) {
    case "http":
      return `backend responded ${failure.status} (${failure.code})`;
    case "contract":
      return `unexpected response shape at ${failure.path}`;
    case "mixed_version":
      return "response pages came from different schedule versions";
    case "usage":
      return `unsupported request: ${failure.detail}`;
    case "transport":
      return "backend could not be reached";
    case "timeout":
      return `backend did not respond within ${failure.timeoutMs} ms`;
    case "aborted":
      return "request was cancelled";
  }
}

export class BackendError extends Error {
  readonly failure: Failure;

  constructor(failure: Failure) {
    super(summarize(failure));
    this.name = "BackendError";
    this.failure = failure;
  }
}

function failureOf(error: unknown): Failure | null {
  return error instanceof BackendError ? error.failure : null;
}

export function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError;
}

/** A cancelled request is an expected outcome, not a fault to report to the commuter. */
export function isAborted(error: unknown): boolean {
  return failureOf(error)?.kind === "aborted";
}

export function httpStatus(error: unknown): number | null {
  const failure = failureOf(error);
  return failure?.kind === "http" ? failure.status : null;
}

export function errorCode(error: unknown): string | null {
  const failure = failureOf(error);
  return failure?.kind === "http" ? failure.code : null;
}

/**
 * A 409 from either cursor family. Continuation must restart once without stale cursors
 * rather than retrying the same page.
 */
export function isVersionConflict(error: unknown): boolean {
  const code = errorCode(error);
  return code === "schedule_changed" || code === "snapshot_changed";
}
