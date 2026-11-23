import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/calendar__googleLink.ts";
import type { GoogleCalendarLinkProps } from "./GoogleCalendarLink.tsx";

const handlers = { onLink: () => undefined, onCancel: () => undefined, onConnect: () => undefined, onDisconnect: () => undefined };
const base = { link: initial, destination: "", held: 0, running: false, pause: undefined, ...handlers } as const;

export const meta: ComponentMeta<GoogleCalendarLinkProps> = {
  args: { ...base, row: "RowConnected" },
  examples: {
    NotConnected: { ...base, row: "RowNotConnected" },
    FinishSetup: { ...base, row: "RowFinishSetup" },
    CouldNotCheck: { ...base, row: "RowCouldNotCheck" },
    Linking: { ...base, row: "RowConnected", running: true },
    Synced: { ...base, row: "RowConnected", destination: "owner@example.com", link: { ...initial, phase: "LinkDone", outcome: "LinkSynced", message: "Linked" } },
    Held: { ...base, row: "RowConnected", held: 2, link: { ...initial, phase: "LinkDone", outcome: "LinkUnconfirmed", message: "ConflictMany" } },
    PauseUnknown: { ...base, row: "RowConnected", pause: "PauseUnknown" },
  },
};
