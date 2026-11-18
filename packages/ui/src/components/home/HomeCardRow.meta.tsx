import type { ComponentMeta } from "vibestack/stories";
import { HomeAgendaCard } from "./HomeAgendaCard.tsx";
import { HomeBriefCard } from "./HomeBriefCard.tsx";
import type { HomeCardRowProps } from "./HomeCardRow.tsx";
import { HomeMailCard } from "./HomeMailCard.tsx";

export const homeCards = [
  <HomeAgendaCard key="agenda" item={{ title: "Design review", when: "3:00 PM", source: "Work" }} />,
  <HomeMailCard key="mail" unread={3} lines={[{ title: "Ana Lima", detail: "Lunch on Friday?" }]} />,
  <HomeBriefCard key="brief" outcome="Finished" summary="Two meetings today; the design review moved to 3 PM." when="7:00 AM" />,
];

export const meta: ComponentMeta<HomeCardRowProps> = {
  args: { children: homeCards },
};
