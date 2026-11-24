// spec/telephony/attention.md, "A card exists only for a source that was read and has something new"; spec/telephony/attention.md, "One unread conversation opens it, several open the list; missed calls lead to Recents, otherwise Voicemail"
import { MessageSquare, Phone as PhoneIcon } from "lucide-react";
import { messagesCard, messagesTarget, phoneCard, phoneTarget, type Attention } from "../../../gen/telephony__attention.ts";
import type { AppId } from "../app-screen.ts";
import { Card } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { clockLength, displayNumber, shortWhen } from "./present.ts";

export interface HomeCardsViewProps {
  /** What Home's sources had that is new. */
  attention: Attention;
  /** Open an app at a route. */
  open: (app: AppId, route?: string) => void;
}

/**
 * Home's Messages and Phone cards: shown only while their source was read and has something new; the whole card opens its app.
 * @model spec/telephony/attention.md
 * @design design.md
 */
export function HomeCardsView({ attention, open }: HomeCardsViewProps) {
  const now = attention.readAt;
  const missed = [...attention.missed].sort((a, b) => b.date - a.date);
  const grouped = new Map<string, { title: string; count: number; date: number }>();
  for (const call of missed) {
    const key = call.callerKey || `unknown:${call.date}`;
    const group = grouped.get(key);
    if (group) group.count++;
    else grouped.set(key, { title: call.title ? displayNumber(call.title) : "Unknown", count: 1, date: call.date });
  }
  const phoneRows = [
    ...[...grouped.values()].map((g) => ({ date: g.date, title: g.title, detail: g.count > 1 ? `Missed · ${g.count}` : "Missed" })),
    ...attention.fresh.map((v) => ({ date: v.date, title: v.title ? displayNumber(v.title) : "Unknown", detail: `Voicemail · ${clockLength(v.seconds)}` })),
  ].sort((a, b) => b.date - a.date);
  const unread = [...attention.unread].sort((a, b) => b.date - a.date);
  const target = messagesTarget(attention);
  return (
    <>
      {messagesCard(attention) && (
        <button type="button" aria-label={`Open Messages, ${unread.length} unread`} onClick={() => open("messages", target ? `thread:${target}` : undefined)} className={cn(focusRing, "w-full rounded-xl text-left")}>
          <Card className="flex flex-col gap-1 p-4">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tabular-nums text-muted-foreground"><MessageSquare aria-hidden className="size-4" />{unread.length} · {shortWhen(unread[0]!.date, now)}</span>
            {unread.slice(0, 2).map((t) => <span key={t.threadId} className="truncate"><strong>{t.title}</strong> {t.snippet}</span>)}
          </Card>
        </button>
      )}
      {phoneCard(attention) && phoneRows.length > 0 && (
        <button type="button" aria-label={`Open Phone, ${[missed.length ? `${missed.length} missed ${missed.length === 1 ? "call" : "calls"}` : "", attention.fresh.length ? `${attention.fresh.length} voicemail` : ""].filter(Boolean).join(", ")}`}
          onClick={() => open("phone", phoneTarget(attention) === "GoRecents" ? "recents" : "voicemail")} className={cn(focusRing, "w-full rounded-xl text-left")}>
          <Card className="flex flex-col gap-1 p-4">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tabular-nums text-muted-foreground"><PhoneIcon aria-hidden className="size-4" />{missed.length + attention.fresh.length} · {shortWhen(phoneRows[0]!.date, now)}</span>
            {phoneRows.slice(0, 2).map((r, i) => <span key={i} className="truncate"><strong>{r.title}</strong> {r.detail}</span>)}
          </Card>
        </button>
      )}
    </>
  );
}
