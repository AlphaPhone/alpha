import { Effect } from "effect";
import type { ComponentMeta } from "vibestack/stories";
import type { DictationControlProps } from "./DictationControl.tsx";

export const meta: ComponentMeta<DictationControlProps> = {
  args: {
    target: { id: "fixture-draft", account: "fixture-account", draftLength: () => Effect.succeed(0), insert: () => Effect.void },
  },
};
