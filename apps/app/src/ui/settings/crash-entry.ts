/**
 * How Settings' diagnostics list words one native problem-log entry. The entries themselves are
 * the shared privacy-bounded crash-log contract (`plugins/plugin-native-system/src/crash-log.ts`,
 * bound in `runtime/crash-log.ts`): this module only reads an entry that contract already
 * sanitized.
 */

/** The fields of a sanitized native entry (the shared `NativeCrashEntry`) that its line reads. */
interface NativeCrashEntryFacts {
  source: "uncaught" | "exit" | "renderer";
  kind?: string;
  errorClass?: string;
  rootClass?: string;
  reason?: string;
  process?: string;
  thread?: string;
}

/**
 * Alpha's title for each exit reason the shared native crash log records (the identifiers of
 * `CRASH_EXIT_REASONS`, from Android's `ApplicationExitInfo` reasons in `CrashLog.java`). The
 * identifier itself is never shown; one this table does not know reads as `EXIT_FALLBACK`.
 */
export const EXIT_REASON_TITLES: Readonly<Record<string, string>> = {
  crash: "Alpha stopped after a crash",
  "native-crash": "Alpha stopped after a crash in native code",
  anr: "Alpha stopped because it wasn’t responding",
  "low-memory": "Android stopped Alpha to free up memory",
  signaled: "Android stopped Alpha with a system signal",
  "initialization-failure": "Alpha stopped because it couldn’t start",
  "excessive-resource-usage": "Android stopped Alpha for using too many resources",
  "dependency-died": "Alpha stopped because a part it depends on stopped",
  freezer: "Android stopped Alpha while it was frozen in the background",
  other: "Android stopped Alpha for another reason",
  unknown: "Alpha stopped for an unknown reason",
  "exit-self": "Alpha closed itself after an error",
};
export const EXIT_FALLBACK = "Alpha stopped";

/**
 * Alpha's title for each renderer failure kind (`RENDERER_FAILURE_KINDS`); one this table does not
 * know reads as `SCREEN_FAILURE_FALLBACK`.
 */
export const SCREEN_FAILURE_TITLES: Readonly<Record<string, string>> = {
  render: "A screen couldn’t be shown",
  startup: "Alpha’s screens couldn’t start",
  uncaught: "A screen ran into an error",
};
export const SCREEN_FAILURE_FALLBACK = "A screen failed";

const titleFor = (
  table: Readonly<Record<string, string>>,
  key: string | undefined,
  fallback: string,
) => (key !== undefined && Object.hasOwn(table, key) ? table[key] : fallback);

/** One line per entry for a Settings diagnostics list: what failed, and its class or reason. */
export function describeNativeCrashEntry(entry: NativeCrashEntryFacts): {
  title: string;
  detail: string;
} {
  const where =
    entry.process && entry.process !== "main"
      ? ` · ${entry.process} process`
      : "";
  if (entry.source === "exit")
    return {
      title: titleFor(EXIT_REASON_TITLES, entry.reason, EXIT_FALLBACK),
      detail: `Reported by Android${where}`,
    };
  if (entry.source === "renderer")
    return {
      title: titleFor(SCREEN_FAILURE_TITLES, entry.kind, SCREEN_FAILURE_FALLBACK),
      detail: entry.errorClass || "Error",
    };
  return {
    title: "App crashed",
    detail:
      [
        entry.errorClass,
        entry.rootClass && entry.rootClass !== entry.errorClass
          ? `caused by ${entry.rootClass}`
          : "",
        entry.thread ? `${entry.thread} thread` : "",
      ]
        .filter(Boolean)
        .join(" · ") || "Unknown class",
  };
}
