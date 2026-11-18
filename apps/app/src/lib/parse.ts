import { isUuidRfc } from './ids';

/** True for a non-null, non-array object. */
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** The value as a record when `isRecord` holds, otherwise `null`. */
export const asRecord = (value: unknown): Record<string, unknown> | null => isRecord(value) ? value : null;

/** The value as a record; throws `fail()` when it is not one. */
export function expectRecord(value: unknown, fail: () => Error): Record<string, unknown> {
  if (!isRecord(value)) throw fail();
  return value;
}

/** The value as a non-blank string; throws `fail()` for anything else, including whitespace-only text. */
export function expectString(value: unknown, fail: () => Error): string {
  if (typeof value !== 'string' || !value.trim()) throw fail();
  return value;
}

/** `null` for `null`/`undefined`, otherwise `expectString(value, fail)`. */
export function optionalString(value: unknown, fail: () => Error): string | null {
  return value == null ? null : expectString(value, fail);
}

/** A non-blank string that is an RFC 4122 v1–v5 UUID (any case); throws `fail()` otherwise. */
export function expectUuidRfc(value: unknown, fail: () => Error): string {
  const id = expectString(value, fail);
  if (!isUuidRfc(id)) throw fail();
  return id;
}

/** Milliseconds since the epoch of a non-blank `Date.parse`-able string; throws `fail()` otherwise. */
export function expectTimestamp(value: unknown, fail: () => Error): number {
  const parsed = Date.parse(expectString(value, fail));
  if (!Number.isFinite(parsed)) throw fail();
  return parsed;
}
