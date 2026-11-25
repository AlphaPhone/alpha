import type { ComponentMeta } from "vibestack/stories";
import type { VoiceNoteViewProps } from "./VoiceNoteView.tsx";

export const meta: ComponentMeta<VoiceNoteViewProps> = {
  args: {
    title: "Design sync",
    meta: "Mon · 6:48",
    time: "0:00 / 6:48",
    summary: ["Notifications stay as icons until unlock"],
    actions: [{ text: "Book a review with Jordan next week", done: false }],
    lines: [{ initials: "MC", who: "Maya", own: false, at: "0:00", text: "Okay, lock screen first." }],
  },
};
