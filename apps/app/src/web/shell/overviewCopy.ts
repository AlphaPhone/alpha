// spec/shell/overview.md, "Story: See my day on Home"
import type { Item, Overview } from "../../../gen/shell__overview.ts";
import { agenda, following, overdueCount, staleFeed } from "../../../gen/shell__overview.ts";

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/** Cuts text to `max` characters, marking a cut so a shortened line never reads as complete. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** "3:04 PM" today, otherwise "Wed, Oct 8 3:04 PM". */
export function whenLabel(at: number, now: number): string {
  const date = new Date(at);
  return date.toDateString() === new Date(now).toDateString() ? time.format(date) : `${shortDate.format(date)} ${time.format(date)}`;
}

/** Home's date line when no card has anything to show. */
export function dateLabel(now: number): string {
  return longDate.format(new Date(now));
}

function span(item: Item): string {
  if (item.allDay) return "All day";
  const begin = new Date(item.begin);
  if (!(item.end > item.begin)) return time.format(begin);
  const end = new Date(item.end);
  return `${time.format(begin)} – ${end.toDateString() === begin.toDateString() ? time.format(end) : `${shortDate.format(end)}, ${time.format(end)}`}`;
}

/** Everything the agenda card renders. */
export interface AgendaCopy {
  readonly heading: string;
  readonly title: string;
  readonly footer: string;
  readonly read: string;
  readonly next: string;
  readonly label: string;
  readonly description: string;
  readonly overdue: boolean;
  readonly stale: boolean;
  readonly video: boolean;
}

/** The agenda card from the overview: the item's day or the overdue count, its time, and where it was read. */
export function agendaCopy(o: Overview): AgendaCopy {
  const item = agenda(o);
  const next = following(o);
  const count = overdueCount(o);
  const stale = staleFeed(o) && !item.overdue;
  const read = item.overdue ? "" : stale ? `Not updated since ${whenLabel(o.readAt, o.now)}` : "";
  const heading = item.overdue ? (count > 1 ? `${count} overdue reminders` : "Overdue reminder") : shortDate.format(new Date(item.begin));
  const title = item.title.replace(/\s+/g, " ").trim() || "Untitled event";
  const footer = item.overdue ? `Due ${whenLabel(item.begin, o.now)}` : span(item);
  const nextLine = next.id === "" ? "" : `Next: ${clip(next.title.trim() || "Untitled event", 60)} ${next.begin <= o.now ? (next.allDay ? "All day" : "Now") : whenLabel(next.begin, o.now)}`;
  const source = item.overdue ? "Overdue reminder saved on this phone" : `Read ${whenLabel(o.readAt, o.now)} from your agent's calendar`;
  return {
    heading, title, footer, read, next: nextLine, overdue: item.overdue, stale, video: item.video,
    label: item.overdue ? `Open overdue reminder: ${title}, ${footer}` : `Open calendar event: ${title}, ${heading}, ${footer}`,
    description: [stale ? `Calendar not updated since ${whenLabel(o.readAt, o.now)}; today's changes may be missing` : source, nextLine].filter(Boolean).join(". "),
  };
}

/** Everything the mail card renders. */
export interface AttentionCopy {
  readonly count: string;
  readonly status: string;
  readonly label: string;
}

/** The mail card from what the owner loaded in Inbox: the unread count and when it was read. */
export function attentionCopy(o: Overview): AttentionCopy {
  const count = `${o.unread}${o.more ? "+" : ""}`;
  const plural = o.unread === 1 ? "unread email" : "unread emails";
  const status = o.attention === "AttentionStale" ? `Not updated since ${whenLabel(o.attentionAt, o.now)}` : `Updated ${whenLabel(o.attentionAt, o.now)}`;
  return { count, status, label: `Open Inbox: ${count} ${plural}` };
}

/** Everything the brief card renders. */
export interface BriefCopy {
  readonly title: string;
  readonly status: string;
  readonly failed: boolean;
  readonly label: string;
}

/** The brief card: the newest retained brief, how it ended and when. */
export function briefCopy(o: Overview): BriefCopy {
  const verb = o.brief === "BriefFailed" ? "Failed" : o.brief === "BriefNotRun" ? "Did not run" : "Ran";
  const when = whenLabel(o.briefAt, o.now);
  const summary = o.briefTitle.replace(/\s+/g, " ").trim();
  return {
    title: clip(summary, 96), status: `${verb} ${when}`, failed: o.brief === "BriefFailed",
    label: `Open scheduled digests. Latest brief, ${verb.toLowerCase()} ${when}: ${clip(summary, 280)}`,
  };
}

/** The workflows card: how many are on, and when the list was loaded. */
export function workflowsCopy(o: Overview): { readonly count: string; readonly status: string; readonly label: string } {
  return {
    count: String(o.workflows),
    status: `Loaded ${whenLabel(o.workflowsAt, o.now)}`,
    label: `Open Workflows: ${o.workflows} ${o.workflows === 1 ? "workflow" : "workflows"} on`,
  };
}
