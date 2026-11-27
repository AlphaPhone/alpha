// spec/app/workflows/list.md, "Story: Find a workflow": the words a row shows for when it runs.

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** One instant as every list row and run line words it ("Nov 25, 2026, 4:00 AM"), in the phone's zone. */
export const instant = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function clockWords(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const half = hour < 12 ? "am" : "pm";
  return minute === 0 ? `${String(h12)}${half}` : `${String(h12)}:${String(minute).padStart(2, "0")}${half}`;
}

/** "Every weekday at 9am" for the cron shapes Alpha offers, or undefined for any other. */
export function cadence(expression: string): string | undefined {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return undefined;
  const [minute = "", hour = "", date = "", month = "", weekday = ""] = parts;
  if (month !== "*") return undefined;
  const step = /^\*\/(\d+)$/.exec(minute);
  if (step && hour === "*" && date === "*" && weekday === "*") {
    const minutes = Number(step[1]);
    if (minutes <= 0 || 60 % minutes !== 0) return undefined;
    return minutes === 1 ? "Every minute" : `Every ${String(minutes)} minutes`;
  }
  if (minute === "0" && hour === "*" && date === "*" && weekday === "*") return "Every hour";
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour) || date !== "*") return undefined;
  const time = clockWords(Number(hour), Number(minute));
  if (weekday === "*") return `Every day at ${time}`;
  if (weekday === "1-5") return `Every weekday at ${time}`;
  if (weekday === "0,6") return `Every weekend at ${time}`;
  if (/^[0-6]$/.test(weekday)) return `Every ${dayNames[Number(weekday)] ?? ""} at ${time}`;
  return undefined;
}

function days(field: string): number[] | undefined {
  if (field === "*") return [0, 1, 2, 3, 4, 5, 6];
  const found = new Set<number>();
  for (const part of field.split(",")) {
    const range = /^(\d)(?:-(\d))?$/.exec(part);
    if (!range) return undefined;
    const from = Number(range[1]);
    const to = range[2] === undefined ? from : Number(range[2]);
    for (let day = from; day <= to; day++) found.add(day % 7);
  }
  return [...found];
}

function offsetMinutes(at: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
    .formatToParts(at);
  const field = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (Date.UTC(field("year"), field("month") - 1, field("day"), field("hour"), field("minute")) - Math.floor(at / 60000) * 60000) / 60000;
}

/** The next time a daily or weekly clock schedule fires, in its own zone, or undefined when it is not one. */
export function nextClock(expression: string, zone: string, now: number): number | undefined {
  const [minute = "", hour = "", date = "", month = "", weekday = ""] = expression.trim().split(/\s+/);
  const allowed = days(weekday);
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour) || date !== "*" || month !== "*" || !allowed) return undefined;
  try {
    const today = new Date(now + offsetMinutes(now, zone) * 60000);
    const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    for (let day = 0; day < 8; day++) {
      const local = start + day * 86_400_000;
      if (!allowed.includes(new Date(local).getUTCDay())) continue;
      const wall = local + (Number(hour) * 60 + Number(minute)) * 60000;
      const at = wall - offsetMinutes(wall, zone) * 60000;
      if (at >= now) return at;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** The phone's own zone. */
export const phoneZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A recurring schedule's words: its cadence in the phone's zone, or when it next fires when it keeps another zone's clock. */
export function cronWords(expression: string, zone: string, now: number): string {
  if (zone === "" || zone === phoneZone()) return cadence(expression) ?? expression;
  const steps = cadence(expression);
  if (steps !== undefined && /^Every (minute|hour|\d+ minutes)$/.test(steps)) return steps;
  const next = nextClock(expression, zone, now);
  return next === undefined ? "Scheduled time unavailable" : `Next ${instant.format(next)}`;
}

/** A one-time schedule's words. */
export function onceWords(iso: string | undefined): string {
  const at = Date.parse(iso ?? "");
  return Number.isFinite(at) ? instant.format(at) : "Once";
}
