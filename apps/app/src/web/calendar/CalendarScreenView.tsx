// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"; spec/calendar/presentation.md, "Story: Search my events and list what is coming"; spec/calendar/presentation.md, "Story: See only what the current read found, for the current account"; spec/calendar/presentation.md, "A day is free only when the read covering it was complete"; spec/calendar/presentation.md, "Without an agent session Calendar says Not connected and offers Settings, never a dead Connect"; spec/calendar/presentation.md, "Story: Choose which calendars I see"; spec/calendar/presentation.md, "The Calendars sheet is a modal over the view, opened only with no form or delete sheet open"; spec/notes/origins.md, "Story: Go from a saved event or reminder back to its note"
import { CalendarDays, Layers, Plus, RefreshCw, Search, Settings, X } from "lucide-react";
import { useState } from "react";
import { type CalendarView, type Event as PresentationEvent, type Presentation, dayEmptiness, statusAction } from "../../../gen/calendar__presentation.ts";
import type { RecurrenceScope } from "../../../gen/calendar__editor.ts";
import type { EditorDraft } from "../../../gen/calendar__drafts.ts";
import type { DeviceWrites } from "../../../gen/calendar__device.ts";
import type { AgentView } from "../../calendar/agent.vibe";
import type { DeviceRead } from "../../calendar/device.vibe";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
import type { CalendarLinkView } from "../../calendar/link.vibe";
import type { CalendarRow } from "../../calendar/model.vibe";
import type { OriginView } from "../../notes/origins.vibe";
import { formatLongDate, midnightAfter } from "../../calendar/time.ts";
import { Button, Input, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { CalendarSources } from "./CalendarSources.tsx";
import { DatePicker } from "./DatePicker.tsx";
import { EventDetail, type EventFacts } from "./EventDetail.tsx";
import { EventEditor, type EventEditorProps } from "./EventEditor.tsx";
import { MonthGrid } from "./MonthGrid.tsx";
import { ScheduleList } from "./ScheduleList.tsx";
import { Timeline } from "./Timeline.tsx";
import { coveredRange, listGroups, visibleDays } from "./layout.ts";

const VIEWS: readonly { readonly view: CalendarView; readonly label: string }[] = [
  { view: "DayView", label: "Day" }, { view: "WeekView", label: "Week" }, { view: "MonthView", label: "Month" }, { view: "ScheduleView", label: "Schedule" },
];

const STATUS_WORDS: Readonly<Record<string, string>> = {
  Disconnected: "Not connected", Loading: "Loading", Ready: "", Partial: "Updating…", Unavailable: "Unavailable", Failed: "Couldn’t load",
};

/** The form an open editor shows: its fields, the row it edits and the account it was opened for. */
export type CalendarEditing = { readonly fields: DraftFieldsRecord; readonly row: CalendarRow | undefined; readonly owner: string };

/** What the Calendar screen shows of the presentation, the agent and device reads, the editor and the Google row, and every owner action. */
export type CalendarScreenViewProps = {
  /** The presentation machine's state: the view, the day, what is open. */
  presentation: Presentation;
  /** Whether the presentation rules allow an event now. */
  can: (event: PresentationEvent) => boolean;
  /** The agent Calendar's state and the data its last read returned. */
  agent: AgentView;
  /** The device calendars' last read. */
  device: DeviceRead;
  /** The device calendar writes, and the event an unconfirmed write holds. */
  writes: DeviceWrites;
  /** The open editor's retained draft. */
  draft: EditorDraft;
  /** The Google Calendar row and its link setup. */
  link: CalendarLinkView;
  /** The rows Calendar shows, after hidden sources and held deletions. */
  rows: readonly CalendarRow[];
  /** What the open event's detail says about its people, link and deletion. */
  facts: EventFacts;
  /** The note the open event was saved from. */
  origin?: OriginView;
  /** The form shown, while one is open. */
  editing?: CalendarEditing;
  /** Whether the shown form keeps its original timing. */
  timingLocked: boolean;
  /** Why the last save did not go ahead. */
  problem: string;
  /** The device's time zone. */
  zone: string;
  /** The instant the screen renders at. */
  now: number;
  onClose: () => void;
  /** Sends an event the rules allow, reading Calendar again after it when `read` is true. */
  onEvent: (event: PresentationEvent, read: boolean) => void;
  onOpenSources: () => void;
  onCloseSources: () => void;
  /** A step of the Google Calendar row. */
  onLink: (action: "connect" | "link" | "cancel" | "disconnect") => void;
  /** Reads the agent Calendar and the device calendars again. */
  onRetry: () => void;
  /** Asks Android for the device calendars. */
  onConnectDevice: () => void;
  onOpenRow: (row: CalendarRow) => void;
  onOpenLink: (url: string) => void;
  onDelete: (row: CalendarRow, scope: RecurrenceScope) => void;
  /** Answers the open invitation Going or Maybe. */
  onAnswer: (row: CalendarRow, answer: "accepted" | "tentative") => void;
  /** An invitation answer is being sent. */
  answering: boolean;
  onPlace: (row: CalendarRow) => void;
  onOpenOrigin: (row: CalendarRow) => void;
  onCloseRow: () => void;
  /** Opens the editor on a row, or on a new event. */
  onStartEditor: (row: CalendarRow | undefined) => void;
  /** The draft's own steps while the editor is open. */
  draftActions: Pick<EventEditorProps, "onEdit" | "onRestore" | "onReview" | "onAnswerReview" | "onRetry" | "onRecovery">;
  onSave: (fields: DraftFieldsRecord) => void;
  onCloseEditor: () => void;
};

/**
 * The Calendar screen as its machines and reads leave it: day, week, month and schedule views, the sheets over them and the editor.
 * @model spec/calendar/presentation.md
 */
export function CalendarScreenView({
  presentation: p, can, agent, device, writes, draft, link, rows, facts, origin, editing, timingLocked, problem, zone, now,
  onClose, onEvent, onOpenSources, onCloseSources, onLink, onRetry, onConnectDevice, onOpenRow, onOpenLink, onDelete, onAnswer, answering, onPlace, onOpenOrigin, onCloseRow,
  onStartEditor, draftActions, onSave, onCloseEditor,
}: CalendarScreenViewProps) {
  const [query, setQuery] = useState("");
  const agentHidden = p.owner !== "" && p.hiddenAgentOwners.includes(p.owner);
  const open = rows.find((row) => row.id === p.openEvent);
  const go = (event: PresentationEvent, read = false) => {
    if (!can(event)) return;
    onEvent(event, read);
  };
  const readComplete = agent.state.status === "Ready" && !device.truncated;
  const empty = dayEmptiness(readComplete, p.truncated, p.lastReadToken > 0);
  const emptyText = empty === "DayFree" ? "Free" : empty === "DayIncomplete" ? "Incomplete" : STATUS_WORDS[agent.state.status] || "Loading";
  const days = p.view === "WeekView" ? visibleDays(p.day, 7) : [p.day];
  const windowStart = agent.window?.range.begin ?? midnightAfter(now, zone, -31);
  const windowEnd = agent.window?.range.end ?? midnightAfter(now, zone, 62);
  const from = p.searching ? windowStart : Math.max(windowStart, midnightAfter(now, zone, 0));
  const groups = listGroups(rows, from, windowEnd, p.searching ? query : null, zone, now);
  const action = statusAction(agent.state.status !== "Disconnected", agent.state.status === "Failed" || agent.state.status === "Unavailable" || device.status === "failed");
  const status = agent.savedAt !== undefined ? (agent.state.read.id !== 0 ? "Refreshing" : "Couldn’t refresh") : STATUS_WORDS[agent.state.status] ?? "";
  return (
    <main className="flex h-full flex-col bg-background text-foreground">
      <header data-alpha-app-header="main" className="flex items-center gap-2 px-4 py-2">
        <Button variant="ghost" size="icon" aria-label="Close Calendar" onClick={onClose}><X /></Button>
        <Button variant="ghost" className="flex-1 justify-start font-display text-2xl" aria-label="Choose date" onClick={() => go({ type: "openDatePicker" })}>
          {formatLongDate(midnightAfter(now, zone, p.day), zone)}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Search events" onClick={() => go({ type: "openSearch" })}><Search /></Button>
        <Button variant="ghost" size="icon" aria-label="Calendars" disabled={!can({ type: "openSources" })} onClick={onOpenSources}><Layers /></Button>
        <Button variant="ghost" size="icon" aria-label="New event" disabled={!can({ type: "newForm" })} onClick={() => onStartEditor(undefined)}><Plus /></Button>
      </header>
      <Tabs value={p.view} onValueChange={(view) => go({ type: "chooseView", view: view as CalendarView }, true)} className="px-4">
        <TabsList>{VIEWS.map((choice) => <TabsTrigger key={choice.view} value={choice.view} disabled={!can({ type: "chooseView", view: choice.view }) && choice.view !== p.view}>{choice.label}</TabsTrigger>)}</TabsList>
      </Tabs>
      {(status !== "" || device.status === "limited" || device.status === "failed") && (
        <div role="status" className="flex items-center justify-between gap-2 px-4 py-1 text-sm text-muted-foreground">
          <span>{[status, device.status === "limited" ? "2,000 max" : device.status === "failed" ? "Couldn’t load device calendars" : ""].filter(Boolean).join(" · ")}</span>
          {action === "OfferSettings" && (
            <Button variant="outline" size="sm" aria-label="Open Calendar settings" onClick={() => onLink("connect")}><Settings aria-hidden />Settings</Button>
          )}
          {action === "OfferRetry" && (
            <Button variant="ghost" size="icon" aria-label="Retry calendar and reminders" onClick={onRetry}><RefreshCw /></Button>
          )}
        </div>
      )}
      {device.status === "connect" && (
        <Button variant="outline" className="mx-4" onClick={onConnectDevice}>
          <CalendarDays aria-hidden />Connect device calendars
        </Button>
      )}
      {p.searching && (
        <div className="flex items-center gap-2 px-4 py-2">
          <Input autoFocus aria-label="Search events" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => { setQuery(""); go({ type: "closeSearch" }, true); }}><X /></Button>
        </div>
      )}
      {p.view === "MonthView" && !p.searching ? (
        <MonthGrid rows={rows} day={p.day} month={p.month} zone={zone} now={now} onPickDay={(day) => go({ type: "chooseDay", day }, true)} onMonth={(month) => go({ type: "chooseMonth", month }, true)} />
      ) : p.view === "ScheduleView" || p.searching ? (
        <ScheduleList groups={groups} range={p.searching ? `Searching ${coveredRange(from, windowEnd, zone)}` : `Through ${coveredRange(from, windowEnd, zone).split(" – ")[1]}`}
          emptyText={p.lastReadToken === 0 ? status || "Loading" : p.searching ? (query.trim() ? "No matching events" : "No events") : "No upcoming events"}
          onOpen={onOpenRow} />
      ) : (
        <Timeline rows={rows} days={days} day={p.day} zone={zone} now={now} emptyText={emptyText}
          onOpen={onOpenRow} onPickDay={(day) => go({ type: "chooseDay", day }, true)} />
      )}
      <CalendarSources open={p.sourcesSheet} agentShown={!agentHidden} deviceShown={p.deviceVisible} agentAccess={p.agentAccess && p.owner !== ""} deviceAccess={p.deviceAccess}
        onAgent={(shown) => go(shown ? { type: "showAgent" } : { type: "hideAgent" })} onDevice={() => go({ type: "toggleDevice" })} onClose={onCloseSources}
        {...(p.owner === "" ? {} : { google: { ...link, onLink: () => onLink("link"), onCancel: () => onLink("cancel"),
          onConnect: () => onLink("connect"), onDisconnect: () => onLink("disconnect") } })} />
      <DatePicker open={p.datePicker} rows={rows} day={p.day} month={p.month} zone={zone} now={now}
        onMonth={(month) => go({ type: "chooseMonth", month }, true)} onPickDay={(day) => { go({ type: "chooseDay", day }, true); }} onClose={() => go({ type: "closeDatePicker" })} />
      {p.form === "NoForm" && (
        <EventDetail row={open} facts={facts} deleting={p.deleteSheet} held={open !== undefined && open.source === "device" && writes.held !== "" && open.id.startsWith(`device:${writes.held}:`)}
          canEdit={open !== undefined && can({ type: "editForm", editable: open.writable })} canDelete={open !== undefined && can({ type: "askDelete", editable: open.writable })}
          onEdit={() => onStartEditor(open)} onAskDelete={() => open && go({ type: "askDelete", editable: open.writable })}
          onDelete={(scope) => open && onDelete(open, scope)}
          onAnswer={(answer) => open && onAnswer(open, answer)} answering={answering}
          onCloseDelete={() => go({ type: "closeDeleteSheet" })} onCheckAgain={onRetry}
          onOpenLink={onOpenLink} onPlace={() => open && onPlace(open)}
          {...(open === undefined || origin === undefined ? {} : { origin, onOpenOrigin: () => onOpenOrigin(open) })}
          onClose={onCloseRow} />
      )}
      {p.form !== "NoForm" && editing !== undefined && (
        <EventEditor fields={editing.fields} draft={draft} recurring={editing.row?.recurring === true} repeats={editing.row?.source === "device"}
          calendars={editing.row === undefined ? [{ value: "local", label: "Agent Calendar" },
            ...device.calendars.filter((calendar) => calendar.writable).map((calendar) => ({ value: `native:${calendar.id}`, label: calendar.account === "" ? calendar.name : `${calendar.name} · ${calendar.account}` }))] : []}
          timingLocked={timingLocked} deviceZone={zone}
          loading={agent.state.read.id !== 0} otherAccount={editing.owner !== agent.state.owner}
          eventChanged={editing.row !== undefined && rows.find((row) => row.id === editing.row?.id)?.revision !== editing.row.revision} problem={problem}
          {...draftActions} onSave={onSave} onClose={onCloseEditor} />
      )}
    </main>
  );
}
