import { Sun } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ListGroup } from "../ListGroup.tsx";
import { fullHeight } from "./samples.ts";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import type { SettingsPageProps } from "./SettingsPage.tsx";

const onBack = fn();

export const meta: ComponentMeta<SettingsPageProps> = {
  args: {
    title: "General",
    onBack,
    children: (
      <ListGroup>
        <SettingsNavRow title="Display" icon={<Sun />} onOpen={() => undefined} />
      </ListGroup>
    ),
  },
  decorator: fullHeight,
  examples: { "First page": { title: "Settings", onBack: undefined }, "Told Android": { told: "unavailable" } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onBack.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Back" }));
      await expect(onBack.mock.calls.length).toBe(1);
    },
    "First page": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Back" })).toBeNull(),
  },
};
