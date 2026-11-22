import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { altRoute, ferryBuilding, walkRoute } from "./fixtures.ts";
import type { DirectionsSheetProps } from "./DirectionsSheet.tsx";

export const meta: ComponentMeta<DirectionsSheetProps> = {
  args: {
    destination: "Pier 39", originText: "Your location", travel: "Walk", offered: (t) => t !== "Transit", route: "Ready", routes: [walkRoute, altRoute], chosen: 0,
    choosing: false, candidates: [], savedMatches: [], canSwap: true, canStart: true, restricted: false,
    onOriginText: fn(), onSubmitOrigin: fn(), onUseLocation: fn(), onTravel: fn(), onChooseRoute: fn(), onChooseCandidate: fn(), onChooseSaved: fn(),
    onSwap: fn(), onStart: fn(), onShare: fn(), onClose: fn(),
  },
  examples: {
    Planning: { route: "Loading", routes: [], canStart: false, canSwap: false },
    ChoosingOrigin: { choosing: true, route: "NotAsked", routes: [], canStart: false, candidates: [ferryBuilding], originText: "ferry" },
    Google: { restricted: true },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("radio", { name: /Alternative 1/ }));
      await expect(args.onChooseRoute).toHaveBeenCalledWith(1);
    },
    Planning: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "Start" })).toBeDisabled();
    },
  },
};
