import type { ComponentMeta } from "vibestack/stories";
import type { PageViewportProps } from "./PageViewport.tsx";
import { blankSession, failedSession, loadedSession, loadingSession, unsupportedSession } from "./fixtures.ts";

export const meta: ComponentMeta<PageViewportProps> = {
  args: { session: loadedSession },
  examples: {
    NewTab: { session: blankSession },
    PrivateNewTab: { session: { ...blankSession, tabs: [{ ...blankSession.tabs[0]!, profile: "Private" }] } },
    Loading: { session: loadingSession },
    Failed: { session: failedSession },
    UpdateWebView: { session: unsupportedSession },
  },
};
