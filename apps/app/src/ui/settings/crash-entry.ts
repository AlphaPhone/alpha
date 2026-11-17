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
      title: `App process stopped: ${entry.reason}`,
      detail: `Reported by Android${where}`,
    };
  if (entry.source === "renderer")
    return {
      title: `Screen failure: ${entry.kind}`,
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
