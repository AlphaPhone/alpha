import type { ComponentMeta } from "vibestack/stories";
import type { BrowserReviewProps } from "./BrowserReview.tsx";

const press = () => {};

export const meta: ComponentMeta<BrowserReviewProps> = {
  args: {
    open: true,
    title: "Clear browsing data?",
    children: "Clears history, cookies and tabs.",
    confirmLabel: "Clear data",
    destructive: true,
    onConfirm: press,
    onCancel: press,
  },
};
