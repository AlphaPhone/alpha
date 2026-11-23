import type { ComponentMeta } from "vibestack/stories";
import type { NotificationsPageProps } from "./NotificationsPage.tsx";
import { mirrorChoices, mirrorHistory, mirrorPaused, mirrorShown } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<NotificationsPageProps> = {
  args: {
    mirror: mirrorShown, onOpenChannels: noop, onOpenAccess: noop, onMirror: noop, onKeepHistory: noop, onPreview: noop, onRemove: noop,
    onAdd: noop, onShowChoices: noop, onShowHistory: noop, onClearHistory: noop, onResume: noop,
  },
  examples: {
    Choosing: { choices: mirrorChoices },
    History: { history: mirrorHistory },
    Paused: { mirror: mirrorPaused },
  },
};
