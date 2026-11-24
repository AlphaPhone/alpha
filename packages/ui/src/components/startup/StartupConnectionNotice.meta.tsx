import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupConnectionNoticeProps } from "./StartupConnectionNotice.tsx";

export const meta: ComponentMeta<StartupConnectionNoticeProps> = {
  args: { connection: "Unreachable" },
  play: {
    "Connection Connected": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("note")).toBeNull(),
    "Connection Offline": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("note")).toHaveTextContent("offline"),
  },
};
