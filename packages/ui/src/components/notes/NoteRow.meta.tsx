import type { ComponentMeta } from "vibestack/stories";
import type { NoteRowProps } from "./NoteRow.tsx";

export const meta: ComponentMeta<NoteRowProps> = {
  args: { title: "Enclave launch", date: "9:41 AM", preview: "Confirm attestation flow\nShip the keys-on-device doc\nDry run Friday" },
  examples: { voice: { title: "Design sync", date: "Yesterday", preview: "6:48 · Okay, lock screen first.", voice: true } },
};
