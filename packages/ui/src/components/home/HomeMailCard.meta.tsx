import type { ComponentMeta } from "vibestack/stories";
import type { HomeMailCardProps } from "./HomeMailCard.tsx";

export const meta: ComponentMeta<HomeMailCardProps> = {
  args: { unread: 17, more: true, status: "Recent email · Updated 10:24 PM", lines: [{ title: "Connect your data to AI", detail: "Google Cloud" }, { title: "Less than $25 in credits left", detail: "Google Cloud" }] },
  examples: {
    "Not current": { notCurrent: true, status: "Open to retry · last updated 10:24 PM" },
    "Not current, no time": { notCurrent: true, status: undefined },
  },
};
