// spec/calendar/home.md, "Story: See what is next on Home, and trust \"nothing planned\""
import { Video } from "lucide-react";
import type { HomeAgendaCard as AgendaCard } from "../../calendar/home.vibe";
import { formatTime } from "../../calendar/time.ts";
import { Card } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";

/** Home's agenda card as Calendar left it, in the device's time zone, and its tap. */
export type HomeAgendaCardViewProps = {
  /** What the card shows: the next event, nothing planned, or why it cannot say. */
  card: AgendaCard;
  /** The device's time zone. */
  zone: string;
  /** Opens Calendar on the event shown. */
  onTap: () => void;
};

/**
 * Home's next event from Calendar, or "Nothing planned" only when Calendar verified it.
 * @model spec/calendar/presentation.md
 */
export function HomeAgendaCardView({ card, zone, onTap }: HomeAgendaCardViewProps) {
  const text = card.state === "HomeNothingPlanned" ? "Nothing planned" : card.state === "HomeUnverified" ? "Unverified" : card.state === "HomeFailed" ? "Retry"
    : card.state === "HomeQuiet" ? "Calendar" : card.title;
  const time = card.begin === undefined ? "" : card.allDay ? "All day" : `${formatTime(card.begin, zone)} – ${formatTime(card.end ?? card.begin, zone)}`;
  return (
    <Card asChild>
      <button type="button" className={cn(focusRing, "flex w-full flex-col items-start gap-1 p-4 text-left")} aria-label={`Calendar: ${text}${time ? `, ${time}` : ""}`}
        onClick={onTap}>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{card.state === "HomeSavedEvent" ? "Saved" : "Next"}</span>
        <span className="font-display text-xl">{text}</span>
        {time && <span className="flex items-center gap-2 text-sm">{time}{card.video && <Video aria-label="Video meeting" className="size-4" />}</span>}
      </button>
    </Card>
  );
}
