// spec/calendar/home.md, "Story: See what is next on Home, and trust \"nothing planned\""
import { HomeAgenda } from "../../calendar/home.vibe";
import { deviceZone } from "../../calendar/time.ts";
import type { AppId } from "../app-screen.ts";
import { HomeAgendaCardView } from "./HomeAgendaCardView.tsx";
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
  return <HomeAgendaCardView card={card} zone={deviceZone()} onTap={() => void perform(HomeAgenda.use((agenda) => agenda.tapped())).then(() => open("calendar", card.route))} />;
}
