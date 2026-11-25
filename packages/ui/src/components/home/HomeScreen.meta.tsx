import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { homeCards } from "./HomeCardRow.meta.tsx";
import type { HomeScreenProps } from "./HomeScreen.tsx";
import { hiddenApps, homeTiles } from "./HomeTileGrid.meta.tsx";

const unbadged = homeTiles.map(({ badge: _badge, ...tile }) => tile);
const onOpenTile = fn();
const editing: Partial<HomeScreenProps> = { editing: true, tiles: unbadged, onOpenTile: undefined, onBeginEditing: undefined };

export const meta: ComponentMeta<HomeScreenProps> = {
  args: { cards: homeCards, tiles: homeTiles, hidden: hiddenApps, onOpenTile },
  decorator: (story) => <div className="h-dvh">{story()}</div>,
  examples: {
    "Reading saved tiles": { tiles: undefined, cards: [], onBeginEditing: undefined },
    Editing: editing,
    "Add to Home": { ...editing, adding: true, onShowHidden: undefined },
    "Saving a change": { ...editing, onRemoveTile: undefined, onMoveTile: undefined, onShowHidden: undefined },
    "Not saved": { ...editing, notice: { tag: "TellNotSaved" } },
    "Empty Home": { tiles: [], cards: [] },
    "In a browser": { onBeginEditing: undefined },
    "Assistant only": { tiles: [], cards: [], onBeginEditing: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpenTile.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Settings" }));
      await expect(onOpenTile.mock.calls).toEqual([["Settings"]]);
    },
    "Add to Home": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Add to Home" });
      await expect(within(sheet).getAllByRole("button").map((row) => row.textContent)).toEqual(["Notes", "Files", "Workflows"]);
    },
    "Assistant only": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect([within(canvasElement).queryAllByRole("button"), within(canvasElement).queryByRole("region")]).toEqual([[], null]),
  },
};
