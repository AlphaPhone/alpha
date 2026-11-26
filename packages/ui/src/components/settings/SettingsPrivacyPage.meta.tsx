import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ListGroup } from "../ListGroup.tsx";
import { fullHeight } from "./samples.ts";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
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
    children: (
      <ListGroup>
        <SettingsFactRow title="Voice" reading={{ word: "reported", value: "On this phone" }} />
      </ListGroup>
    ),
  },
  decorator: fullHeight,
  examples: {
    Browser: { onPhone: false },
    Reading: { read: "reading" },
    Saving: { saving: true },
    "Acts without asking": { askFirst: false },
    "On an Alpha image": { onListener: fn() },
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
      await userEvent.click(canvas.getByRole("button", { name: "Review access setup" }));
      await userEvent.click(canvas.getByRole("switch", { name: /Ask before Alpha acts/ }));
      await expect([onOpen.mock.calls, onSetUpAccess.mock.calls.length, onAskFirstChange.mock.calls]).toEqual([[["permissions"]], 1, [[false]]]);
    },
    Browser: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      expect(canvas.queryByRole("switch", { name: /Location for Alpha/ })).toBeNull();
      expect(canvas.getByRole("switch", { name: /Browser page for Alpha/ })).toBeTruthy();
      expect(canvas.getByText(/Hosted models can receive it/)).toBeTruthy();
      expect(canvas.getByRole("switch", { name: /Gmail changes/ })).toBeTruthy();
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
