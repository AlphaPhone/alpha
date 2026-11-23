import type { ComponentMeta } from "vibestack/stories";
import { draft, rows } from "./fixtures.ts";
import type { NoteEditorProps } from "./NoteEditor.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NoteEditorProps> = {
  args: { draft, row: rows[1], status: "", saved: true, playing: false, positionMs: 0, transcribing: false,
    onEdit: noop, onBack: noop, onDelete: noop, onShare: noop, onSchedule: noop, onPlay: noop, onStopPlayback: noop, onTranscribe: noop, onWebSource: noop, onAttachment: noop },
  examples: {
    Checklist: { draft: { ...draft, title: "Groceries", body: "", separator: "", format: rows[0]?.kind === "list" ? { kind: "list", data: { items: [{ t: "Oat milk", done: true }, { t: "Lemons", done: false }] } } : undefined }, row: rows[0] },
    Voice: { draft: { ...draft, title: "Voice note", body: "Remember to call the clinic.", format: { kind: "voice", data: {} } }, row: rows[2] },
    Unsaved: { status: "Unsaved", saved: false },
  },
};
