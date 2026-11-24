import type { ComponentMeta } from "vibestack/stories";
import type { AddressEditorProps } from "./AddressEditor.tsx";
import { editingSession, privateSession, someMarks } from "./fixtures.ts";

export const meta: ComponentMeta<AddressEditorProps> = {
  args: { session: editingSession, marks: someMarks.marks },
  examples: { Private: { session: { ...privateSession, layers: { ...privateSession.layers, editing: true } }, marks: someMarks.marks } },
};
