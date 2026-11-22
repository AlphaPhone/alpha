import type { ComponentMeta } from "vibestack/stories";
import type { BrowseViewProps } from "./BrowseView.tsx";
import { browse, denied, recent } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<BrowseViewProps> = {
  args: { browser: browse, recent, onCategory: none, onVolume: none, onTrash: none, onAllow: none, onRetry: none, onRecent: none, onPick: none },
  examples: { Denied: { browser: denied }, NoRecent: { recent: { ...recent, rows: [] } } },
};
