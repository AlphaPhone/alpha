import { Download } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ListGroup } from "../ListGroup.tsx";
import { fullHeight, reported, unavailable, waiting } from "./samples.ts";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import type { SettingsAboutPageProps } from "./SettingsAboutPage.tsx";

const onOpen = fn();

export const meta: ComponentMeta<SettingsAboutPageProps> = {
  args: {
    alphaVersion: reported("0.1.0"),
    androidVersion: reported("16"),
    onBack: fn(),
    onOpen,
    onAndroid: fn(),
    children: (
      <ListGroup>
        <SettingsNavRow title="Software update" icon={<Download />} onOpen={() => undefined} />
      </ListGroup>
    ),
  },
  decorator: fullHeight,
  examples: {
    Waiting: { alphaVersion: waiting, androidVersion: waiting },
    Unavailable: { alphaVersion: unavailable, androidVersion: unavailable },
    "Returning to a row": { place: 1 },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Agent activity" }));
      await userEvent.click(canvas.getByRole("button", { name: "Licenses" }));
      await expect(onOpen.mock.calls).toEqual([["activity"], ["licences"]]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Licenses" })),
  },
};
