/**
 * Runtime shape guards for backend responses.
 *
 * Two rules separate structure from vocabulary:
 *
 *  - Structure is strict. A missing object, a string where a number belongs or a
 *    non-finite number means the response cannot be trusted, and parsing fails with the
 *    path that disagreed.
 *  - Vocabulary is never rejecting. An enum the frontend has never seen parses through
 *    verbatim, because a new backend state must degrade to "unknown" in presentation
 *    rather than break the screen.
 *
 * Hand-written guards keep the boundary dependency-free, as the architecture requires.
 */
import { BackendError } from "./errors";

function fail(path: string, expected: string, value: unknown): never {
  throw new BackendError({
    kind: "contract",
    path,
    detail: `expected ${expected}, received ${describe(value)}`,
  });
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function present(value: unknown): boolean {
  return value !== null && value !== undefined;
}

export function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "an object", value);
  }
  return value as Record<string, unknown>;
}

export function text(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "a string", value);
  return value;
}

/** Rejects NaN and Infinity, which no honest measurement produces. */
export function numeric(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "a finite number", value);
  }
  return value;
}

export function flag(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "a boolean", value);
  return value;
}

/** An absent field and an explicit null are both null: the backend means the same thing. */
export function nullableText(value: unknown, path: string): string | null {
  return present(value) ? text(value, path) : null;
}

export function nullableNumeric(value: unknown, path: string): number | null {
  return present(value) ? numeric(value, path) : null;
}

export function nullableFlag(value: unknown, path: string): boolean | null {
  return present(value) ? flag(value, path) : null;
}

/**
 * An enum value. Any string is accepted so an unrecognized backend state survives to
 * presentation, where it becomes a neutral unknown label instead of a parse failure.
 */
export function enumText(value: unknown, path: string): string {
  return text(value, path);
}

export function nullableEnumText(value: unknown, path: string): string | null {
  return nullableText(value, path);
}

export function list<T>(
  value: unknown,
  path: string,
  item: (value: unknown, path: string) => T,
): T[] {
  if (!Array.isArray(value)) fail(path, "an array", value);
  return value.map((entry, index) => item(entry, `${path}[${index}]`));
}

/** A list the backend may omit or send as null; both mean "nothing reported". */
export function optionalList<T>(
  value: unknown,
  path: string,
  item: (value: unknown, path: string) => T,
): T[] {
  return present(value) ? list(value, path, item) : [];
}

export function nested<T>(
  value: unknown,
  path: string,
  parse: (value: unknown, path: string) => T,
): T {
  return parse(value, path);
}

export function nullableNested<T>(
  value: unknown,
  path: string,
  parse: (value: unknown, path: string) => T,
): T | null {
  return present(value) ? parse(value, path) : null;
}
