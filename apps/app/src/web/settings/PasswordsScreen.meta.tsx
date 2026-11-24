// spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"
import type { ComponentMeta } from "vibestack/stories";
import { damaged, unlocked } from "./fixtures.ts";
import type { PasswordsScreenProps } from "./PasswordsScreen.tsx";

const none = () => undefined;
const base: PasswordsScreenProps = {
  vault: unlocked,
  onClose: none,
  acts: { run: none, edit: none, askRemove: none, askReset: none, openEntry: none, closeEntry: none, refresh: none },
};

export const meta: ComponentMeta<PasswordsScreenProps> = {
  args: base,
  states: {
    Damaged: { ...base, vault: damaged },
    ResetAsked: { ...base, vault: { ...damaged, confirmReset: true } },
    Locked: { ...base, vault: { ...unlocked, phase: { tag: "Locked" }, entries: [] } },
    Entry: { ...base, vault: { ...unlocked, selected: "a" } },
    RemoveAsked: { ...base, vault: { ...unlocked, selected: "a", confirmRemove: "a" } },
  },
};
