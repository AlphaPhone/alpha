import type { ComponentMeta } from "vibestack/stories";
import { shownRows } from "../../notes/list.vibe";
import { now, rows } from "./fixtures.ts";
import type { NotesListProps } from "./NotesList.tsx";

export const meta: ComponentMeta<NotesListProps> = {
  args: { rows: shownRows(rows), now, onOpen: () => undefined },
  examples: { Empty: { rows: [] }, Open: { openId: "standup" } },
};
