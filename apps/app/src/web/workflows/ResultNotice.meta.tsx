import type { ComponentMeta } from "vibestack/stories";
import type { ResultNoticeProps } from "./ResultNotice.tsx";
import { resultQuestion, resultTapped } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ResultNoticeProps> = {
  args: {
    results: resultTapped, tap: { kind: "ready", runId: "r9", workflowId: "d1", question: false }, excerpt: "Help me understand this saved result.",
    can: { consume: true, review: true, submit: false, dismiss: false },
    onOpen: none, onAsk: none, onExcerpt: none, onContinue: none, onCancel: none,
  },
  examples: {
    Question: { results: resultQuestion, tap: { kind: "ready", runId: "r9", workflowId: "d1", question: true }, can: { consume: false, review: false, submit: true, dismiss: true } },
    OtherAccount: { tap: { kind: "notice", notice: "SignInToMatching" }, can: { consume: false, review: false, submit: false, dismiss: false } },
  },
};
