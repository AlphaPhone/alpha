import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { MapCreditsProps } from "./MapCredits.tsx";

export const meta: ComponentMeta<MapCreditsProps> = {
  args: {
    credits: "BadgeOnly", copyright: "Map data ©2026 Google", attribution: "Google", open: false, onOpen: fn(), onClose: fn(), onCoordinates: fn(),
    locationDenied: false, onLocationSettings: fn(),
    recipients: [{ role: "gateway", name: "Eliza Cloud", operator: "Eliza Labs" }, { role: "search", name: "Google Maps Platform", operator: "Google" }],
  },
  examples: {
    Open: { open: true },
    OpenData: { credits: "CreditLinks", copyright: "", attribution: "© OpenStreetMap contributors" },
    LocationDenied: { open: true, locationDenied: true },
  },
  play: {
    Default: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("button", { name: "Map information" })).toBeNull();
    },
    LocationDenied: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Open settings" }));
      await expect(args.onLocationSettings).toHaveBeenCalled();
    },
  },
};
