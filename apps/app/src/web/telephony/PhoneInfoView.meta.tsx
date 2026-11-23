import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { phoneFacts, phoneFactsFailed, phoneFactsReading, phoneFactsTwoSims, phoneFactsUnread } from "./fixtures.ts";
import type { PhoneInfoViewProps } from "./PhoneInfoView.tsx";

export const meta: ComponentMeta<PhoneInfoViewProps> = {
  args: { facts: phoneFacts, onAllow: fn(), onRetry: fn(), onOpenStatus: fn() },
  examples: {
    TwoSims: { facts: phoneFactsTwoSims },
    Unread: { facts: phoneFactsUnread },
    Failed: { facts: phoneFactsFailed },
    Reading: { facts: phoneFactsReading },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("(415) 555-0100")).toBeVisible();
      await expect(page.getByText("5G")).toBeVisible();
      await expect(page.getByText("Good")).toBeVisible();
      await expect(page.getAllByText("Alpha")).toHaveLength(2);
      await userEvent.click(page.getByRole("button", { name: /IMEI/ }));
      await expect(args.onOpenStatus).toHaveBeenCalledWith("about");
    },
    TwoSims: async ({ canvasElement }) => {
      const page = within(canvasElement);
      await expect(page.getByText("SIM 2")).toBeVisible();
      await expect(page.getByText("4G · Roaming")).toBeVisible();
      await expect(page.getByText("eSIM")).toBeVisible();
      await expect(page.getByText("Not set up")).toBeVisible();
    },
    Unread: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.queryByText("None")).toBeNull();
      await userEvent.click(page.getByRole("button", { name: "Allow" }));
      await expect(args.onAllow).toHaveBeenCalled();
    },
    Failed: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(args.onRetry).toHaveBeenCalled();
    },
  },
};
