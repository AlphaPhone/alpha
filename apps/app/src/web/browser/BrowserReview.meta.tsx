import type { ComponentMeta } from "vibestack/stories";
import type { BrowserReviewProps } from "./BrowserReview.tsx";

const shown = { foreground: true, locked: false };

export const meta: ComponentMeta<BrowserReviewProps> = {
  args: { reviews: { ...shown, open: [{ id: "browser-clear-data", kind: "ClearBrowsingData", detail: "history, cookies and tabs" }] } },
  examples: {
    LeavePrivate: { reviews: { ...shown, open: [{ id: "external-browser", kind: "LeavePrivate", detail: "https://example.test/news" }] } },
    ClearSite: { reviews: { ...shown, open: [{ id: "browser-clear-site", kind: "ClearSiteData", detail: "example.test" }] } },
  },
};
