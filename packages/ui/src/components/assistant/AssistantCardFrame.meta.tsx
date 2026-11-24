import { CalendarDays } from "lucide-react";
import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "../Button.tsx";
import type { AssistantCardFrameProps } from "./AssistantCardFrame.tsx";
import { offersNothing, presses } from "./plays.ts";

const onOpen = fn();

export const meta: ComponentMeta<AssistantCardFrameProps> = {
  args: { icon: <CalendarDays />, title: "Lunch with Ana", detail: "Friday, 12:30", onOpen },
  examples: {
    "With controls": { children: "Table for two at Cais", actions: <Button variant="secondary" size="sm">Remind me</Button> },
    "Not opened": { onOpen: undefined },
  },
  play: {
    Default: presses(/Lunch with Ana/, onOpen),
    Settled: offersNothing,
  },
};
