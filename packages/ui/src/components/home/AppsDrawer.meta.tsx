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

export const meta: ComponentMeta<AppsDrawerProps> = {
  args: { apps, query: "", catalog: "ready", onSearch: fn(), onOpen: fn(), onClose },
  decorator: (story) => <div className="relative h-dvh">{story()}</div>,
  examples: {
    Search: { query: "camera" },
    Opening: { opening: "clock" },
    "Reading apps": { apps: [], catalog: "reading" },
    "Cannot read": { apps: [], catalog: "unavailable", onRetry: fn() },
    "No apps": { apps: [] },
  },
  play: {
    "Reading apps": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Close apps" }));
      await expect(onClose).toHaveBeenCalledTimes(1);
    },
  },
};
