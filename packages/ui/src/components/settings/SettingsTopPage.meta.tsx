import { Download } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ListGroup } from "../ListGroup.tsx";
import { fullHeight } from "./samples.ts";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import type { SettingsTopPageProps } from "./SettingsTopPage.tsx";

const onOpen = fn();
const onHandOver = fn();

export const meta: ComponentMeta<SettingsTopPageProps> = {
  args: {
    onOpen,
    onHandOver,
    children: (
      <ListGroup>
        <SettingsNavRow title="Software update" icon={<Download />} onOpen={() => undefined} />
      </ListGroup>
    ),
  },
  decorator: fullHeight,
  examples: {
    Developer: { developer: true },
    "Mic may be on": { micMayBeOn: true },
    "Android starting": { starting: { target: "android-home" } },
    "Android did not answer": { told: "no-answer" },
    "Returning to a row": { place: 3 },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onHandOver.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Privacy" }));
      await userEvent.click(canvas.getByRole("button", { name: "Account and plan" }));
      await expect([onOpen.mock.calls, onHandOver.mock.calls]).toEqual([[["privacy"]], [["account-and-plan"]]]);
    },
    "Mic may be on": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onHandOver.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Microphone/ }));
      await expect(onHandOver.mock.calls).toEqual([["listener"]]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Privacy" })),
    "Android starting": ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([canvas.getAllByRole("status", { name: "Opening" }).length, canvas.getByRole("button", { name: /Accounts and sync/ }).hasAttribute("disabled")]).toEqual([1, true]);
    },
  },
};
