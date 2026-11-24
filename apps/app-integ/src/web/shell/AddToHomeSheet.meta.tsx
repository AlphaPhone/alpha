import type { ComponentMeta } from "vibestack/stories";
import type { AddToHomeSheetProps } from "./AddToHomeSheet.tsx";
import { notesTile } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<AddToHomeSheetProps> = {
  args: { hidden: [notesTile], open: true, onAdd: noop, onClose: noop },
  examples: { NothingToAdd: { hidden: [] } },
};
