import type { ComponentMeta } from "vibestack/stories";
import type { LibrarySheetProps } from "./LibrarySheet.tsx";
import { damagedMarks, historySession, loadedSession, someMarks } from "./fixtures.ts";

const bookmarksSession = { ...loadedSession, layers: { ...loadedSession.layers, library: "BookmarksList" as const } };

export const meta: ComponentMeta<LibrarySheetProps> = {
  args: { session: bookmarksSession, bookmarks: someMarks },
  examples: { History: { session: historySession, bookmarks: someMarks }, Recovery: { session: bookmarksSession, bookmarks: damagedMarks } },
};
