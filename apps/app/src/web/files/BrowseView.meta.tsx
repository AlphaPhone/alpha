import type { ComponentMeta } from "vibestack/stories";
import type { BrowseViewProps } from "./BrowseView.tsx";
import { browse, denied } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<BrowseViewProps> = {
  args: { browser: browse, onAllFiles: none, onCategory: none, onVolume: none, onTrash: none, onAllow: none, onRetry: none },
  examples: { Denied: { browser: denied }, Android10: { browser: { ...denied, legacyAccess: true } }, Unavailable: { browser: { ...denied, access: "AccessUnavailable" } },
    Uncounted: { browser: { ...browse, counts: [], trashCount: -1 } } },
};
