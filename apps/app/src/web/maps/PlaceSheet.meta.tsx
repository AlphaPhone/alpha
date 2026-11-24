import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ferryBuilding, shownGooglePlace, shownPlace } from "./fixtures.ts";
import type { PlaceSheetProps } from "./PlaceSheet.tsx";

const handlers = {
  onDirections: fn(), onToggleSaved: fn(), onRename: fn(), onShare: fn(), onCall: fn(), onCopy: fn(), onWebsite: fn(), onClose: fn(), onEditing: fn(),
};

export const meta: ComponentMeta<PlaceSheetProps> = {
  args: { shown: shownPlace, details: "Ready", restricted: false, saved: false, canDirections: true, canCall: true, ...handlers },
  examples: {
    Google: { shown: shownGooglePlace, restricted: true },
    Category: { shown: { ...shownPlace, label: "Walgreens", place: { ...ferryBuilding, name: "Walgreens", categories: ["Pharmacy", "Shop"] } } },
    LoadingDetails: { details: "Loading", shown: { ...shownPlace, place: undefined } },
    Saved: { saved: true, shown: { ...shownPlace, savedId: 1 } },
    LauncherBuild: { canCall: false },
    Renaming: { shown: { ...shownPlace, providerPlaceId: undefined }, editing: "Pier 39 entrance" },
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
    Category: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByText("Pharmacy")).toBeInTheDocument();
      await expect(canvas.queryByText("Shop")).toBeNull();
    },
    Default: async ({ canvasElement, args }) => {
      await expect(canvasElement.querySelector("header p")).toBeNull();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Directions/ }));
      await expect(args.onDirections).toHaveBeenCalled();
    },
    Renaming: async ({ canvasElement, args }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("textbox", { name: "Place name" })).toHaveValue("Pier 39 entrance");
      await userEvent.click(canvas.getByRole("button", { name: "Save name" }));
      await expect(args.onRename).toHaveBeenCalledWith("Pier 39 entrance");
      await expect(args.onEditing).toHaveBeenCalledWith(undefined);
    },
  },
};
