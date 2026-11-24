import type { ComponentMeta } from "vibestack/stories";
import type { HomeScreenProps } from "./HomeScreen.tsx";
import { busyDay, homeTiles, idleControls, quietDay } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<HomeScreenProps> = {
  args: { overview: busyDay, tiles: homeTiles, library: true, notifications: true, controls: idleControls, onOpen: noop, onLibrary: noop, onAdd: noop, onDone: noop, onNotifications: noop },
  examples: {
    Quiet: { overview: quietDay },
    Editing: { editing: true, canAdd: true },
    EditingWithError: { editing: true, editError: "Favorites could not be saved. Nothing changed." },
  },
};
