import type { ComponentMeta } from "vibestack/stories";
import { HomeAgendaCard } from "./HomeAgendaCard.tsx";
import { HomeBriefCard } from "./HomeBriefCard.tsx";
import type { HomeCardRowProps } from "./HomeCardRow.tsx";
import { HomeMailCard } from "./HomeMailCard.tsx";

export const homeCards = [
  <HomeAgendaCard key="agenda" heading="Tue, Nov 24" origin="Work" item={{ title: "Design review", when: "3:00 PM – 3:30 PM" }} />,
  <HomeMailCard key="mail" unread={3} lines={[{ title: "Lunch on Friday?", detail: "Ana Lima" }]} status="ana@example.com · Updated 9:41 AM" />,
  <HomeBriefCard key="brief" outcome="Finished" summary="Two meetings today; the design review moved to 3 PM." status="Your agent · Ran 7:00 AM" />,
];

export const meta: ComponentMeta<HomeCardRowProps> = {
  args: { children: homeCards },
};
