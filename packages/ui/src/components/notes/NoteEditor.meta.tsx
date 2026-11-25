import type { ComponentMeta } from "vibestack/stories";
import type { NoteEditorProps } from "./NoteEditor.tsx";

export const meta: ComponentMeta<NoteEditorProps> = {
  args: { title: "Enclave launch", kind: "text", body: "Confirm attestation flow\nShip the keys-on-device doc\nDry run Friday" },
  examples: { checklist: { title: "Groceries", kind: "list", items: [{ key: "1", text: "Oat milk", done: true }, { key: "2", text: "Lemons", done: false }] } },
};
