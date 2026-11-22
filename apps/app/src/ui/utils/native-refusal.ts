/**
 * How Alpha words a failure whose text may come from shared upstream code. Shared native plugins
 * and staged modules answer in their own English; Alpha keys a table on those reviewed sentences
 * and shows its own sentence instead. A native rejection Alpha has no sentence for reads as the
 * screen's fallback, never as the plugin's text.
 */

/**
 * A rejection from a native plugin call. Capacitor delivers every plugin rejection as an instance
 * of its exception class, which it publishes as `Capacitor.Exception` (the Android bridge builds
 * the rejection with it); the class name is checked too for a bridge that loaded before it.
 */
export function isNativeRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const exception = (globalThis as { Capacitor?: { Exception?: unknown } }).Capacitor?.Exception;
  if (typeof exception === "function" && error instanceof (exception as new () => Error)) return true;
  return error.constructor?.name === "CapacitorException";
}

/** The trimmed text of an error or a result message, or "" when there is none. */
export function failureText(value: unknown): string {
  const text =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string"
          ? (value as { message: string }).message
          : "";
  return text.trim();
}

/**
 * Alpha's sentence for `error`: the table's sentence for its reviewed text; else `fallback` for a
 * native rejection, a non-error or (with `ownErrors: false`) any error; else the plain error's own
 * message, which is Alpha's (thrown by Alpha's adapters, web hosts and runtime).
 */
export function refusalText(
  error: unknown,
  table: ReadonlyMap<string, string>,
  fallback: string,
  { ownErrors = true }: { ownErrors?: boolean } = {},
): string {
  const known = table.get(failureText(error));
  if (known) return known;
  if (!ownErrors || !(error instanceof Error) || isNativeRejection(error)) return fallback;
  return error.message.trim() || fallback;
}

/** Alpha's sentence for a resolved native result message: the table's sentence, else `fallback`. */
export function resultText(
  message: unknown,
  table: ReadonlyMap<string, string>,
  fallback: string,
): string {
  return table.get(failureText(message)) ?? fallback;
}
