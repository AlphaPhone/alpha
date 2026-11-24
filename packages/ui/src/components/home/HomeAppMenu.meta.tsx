import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeAppMenuProps } from "./HomeAppMenu.tsx";

const onAddToHome = fn();
const onShowAppInfo = fn();
const onClose = fn();

export const meta: ComponentMeta<HomeAppMenuProps> = {
  args: { open: true, label: "Clock", onHome: false, onAddToHome, onShowAppInfo, onClose },
  examples: {
    "On Home": { onHome: true },
    Saving: { onAddToHome: undefined },
    "Android busy": { onShowAppInfo: undefined },
  },
  play: {
    Default: async () => {
      onAddToHome.mockClear();
      onShowAppInfo.mockClear();
      onClose.mockClear();
      const menu = await screen.findByRole("menu", { name: "Clock" });
      await userEvent.click(within(menu).getByRole("menuitem", { name: "Add to Home" }));
      await userEvent.click(within(menu).getByRole("menuitem", { name: "App info" }));
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect([onAddToHome.mock.calls.length, onShowAppInfo.mock.calls.length, onClose.mock.calls.length]).toEqual([1, 1, 1]));
    },
    "On Home": async () => {
      const menu = await screen.findByRole("menu", { name: "Clock" });
      await expect([within(menu).queryByRole("menuitem", { name: "Add to Home" }), within(menu).getByRole("menuitem", { name: "On Home" })]).toEqual([null, expect.anything()]);
    },
    Saving: async () => {
      const menu = await screen.findByRole("menu", { name: "Clock" });
      await expect(within(menu).getByRole("menuitem", { name: "Add to Home" })).toHaveAttribute("aria-disabled", "true");
    },
    "Android busy": async () => {
      const menu = await screen.findByRole("menu", { name: "Clock" });
      await expect(within(menu).queryByRole("menuitem", { name: "App info" })).toBeNull();
    },
  },
};
