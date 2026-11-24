import type { ComponentMeta } from "vibestack/stories";
import { initial as writes } from "../../../gen/calendar__device.ts";
import type { CalendarScreenViewProps } from "./CalendarScreenView.tsx";
import {
  agentDisconnected, agentFailed, agentLoading, agentReady, agentStale, deviceAllowed, deviceConnect, deviceFailed, deviceLimited, linkView, newEventFields, now,
  offeredDraft, openDraft, organizerFacts, presentation, rows, run, standup, unreadPresentation,
} from "./fixtures.ts";

const none = () => undefined;
const draftActions = { onEdit: none, onRestore: () => Promise.resolve(undefined), onReview: none, onAnswerReview: none, onRetry: none, onRecovery: none };

export const meta: ComponentMeta<CalendarScreenViewProps> = {
  args: {
    presentation, can: () => true, agent: agentReady, device: deviceAllowed, writes, draft: openDraft, link: linkView, rows, facts: organizerFacts,
    timingLocked: false, problem: "", zone: "UTC", now,
    onClose: none, onEvent: none, onOpenSources: none, onCloseSources: none, onLink: none, onRetry: none, onConnectDevice: none, onOpenRow: none, onOpenLink: none,
    onDelete: none, onRespond: none, onPlace: none, onOpenOrigin: none, onCloseRow: none, onStartEditor: none, draftActions, onSave: none, onCloseEditor: none,
  },
  examples: {
    Week: { presentation: { ...presentation, view: "WeekView" } },
    Month: { presentation: { ...presentation, view: "MonthView", datePicker: true } },
    Searching: { presentation: { ...presentation, view: "ScheduleView", searching: true } },
    EventOpen: { presentation: { ...presentation, openEvent: standup.id, openSource: "AgentSource" }, origin: { label: "FromNoteTitled", title: "Team offsite", noteId: "n-1" } },
    DeleteRepeating: { presentation: { ...presentation, openEvent: run.id, openSource: "DeviceSource", deleteSheet: true } },
    NewEventRetained: { presentation: { ...presentation, form: "NewForm" }, draft: offeredDraft, editing: { fields: newEventFields, row: undefined, owner: "owner" } },
    Loading: { presentation: unreadPresentation, agent: agentLoading, rows: [] },
    NotConnected: { presentation: unreadPresentation, agent: agentDisconnected, device: deviceConnect, rows: [] },
    Failed: { agent: agentFailed, device: deviceFailed, rows: [] },
    StaleAndLimited: { agent: agentStale, device: deviceLimited, presentation: { ...presentation, sourcesSheet: true } },
    ControlsRefused: { can: () => false },
  },
};
