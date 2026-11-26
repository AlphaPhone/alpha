import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AppsDrawerProps, DrawerApp } from "./AppsDrawer.tsx";

const apps: DrawerApp[] = [
  { id: "clock", label: "Clock", packageName: "com.example.clock" },
  { id: "mail", label: "Mail", packageName: "com.example.mail" },
  { id: "work-mail", label: "Mail", packageName: "com.example.mail", profile: "Work" },
  { id: "camera", label: "Câmera", packageName: "com.example.camera" },
];
const onClose = fn();
const onAdd = fn();
const onInfo = fn();
const menu = { app: "clock", actions: { onHome: false, add: onAdd, info: onInfo, close: fn() } };

export const meta: ComponentMeta<AppsDrawerProps> = {
  args: { apps, query: "", catalog: "ready", onSearch: fn(), onOpen: fn(), onClose },
  decorator: (story) => <div className="relative h-dvh">{story()}</div>,
  examples: {
    Search: { query: "camera" },
    Opening: { opening: "clock" },
    "Reading apps": { apps: [], catalog: "reading" },
    "Cannot read": { apps: [], catalog: "unavailable", onRetry: fn() },
    "No apps": { apps: [] },
    "App menu": { menu },
    "Already on Home": { menu: { ...menu, actions: { ...menu.actions, onHome: true } } },
  },
  play: {
    /** v119 starts the search text 46px into the pill: 16 padding, the 18px icon, a 10px gap and the input's own 2px. */
    Search: ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("searchbox", { name: "Search apps" })).toHaveClass("pl-11.5"),
    "Reading apps": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Close apps" }));
      await expect(onClose).toHaveBeenCalledTimes(1);
    },
    "App menu": async () => {
      onAdd.mockClear();
      onInfo.mockClear();
      const clockMenu = within(document.body).getByRole("menu", { name: "Clock" });
      await userEvent.click(within(clockMenu).getByRole("menuitem", { name: "App info" }));
      await expect([onInfo.mock.calls.length, onAdd.mock.calls.length]).toEqual([1, 0]);
    },
    "Already on Home": () => expect(within(document.body).getByRole("menuitem", { name: "On Home" })).toHaveAttribute("aria-disabled", "true"),
  },
};
