import type { ComponentMeta } from "vibestack/stories";
import type { ComposerViewProps } from "./ComposerView.tsx";
import { draft, workAccount } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ComposerViewProps> = {
  args: {
    draft, account: workAccount, accounts: [workAccount], canSend: true, canSaveToGmail: true, busy: false,
    onEdit: none, onAttach: none, onBack: none, onSend: none, onSaveToGmail: none, onMove: none, candidates: ["bo@example.com", "cy@example.com"],
  },
  examples: { ReadOnlyAccount: { canSend: false, canSaveToGmail: false }, Earlier: { draft: { ...draft, earlier: true } } },
};
