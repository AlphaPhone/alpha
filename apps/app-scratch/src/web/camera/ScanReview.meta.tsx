import type { ComponentMeta } from "vibestack/stories";
import type { ScanReviewProps } from "./ScanReview.tsx";
import { documentOpen, notesUnconfirmed, searchableReady, textReview, twoPages } from "./fixtures.ts";

export const meta: ComponentMeta<ScanReviewProps> = {
  args: { dialogs: textReview, scan: twoPages, can: () => true, canScan: () => true, searchLines: [], scanner: () => undefined },
  examples: {
    NotesUnconfirmed: { dialogs: notesUnconfirmed },
    Document: { dialogs: documentOpen },
    SearchableReview: {
      dialogs: searchableReady,
      searchLines: [[{ text: "Receipt", x: 0.1, y: 0.1, width: 0.5, height: 0.05 }], []],
    },
  },
};
