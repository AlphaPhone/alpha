// spec/calendar/linkedLocal.md, "Sync fields keep only what both sides can say"
type Repeat = "daily" | "weekdays" | "weekly";

const RULES: Readonly<Record<Repeat, string>> = {
  daily: "RRULE:FREQ=DAILY",
  weekdays: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "RRULE:FREQ=WEEKLY",
};
const WEEKDAYS = ["FR", "MO", "TH", "TU", "WE"].join();

const compact = (value: number) => new Date(value).toISOString().replaceAll("-", "").replaceAll(":", "").replace(".000", "");

function ruleOf(line: string): Repeat {
  const values = new Map<string, string>();
  for (const part of line.slice("RRULE:".length).split(";")) {
    const pair = part.split("=");
    if (pair.length !== 2 || values.has(pair[0]!)) throw new Error("rule");
    values.set(pair[0]!, pair[1]!);
  }
  const freq = values.get("FREQ");
  if (values.size === 1 && freq === "DAILY") return "daily";
  if (values.size === 1 && freq === "WEEKLY") return "weekly";
  if (values.size === 2 && freq === "WEEKLY" && values.get("BYDAY")?.split(",").sort().join() === WEEKDAYS) return "weekdays";
  throw new Error("rule");
}

function exclusionsOf(line: string, allDay: boolean): number[] {
  const prefix = allDay ? "EXDATE;VALUE=DATE:" : "EXDATE:";
  if (!line.startsWith(prefix)) throw new Error("exclusion");
  return line.slice(prefix.length).split(",").map((raw) => {
    const match = (allDay ? /^(\d{4})(\d{2})(\d{2})$/ : /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/).exec(raw);
    if (match === null) throw new Error("exclusion");
    const value = Date.parse(`${match[1]}-${match[2]}-${match[3]}T${match[4] ?? "00"}:${match[5] ?? "00"}:${match[6] ?? "00"}Z`);
    if (!Number.isFinite(value) || compact(value) !== (allDay ? `${raw}T000000Z` : raw)) throw new Error("exclusion");
    return value;
  });
}

/**
 * The recurrence lines of a Google event in the one form Alpha writes them: one supported rule and its sorted, distinct exclusions.
 * Lines Alpha cannot say are kept exactly as they were, so they stay at Google unchanged.
 * @throws {never}
 */
export function canonicalSyncRecurrence(lines: readonly string[], allDay: boolean): string[] {
  try {
    if (lines.length === 0) return [];
    let repeat: Repeat | undefined;
    const excluded: number[] = [];
    for (const line of lines) {
      if (line.startsWith("RRULE:")) {
        if (repeat !== undefined) throw new Error("rules");
        repeat = ruleOf(line);
      } else excluded.push(...exclusionsOf(line, allDay));
    }
    if (repeat === undefined) throw new Error("rule");
    const sorted = [...new Set(excluded)].sort((a, b) => a - b);
    if (sorted.length === 0) return [RULES[repeat]];
    const values = sorted.map((value) => (allDay ? new Date(value).toISOString().slice(0, 10).replaceAll("-", "") : compact(value)));
    return [RULES[repeat], `${allDay ? "EXDATE;VALUE=DATE:" : "EXDATE:"}${values.join(",")}`];
  } catch {
    return [...lines];
  }
}
