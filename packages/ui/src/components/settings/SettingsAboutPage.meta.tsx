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
    "Development preview": { onPhone: false, alphaVersion: unavailable },
    "Returning to a row": { place: 1 },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const canvas = within(canvasElement);
      expect(canvas.getByText("0.1.0", { exact: true })).toBeTruthy();
      expect(canvas.getByText("Android version", { exact: true })).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: /^Agent activity$/ }));
      await userEvent.click(canvas.getByRole("button", { name: "Licenses" }));
      await expect(onOpen.mock.calls).toEqual([["activity"], ["licences"]]);
    },
    Unavailable: ({ canvasElement }) => {
      const canvas = within(canvasElement);
      expect(canvas.queryByText("Android version", { exact: true })).toBeNull();
      expect(canvas.getByRole("button", { name: /^Agent activity$/ })).toBeTruthy();
    },
    "Development preview": ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([canvas.queryByText("Development preview") !== null, canvas.queryByText("Android version"), canvas.queryByRole("button", { name: /^Agent activity/ })]).toEqual([true, null, null]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Licenses" })),
  },
};
