import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeDrawerAppProps } from "./HomeDrawerApp.tsx";
import { appImage } from "./InstalledAppIcon.meta.tsx";

const onClick = fn();
const onOpenMenu = fn();

export const meta: ComponentMeta<HomeDrawerAppProps> = {
  args: { label: "Clock", image: appImage, onClick, onOpenMenu },
  examples: {
    "Work profile": { label: "Mail", detail: "Work", image: undefined },
    Opening: { opening: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClick.mockClear();
      onOpenMenu.mockClear();
      const app = within(canvasElement).getByRole("button", { name: "Clock" });
      await userEvent.click(app);
      await fireEvent.contextMenu(app);
      await expect([onClick.mock.calls.length, onOpenMenu.mock.calls.length]).toEqual([1, 1]);
    },
    "Work profile": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button")).toHaveAccessibleName("Mail (Work)"),
    Opening: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button")).toHaveAttribute("aria-busy", "true"),
  },
};
