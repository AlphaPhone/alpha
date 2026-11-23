import type { ComponentMeta } from "vibestack/stories";
import type { SyncSettingsProps } from "./SyncSettings.tsx";
import { destinations } from "./fixtures.ts";

export const meta: ComponentMeta<SyncSettingsProps> = {
  args: { grant: "WriteGrant", destinations },
  examples: {
    ReadOnlyGrant: { grant: "ReadOnlyGrant", destinations: [] },
    OneCalendar: { grant: "WriteGrant", destinations: destinations.slice(0, 1) },
  },
};
