import type { ComponentMeta } from "vibestack/stories";
import type { AppTileProps } from "./AppTile.tsx";
import { notesTile } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<AppTileProps> = {
  args: { face: notesTile, onPointerDown: noop, onContextMenu: noop, onActivate: noop, onKey: noop },
  examples: {
    Editing: { editing: true },
    Dragged: { editing: true, offset: { x: 24, y: -12 } },
    Unread: { face: { ...notesTile, badge: true } },
    Launching: { face: { key: "org.fixture.camera/org.fixture.camera.Main", label: "Camera", detail: "Work" }, launching: true },
  },
};
