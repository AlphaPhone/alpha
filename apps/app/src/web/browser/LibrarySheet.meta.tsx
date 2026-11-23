import type { ComponentMeta } from "vibestack/stories";
import type { LibrarySheetProps } from "./LibrarySheet.tsx";
import { damagedMarks, historySession, loadedSession, someMarks } from "./fixtures.ts";

const bookmarksSession = { ...loadedSession, layers: { ...loadedSession.layers, library: "BookmarksList" as const } };

const today = Date.UTC(2026, 10, 22, 12);

export const meta: ComponentMeta<LibrarySheetProps> = {
  args: { session: bookmarksSession, bookmarks: someMarks, today },
  examples: {
    History: { session: historySession, bookmarks: someMarks, today },
    Recovery: { session: bookmarksSession, bookmarks: damagedMarks, today },
    NoHistory: { session: { ...historySession, visits: [] }, bookmarks: someMarks, today },
  },
};
