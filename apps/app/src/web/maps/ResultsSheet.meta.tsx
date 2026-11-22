import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { ferryBuilding } from "./fixtures.ts";
import type { ResultsSheetProps } from "./ResultsSheet.tsx";

export const meta: ComponentMeta<ResultsSheetProps> = {
  args: { phase: "Ready", places: [ferryBuilding], saved: [], recent: [], emptyQuery: false, onPick: fn(), onSaved: fn(), onSearch: fn(), onClearRecent: fn() },
  examples: {
    Loading: { phase: "Loading", places: [] },
    NoResults: { phase: "Empty", places: [] },
    Start: { emptyQuery: true, recent: ["coffee", "Pier 39"], saved: [{ id: 1, label: "Home", lat: 37780000, lng: -122420000, provider: "", providerPlaceId: "" }] },
  },
};
