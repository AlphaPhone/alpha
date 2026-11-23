import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { shownGooglePlace, shownPlace } from "./fixtures.ts";
import type { PlaceSheetProps } from "./PlaceSheet.tsx";

const handlers = {
  onDirections: fn(), onToggleSaved: fn(), onRename: fn(), onShare: fn(), onCall: fn(), onCopy: fn(), onWebsite: fn(), onClose: fn(),
};

export const meta: ComponentMeta<PlaceSheetProps> = {
  args: { shown: shownPlace, details: "Ready", restricted: false, saved: false, canDirections: true, canCall: true, ...handlers },
  examples: {
    Google: { shown: shownGooglePlace, restricted: true },
    LoadingDetails: { details: "Loading", shown: { ...shownPlace, place: undefined } },
    Saved: { saved: true, shown: { ...shownPlace, savedId: 1 } },
    LauncherBuild: { canCall: false },
  },
  play: {
    LauncherBuild: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Call" })).toBeNull();
      await expect(canvas.getByRole("button", { name: "Copy number" })).toBeEnabled();
    },
    Google: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Share" })).toBeNull();
      await expect(canvas.queryByRole("button", { name: "Copy number" })).toBeNull();
      await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
    },
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Directions/ }));
      await expect(args.onDirections).toHaveBeenCalled();
    },
  },
};
