/**
 * What Settings → Password manager shows: the sentence for each vault failure, the wording of a
 * website the form refused, and the order and search of the saved list. The vault bridge, its
 * failure codes and website normalization are elizaOS `plugin-native-passwords` (read straight
 * from the submodule as reviewed non-UI logic); the bridge's own error text is never shown.
 */

/** The vault's failure codes (`PasswordsErrorCode` in plugin-native-passwords). */
type PasswordsFailureCode =
  | "locked"
  | "cancelled"
  | "no-screen-lock"
  | "invalid"
  | "key-invalidated"
  | "busy"
  | "conflict"
  | "not-admitted"
  | "unavailable";

const FAILURES: Readonly<Record<PasswordsFailureCode, string>> = {
  locked: "Unlock saved passwords first.",
  cancelled: "Unlock was cancelled.",
  "no-screen-lock": "Set a screen lock to use saved passwords.",
  invalid: "Check the entry and try again.",
  "key-invalidated":
    "Saved passwords can no longer be decrypted on this device.",
  busy: "Finish the current unlock first.",
  conflict: "This password changed. Reload it and try again.",
  "not-admitted": "Saved passwords are not available here.",
  unavailable: "Saved passwords are unavailable.",
};

/**
 * The vault's validation refusals (code `invalid`) and the website check's, keyed by their
 * reviewed text without its final full stop, with Alpha's wording.
 */
const VALIDATION: ReadonlyMap<string, string> = new Map([
  ["Enter a website address", "Enter a website address."],
  ["Use an HTTPS website address", "Use an HTTPS website address."],
  ["Remove the user name from the address", "Remove the user name from the website address."],
  ["Choose a length from 8 to 128 with at least one character type", "Choose a length from 8 to 128 with at least one character type."],
  ["Choose a length from 8 to 128", "Choose a length from 8 to 128."],
  ["Choose at least one character type", "Choose at least one character type."],
  ["Choose a typed or generated password", "Type a password or generate one."],
  ["Choose a saved password", "Choose a saved password."],
  ["Passwords are entered only in the protected form", "Enter passwords only in the protected form."],
]);

const textOf = (error: unknown) => {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message.trim().replace(/\.$/, "") : "";
};

/** Alpha's sentence for a vault failure, from its code (and, for `invalid`, the check named). */
export function passwordsFailureText(failure: {
  code: string;
  message?: string;
}): string {
  if (failure.code === "invalid")
    return VALIDATION.get(textOf(failure)) ?? FAILURES.invalid;
  return Object.hasOwn(FAILURES, failure.code)
    ? FAILURES[failure.code as PasswordsFailureCode]
    : FAILURES.unavailable;
}

/** Alpha's sentence for a website the form refused (`normalizeWebsite`). */
export function websiteInputText(error: unknown): string {
  return VALIDATION.get(textOf(error)) ?? "Enter a website address.";
}

type ListedEntry = {
  label: string;
  username: string;
  bindings: readonly { display: string; facet: string }[];
};

/** The saved list in name order, narrowed by a case-insensitive search over labels, usernames and websites. */
export function filterEntries<T extends ListedEntry>(
  entries: readonly T[],
  query: string,
): T[] {
  const needle = (query || "").trim().toLowerCase();
  const sorted = [...entries].sort(
    (a, b) =>
      a.label.localeCompare(b.label) || a.username.localeCompare(b.username),
  );
  if (!needle) return sorted;
  return sorted.filter((entry) =>
    [
      entry.label,
      entry.username,
      ...entry.bindings.flatMap((binding) => [binding.display, binding.facet]),
    ].some((value) => value.toLowerCase().includes(needle)),
  );
}
