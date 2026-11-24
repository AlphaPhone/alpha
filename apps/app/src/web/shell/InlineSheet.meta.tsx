import type { ComponentMeta } from "vibestack/stories";
import { ListRow } from "../components/ui/index.ts";
import type { TileFace } from "./AppTile.tsx";
import { homeTiles, manyTiles } from "./fixtures.ts";
import type { InlineSheetProps } from "./InlineSheet.tsx";

const noop = () => {};
const rows = (faces: readonly TileFace[]) =>
  faces.map(({ key, label, icon: Icon }) => <ListRow key={key} title={label} leading={Icon ? <Icon aria-hidden className="size-6" /> : null} onClick={noop} />);

export const meta: ComponentMeta<InlineSheetProps> = {
  args: { title: "Add to Home", open: true, onClose: noop, children: rows(homeTiles) },
  examples: {
    LongContent: { title: "All apps", children: rows(manyTiles) },
    LongTitle: { title: "Choose the apps Alpha may mirror to this phone’s notification shade while you are away" },
  },
};
