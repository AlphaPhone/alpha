import type { ComponentMeta } from "vibestack/stories";
import type { FindBarProps } from "./FindBar.tsx";
import { findingSession } from "./fixtures.ts";

export const meta: ComponentMeta<FindBarProps> = {
  args: { session: findingSession },
  examples: {
    NoMatches: { session: { ...findingSession, find: { ...findingSession.find, count: 0, index: 0, done: true } } },
    Empty: { session: { ...findingSession, find: { tab: "b1", query: "", count: 0, index: 0, done: true } } },
  },
};
