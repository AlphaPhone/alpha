import type { ComponentMeta } from "vibestack/stories";
import type { NoticeAskSheetProps } from "./NoticeAskSheet.tsx";
import { askReview } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<NoticeAskSheetProps> = {
  args: { notices: askReview, failure: "", onConfirm: none, onCancel: none },
  examples: { Changed: { failure: "The notification changed. Nothing was asked." } },
};
