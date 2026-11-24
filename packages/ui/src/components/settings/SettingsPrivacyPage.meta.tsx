import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Mic } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { fullHeight } from "./samples.ts";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import type { SettingsPrivacyPageProps } from "./SettingsPrivacyPage.tsx";

const onOpen = fn();
const onSetUpAccess = fn();
const onAskFirstChange = fn();
const onShareChange = fn();
const onRecover = fn();

export const meta: ComponentMeta<SettingsPrivacyPageProps> = {
  args: {
    read: "loaded",
    askFirst: true,
    onBack: fn(),
    onOpen,
    onSetUpAccess,
    onAskFirstChange,
    shares: { "agent-location": true, "browser-page": true, "gmail-changes": false, "calendar-edits": true },
    onShareChange,
    onHandOver: fn(),
    children: (
      <ListGroup>
        <SettingsSwitchRow title="Listening" icon={<Mic />} checked={false} onCheckedChange={() => undefined} />
      </ListGroup>
    ),
  },
  decorator: fullHeight,
  examples: {
    Reading: { read: "reading" },
    Saving: { saving: true },
    "Acts without asking": { askFirst: false },
    Unreadable: { read: "failed", onRecover },
    Recovering: { read: "failed", recovering: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onSetUpAccess.mockClear();
      onAskFirstChange.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Permissions" }));
      await userEvent.click(canvas.getByRole("button", { name: "Set up Alpha access" }));
      await userEvent.click(canvas.getByRole("switch", { name: /Ask before Alpha acts/ }));
      await expect([onOpen.mock.calls, onSetUpAccess.mock.calls.length, onAskFirstChange.mock.calls]).toEqual([[["permissions"]], 1, [[false]]]);
    },
    "Acts without asking": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onShareChange.mockClear();
      await userEvent.click(within(canvasElement).getByRole("switch", { name: /Browser page/ }));
      await expect(onShareChange.mock.calls).toEqual([["browser-page", false]]);
    },
    Unreadable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRecover.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("switch", { name: /Ask before Alpha acts/ }).hasAttribute("disabled")).toBe(true);
      await userEvent.click(canvas.getByRole("button", { name: "Recover device settings" }));
      await expect(onRecover.mock.calls.length).toBe(1);
    },
  },
};
