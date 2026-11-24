import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxWatchStatusProps } from "./InboxWatchStatus.tsx";

export const meta: ComponentMeta<InboxWatchStatusProps> = {
  args: { phase: "watching", account: "sam.rivera@gmail.com", checkedAt: "14:02" },
  examples: {
    "Not watching": { phase: "off", account: undefined, checkedAt: undefined },
    "Catching up": { phase: "catchingUp" },
    "Missed earlier mail": { phase: "expired" },
    Stopped: { phase: "stopped" },
    "No longer allowed": { phase: "noLongerAllowed", checkedAt: undefined },
  },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByText("Watching")).toBeInTheDocument(),
  },
};
