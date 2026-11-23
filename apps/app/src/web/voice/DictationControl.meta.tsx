import { Effect } from "effect";
import type { ComponentMeta } from "vibestack/stories";
import type { DictationControlProps } from "./DictationControl.tsx";

export const meta: ComponentMeta<DictationControlProps> = {
  args: { target: { id: "draft:notes", account: "preview", draftLength: () => Effect.succeed(0), insert: () => Effect.void } },
};
