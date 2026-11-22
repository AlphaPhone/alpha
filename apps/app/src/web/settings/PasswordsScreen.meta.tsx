// spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"
import type { ComponentMeta } from "vibestack/stories";
import { damaged, unlocked } from "./fixtures.ts";
import type { PasswordsScreenProps } from "./PasswordsScreen.tsx";

const none = () => undefined;

export const meta: ComponentMeta<PasswordsScreenProps> = {
  args: { vault: unlocked, onClose: none, acts: { run: none, edit: none, askRemove: none, askReset: none, refresh: none } },
  states: { Damaged: { vault: damaged }, Locked: { vault: { ...unlocked, phase: { tag: "Locked" }, entries: [] } } },
};
