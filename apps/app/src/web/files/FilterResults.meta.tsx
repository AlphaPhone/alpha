import type { ComponentMeta } from "vibestack/stories";
import type { FilterResultsProps } from "./FilterResults.tsx";
import { filtered } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<FilterResultsProps> = {
  args: { filter: filtered, onOpen: none, onClear: none },
  examples: { Incomplete: { filter: { ...filtered, complete: false } }, NoMatches: { filter: { ...filtered, rows: [] } } },
};
