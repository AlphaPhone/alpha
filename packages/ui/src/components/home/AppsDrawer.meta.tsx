import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AppsDrawerProps, HomeInstalledApp } from "./AppsDrawer.tsx";
import { appImage } from "./InstalledAppIcon.meta.tsx";

const apps: HomeInstalledApp[] = [
  { id: "com.example.mail/.Inbox/0", label: "Mail", onHome: false },
  { id: "com.example.clock/.Main/0", label: "Clock", image: appImage, onHome: true },
  { id: "com.example.calculator/.Main/0", label: "Calculator", onHome: false },
  { id: "com.example.mail/.Inbox/10", label: "Mail", detail: "Work", onHome: false },
  { id: "com.example.camera/.Main/0", label: "Câmera", onHome: false },
  { id: "com.example.music/.Main/0", label: "Music", onHome: false },
  { id: "com.example.maps/.Main/0", label: "Atlas Maps", onHome: false },
];
const onSearch = fn();
const onOpenApp = fn();
const onOpenMenu = fn();
const onClose = fn();

export const meta: ComponentMeta<AppsDrawerProps> = {
  args: { view: "Grid", apps, query: "", onSearch, onOpenApp, onOpenMenu, onClose },
  decorator: (story) => <div className="h-dvh">{story()}</div>,
  examples: {
    Search: { query: "ma", apps: apps.filter((app) => app.label === "Mail" || app.label === "Atlas Maps") },
    Refreshing: { refreshing: true },
    Opening: { opening: "com.example.clock/.Main/0", onOpenApp: undefined },
    Menu: { menu: "com.example.mail/.Inbox/10" },
    "Menu on Home": { menu: "com.example.clock/.Main/0" },
    "Not opened": { notice: { tag: "TellNotOpened", ask: { tag: "OpenApp", label: "Music" }, why: "Gone" } },
    "Reading apps": { view: "Spinner", apps: [] },
    "Cannot read": { view: "CannotRead", apps: [], onTryAgain: fn() },
    "No apps installed": { view: "NoAppsInstalled", apps: [] },
    "No match": { view: "NoMatch", query: "zz", apps: [] },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSearch.mockClear();
      onOpenApp.mockClear();
      onClose.mockClear();
      const canvas = within(canvasElement);
      const names = canvas.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
      await expect(names).toEqual(["Close apps", "Atlas Maps", "Calculator", "Câmera", "Clock", "Mail", "Mail (Work)", "Music"]);
      await userEvent.type(canvas.getByRole("searchbox", { name: "Search apps" }), "c");
      await userEvent.click(canvas.getByRole("button", { name: "Clock" }));
      await userEvent.click(canvas.getByRole("button", { name: "Close apps" }));
      await expect([onSearch.mock.calls, onOpenApp.mock.calls, onClose.mock.calls.length]).toEqual([[["c"]], [["com.example.clock/.Main/0"]], 1]);
    },
    Search: ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const tiles = within(canvasElement).getAllByRole("button", { name: /^(Mail|Atlas)/ }).map((button) => button.getAttribute("aria-label") ?? button.textContent);
      return expect(tiles).toEqual(["Mail", "Mail (Work)", "Atlas Maps"]);
    },
    Opening: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("button", { name: "Clock" })).toHaveAttribute("aria-busy", "true");
      await expect(canvas.getByRole("button", { name: "Music" })).toBeDisabled();
    },
    Menu: async () => {
      const menu = await screen.findByRole("menu", { name: "Mail (Work)" });
      await expect(within(menu).getByRole("menuitem", { name: "Add to Home" })).toBeTruthy();
    },
    "No match": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByText("No apps match")).toBeTruthy(),
  },
};
