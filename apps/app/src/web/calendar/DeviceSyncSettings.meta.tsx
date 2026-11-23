import type { ComponentMeta } from "vibestack/stories";
import type { DeviceSyncPanelProps } from "./DeviceSyncSettings.tsx";
import { deviceSyncOff, deviceSyncOffered } from "./fixtures.ts";

const quiet = { onOffer: () => {}, onChoose: () => {}, onReview: () => {}, onEnable: () => {}, onSync: () => {}, onPause: () => {} };

export const meta: ComponentMeta<DeviceSyncPanelProps> = {
  args: { view: deviceSyncOff, ...quiet },
  examples: {
    Choosing: { view: { ...deviceSyncOff, selection: undefined, offered: [...deviceSyncOffered] }, ...quiet },
    NoWritableCalendar: { view: { ...deviceSyncOff, selection: undefined, offered: [] }, ...quiet },
    NotSignedIn: { view: { ...deviceSyncOff, ready: false, selection: undefined }, ...quiet },
    Reviewed: { view: { ...deviceSyncOff, status: "Ready to link 12 Alpha events.", reviewed: 12, destination: { account: "owner@example.com", calendar: "owner@example.com" } }, ...quiet },
    Running: { view: { ...deviceSyncOff, status: "Syncing…", running: true, enabled: true, destination: { account: "owner@example.com", calendar: "Team" } }, ...quiet },
    Synced: { view: { ...deviceSyncOff, status: "Synced: 2 sent to Google, 1 received, 9 unchanged.", enabled: true, destination: { account: "owner@example.com", calendar: "Team" } }, ...quiet },
    NeedsReview: { view: { ...deviceSyncOff, status: "Sync needs review: 1 conflicts, 0 unconfirmed changes, 0 refused changes.", enabled: true, destination: { account: "owner@example.com", calendar: "Team" } }, ...quiet },
  },
};
