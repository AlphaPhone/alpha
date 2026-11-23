import type { ComponentMeta } from "vibestack/stories";
import type { ReminderFormProps } from "./ReminderForm.tsx";
import { keptDraft } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ReminderFormProps> = {
  args: { initial: { ...keptDraft, title: "", body: "" }, saving: false, kept: false, onChange: none, onSave: none, onCancel: none, onDiscard: none },
  examples: { Kept: { initial: keptDraft, kept: true }, Saving: { initial: keptDraft, saving: true } },
};
