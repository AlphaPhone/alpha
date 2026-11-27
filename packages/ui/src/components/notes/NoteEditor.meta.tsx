import { expect, fn, screen, userEvent } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { NoteEditorProps } from "./NoteEditor.tsx";
import { NoteMenu } from "./NoteMenu.tsx";

export const meta: ComponentMeta<NoteEditorProps> = {
  args: {
    title: "Enclave launch", kind: "text", body: "Confirm attestation flow\nShip the keys-on-device doc\nDry run Friday",
    menu: <NoteMenu size="sm" onShare={fn()} onPin={fn()} onDelete={fn()} />,
  },
  examples: {
    fresh: { title: "New note", kind: "text" },
    checklist: { title: "Groceries", kind: "list", items: [{ key: "1", text: "Oat milk", done: true }, { key: "2", text: "Lemons", done: false }] },
    saving: { menu: undefined },
  },
  play: {
    Default: async () => {
      await userEvent.click(screen.getByRole("button", { name: "More" }));
      const menu = await screen.findByRole("menu", { name: "Note actions" });
      await expect([...menu.querySelectorAll("[role=menuitem]")].map((row) => [row.textContent, row.getAttribute("aria-disabled")]))
        .toEqual([["Share", null], ["Pin", null], ["Delete", null]]);
    },
  },
};
