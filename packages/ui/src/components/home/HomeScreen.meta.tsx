import { expect, fireEvent, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { homeCards } from "./HomeCardRow.meta.tsx";
import type { HomeScreenProps } from "./HomeScreen.tsx";
import { hiddenApps, homeTiles } from "./HomeTileGrid.meta.tsx";

const unbadged = homeTiles.map(({ badge: _badge, ...tile }) => tile);
const onPullDown = fn();
const onOpenTile = fn();
const editing: Partial<HomeScreenProps> = { editing: true, tiles: unbadged, onOpenTile: undefined, onBeginEditing: undefined, onOpenDrawer: undefined, onPullDown: undefined };

export const meta: ComponentMeta<HomeScreenProps> = {
  args: { date: "Tuesday 17", cards: homeCards, tiles: homeTiles, hidden: hiddenApps, onPullDown, onOpenTile },
  decorator: (story) => <div className="h-dvh">{story()}</div>,
  examples: {
    "Reading saved tiles": { tiles: undefined, cards: [], onBeginEditing: undefined },
    Editing: editing,
    "Add to Home": { ...editing, adding: true, onShowHidden: undefined },
    "Saving a change": { ...editing, onRemoveTile: undefined, onMoveTile: undefined, onShowHidden: undefined },
    "Not saved": { ...editing, notice: { tag: "TellNotSaved" } },
    "Empty Home": { tiles: [], cards: [] },
    "As an app": { onPullDown: undefined },
    "In a browser": { onOpenDrawer: undefined, onBeginEditing: undefined, onPullDown: undefined },
    "Assistant only": { tiles: [], cards: [], date: undefined, onOpenDrawer: undefined, onBeginEditing: undefined, onPullDown: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onPullDown.mockClear();
      onOpenTile.mockClear();
      const canvas = within(canvasElement);
      const heading = canvas.getByRole("heading", { level: 1, name: "Tuesday 17" });
      const zone = heading.parentElement!;
      await fireEvent.pointerDown(zone, { isPrimary: true, clientX: 100, clientY: 40, pointerId: 1 });
      await fireEvent.pointerUp(zone, { isPrimary: true, clientX: 104, clientY: 140, pointerId: 1 });
      await fireEvent.pointerDown(zone, { isPrimary: true, clientX: 100, clientY: 40, pointerId: 1 });
      await fireEvent.pointerUp(zone, { isPrimary: true, clientX: 100, clientY: 60, pointerId: 1 });
      await userEvent.click(canvas.getByRole("button", { name: "Settings" }));
      await expect([onPullDown.mock.calls.length, onOpenTile.mock.calls]).toEqual([1, [["Settings"]]]);
    },
    "Add to Home": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Add to Home" });
      await expect(within(sheet).getAllByRole("button").map((row) => row.textContent)).toEqual(["Notes", "Files", "Workflows"]);
    },
    "Assistant only": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect([within(canvasElement).queryAllByRole("button"), within(canvasElement).queryByRole("region")]).toEqual([[], null]),
  },
};
