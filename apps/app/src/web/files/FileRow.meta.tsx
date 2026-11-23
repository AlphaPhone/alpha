import type { ComponentMeta } from "vibestack/stories";
import type { FileRowProps } from "./FileRow.tsx";
import { rows } from "./fixtures.ts";

export const meta: ComponentMeta<FileRowProps> = {
  args: { row: rows[1]!, onOpen: () => undefined },
  examples: { Folder: { row: rows[0]! }, Selected: { selecting: true, selected: true }, Grid: { grid: true } },
  decorator: (story) => <ul>{story()}</ul>,
};
