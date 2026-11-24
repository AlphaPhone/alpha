// spec/calendar/home.md, "Story: See what is next on Home, and trust \"nothing planned\""
import { Video } from "lucide-react";
import { HomeAgenda } from "../../calendar/home.vibe";
import { deviceZone, formatTime } from "../../calendar/time.ts";
import type { AppId } from "../app-screen.ts";
import { Card } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { useHomeAgenda } from "./hooks.ts";
import { perform } from "../shell/services.ts";

/** What Home passes its agenda card: how to open Calendar on the event it shows. */
export type HomeAgendaCardProps = {
  /** Open an app at a route; tapping opens Calendar on the event shown. */
  open: (app: AppId, route?: string) => void;
};

/**
 * Home's next event from Calendar, or "Nothing planned" only when Calendar verified it.
 * @model spec/calendar/presentation.md
 */
export function HomeAgendaCard({ open }: HomeAgendaCardProps) {
  const card = useHomeAgenda();
  const zone = deviceZone();
  const text = card.state === "HomeNothingPlanned" ? "Nothing planned" : card.state === "HomeUnverified" ? "Unverified" : card.state === "HomeFailed" ? "Retry"
    : card.state === "HomeQuiet" ? "Calendar" : card.title;
  const time = card.begin === undefined ? "" : card.allDay ? "All day" : `${formatTime(card.begin, zone)} – ${formatTime(card.end ?? card.begin, zone)}`;
  return (
    <Card asChild>
      <button type="button" className={cn(focusRing, "flex w-full flex-col items-start gap-1 p-4 text-left")} aria-label={`Calendar: ${text}${time ? `, ${time}` : ""}`}
        onClick={() => void perform(HomeAgenda.use((agenda) => agenda.tapped())).then(() => open("calendar", card.route))}>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{card.state === "HomeSavedEvent" ? "Saved" : "Next"}</span>
        <span className="font-serif text-xl">{text}</span>
        {time && <span className="flex items-center gap-2 text-sm">{time}{card.video && <Video aria-label="Video meeting" className="size-4" />}</span>}
      </button>
    </Card>
  );
}
