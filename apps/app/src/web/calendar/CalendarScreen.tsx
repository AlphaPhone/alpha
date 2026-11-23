// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"; spec/calendar/presentation.md, "Story: Search my events and list what is coming"; spec/calendar/presentation.md, "Story: See only what the current read found, for the current account"; spec/calendar/presentation.md, "A day is free only when the read covering it was complete"; spec/calendar/presentation.md, "Without an agent session Calendar says Not connected and offers Settings, never a dead Connect"; spec/calendar/presentation.md, "Story: Choose which calendars I see"; spec/calendar/presentation.md, "The Calendars sheet is a modal over the view, opened only with no form or delete sheet open"; spec/notes/origins.md, "Story: Go from a saved event or reminder back to its note"
import { Effect } from "effect";
import { CalendarDays, Layers, Plus, RefreshCw, Search, Settings, X } from "lucide-react";
import { useState } from "react";
import { useMachine } from "../../../gen/calendar__presentation.react.ts";
import { type CalendarView, type Event as PresentationEvent, dayEmptiness, initial, rowShown, statusAction } from "../../../gen/calendar__presentation.ts";
import type { RecurrenceScope } from "../../../gen/calendar__editor.ts";
import { readCalendar } from "../../calendar/binding.vibe";
import { CalendarLink } from "../../calendar/link.vibe";
import { CalendarDrafts } from "../../calendar/drafts.vibe";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
import { type CalendarRow, agentEventKey, eventSourceKey } from "../../calendar/model.vibe";
import {
  closeEditor, closeRow, closeSources, deleteRow, linkSavedNote, newFields, openEditor, openEventLink, openRow, openRowOrigin, openSources, placeRow,
  rowFields, rowTimingLocked, saveEditor, timingChanged,
} from "../../calendar/screen.vibe";
import type { OriginView } from "../../notes/origins.vibe";
import { newId } from "../../platform/ids.ts";
import { deviceZone, formatLongDate, midnightAfter } from "../../calendar/time.ts";
import type { ScreenProps } from "../app-screen.ts";
import { Button, Input, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { CalendarSources } from "./CalendarSources.tsx";
import { DatePicker } from "./DatePicker.tsx";
import { EventDetail, eventFacts } from "./EventDetail.tsx";
import { EventEditor } from "./EventEditor.tsx";
import { MonthGrid } from "./MonthGrid.tsx";
import { ScheduleList } from "./ScheduleList.tsx";
import { Timeline } from "./Timeline.tsx";
import { useAgentView, useCalendarLink, useDeviceRead, useDeviceWrites, useDraft, useHeld, useRouteOpen } from "./hooks.ts";
import { perform } from "../shell/services.ts";
import { calendarRows, coveredRange, listGroups, visibleDays } from "./layout.ts";
import { runtime } from "./runtime.ts";

const VIEWS: readonly { readonly view: CalendarView; readonly label: string }[] = [
  { view: "DayView", label: "Day" }, { view: "WeekView", label: "Week" }, { view: "MonthView", label: "Month" }, { view: "ScheduleView", label: "Schedule" },
];

const SCOPE: Readonly<Record<RecurrenceScope, "instance" | "this_and_following" | "series" | "event">> = {
  NoScope: "event", ThisOccurrence: "instance", ThisAndFollowing: "this_and_following", EntireSeries: "series",
};

const STATUS_WORDS: Readonly<Record<string, string>> = {
  Disconnected: "Not connected", Loading: "Loading", Ready: "", Partial: "Updating…", Unavailable: "Unavailable", Failed: "Couldn’t load",
};

function draftFields(text: string): DraftFieldsRecord | undefined {
  try {
    return JSON.parse(text) as DraftFieldsRecord;
  } catch {
    return undefined;
  }
}

/** The Calendar screen's props: the route it opened at and how to close it. */
export type CalendarScreenProps = ScreenProps;

/**
 * The Calendar app: day, week, month and schedule views of the agent's Calendar and the phone's calendars.
 * @model spec/calendar/presentation.md
 */
export function CalendarScreen({ route, onClose }: CalendarScreenProps) {
  useRouteOpen(route);
  const { state, can, send } = useMachine(runtime);
  const p = state ?? initial;
  const agent = useAgentView();
  const device = useDeviceRead();
  const held = useHeld();
  const draft = useDraft();
  const writes = useDeviceWrites();
  const link = useCalendarLink();
  const linkDo = (act: (service: CalendarLink.Shape) => Effect.Effect<void>) => void perform(CalendarLink.use(act));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ fields: DraftFieldsRecord; row: CalendarRow | undefined; owner: string } | undefined>(undefined);
  const [problem, setProblem] = useState("");
  const [origin, setOrigin] = useState<{ readonly rowId: string; readonly view: OriginView | undefined } | undefined>(undefined);
  const [formWas, setFormWas] = useState(p.form);
  if (formWas !== p.form) {
    setFormWas(p.form);
    if (p.form === "NoForm" && editing !== undefined) setEditing(undefined);
  }
  const zone = deviceZone();
  const now = Date.now();
  const heldTargets = new Set(held.held.map((entry) => entry.target));
  const agentHidden = p.owner !== "" && p.hiddenAgentOwners.includes(p.owner);
  const deviceShown = p.deviceVisible && p.deviceAccess;
  const heldHidden = (row: CalendarRow) => row.source === "agent" && agent.feed?.events.some((event) => `agent:${agentEventKey(event)}` === row.id && heldTargets.has(event.id)) === true;
  const rows = calendarRows(agent, device, zone, now, (row) =>
    heldHidden(row) || !rowShown(row.source === "agent", agentHidden, deviceShown));
  const open = rows.find((row) => row.id === p.openEvent);
  const openEvent = open?.source === "agent" ? agent.feed?.events.find((event) => `agent:${agentEventKey(event)}` === open.id) : undefined;
  const openCalendar = openEvent === undefined ? undefined : agent.calendars.find((calendar) => JSON.stringify([calendar.provider, calendar.side, calendar.grantId, calendar.connectorAccountId, calendar.calendarId]) === eventSourceKey(openEvent));
  const facts = eventFacts(openEvent, openCalendar);
  const shownOrigin = open !== undefined && origin?.rowId === open.id ? origin.view : undefined;
  const showRow = (row: CalendarRow) => void perform(openRow(row)).then((view) => setOrigin({ rowId: row.id, view }));
  const openLink = (url: string) => void perform(openEventLink(url)).then((how) => { if (how === "web") window.open(url, "_blank", "noopener,noreferrer"); });
  const go = (event: PresentationEvent, read = false) => {
    if (!can(event)) return;
    void send(event).then(() => (read ? perform(readCalendar(false, false)) : undefined));
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
  const handedOver = editing === undefined && p.form === "NewForm" && draft.alive && draft.origin !== "TypedHere" ? draftFields(draft.text) : undefined;
  const shown = editing ?? (handedOver === undefined ? undefined : { fields: handedOver, row: undefined, owner: agent.state.owner });
  const startEditor = (row: CalendarRow | undefined) => {
    setProblem("");
    void perform(Effect.gen(function* () {
      const creationId = newId().replace(/[^-a-zA-Z0-9_]/g, "");
      const opened = yield* openEditor(row);
      if (!opened) return;
      const retained = yield* CalendarDrafts.use((drafts) => drafts.retained(row?.id ?? ""));
      const fields = retained ?? (row === undefined ? yield* newFields(p.day, creationId) : rowFields(row, creationId));
      setEditing({ fields, row, owner: agent.state.owner });
    }));
  };
  return (
    <main className="flex h-full flex-col bg-background text-foreground">
      <header data-alpha-app-header="main" className="flex items-center gap-2 px-4 py-2">
        <Button variant="ghost" size="icon" aria-label="Close Calendar" onClick={onClose}><X /></Button>
        <Button variant="ghost" className="flex-1 justify-start font-display text-2xl" aria-label="Choose date" onClick={() => go({ type: "openDatePicker" })}>
          {formatLongDate(midnightAfter(now, zone, p.day), zone)}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Search events" onClick={() => go({ type: "openSearch" })}><Search /></Button>
        <Button variant="ghost" size="icon" aria-label="Calendars" disabled={!can({ type: "openSources" })} onClick={() => void perform(openSources())}><Layers /></Button>
        <Button variant="ghost" size="icon" aria-label="New event" disabled={!can({ type: "newForm" })} onClick={() => startEditor(undefined)}><Plus /></Button>
      </header>
      <Tabs value={p.view} onValueChange={(view) => go({ type: "chooseView", view: view as CalendarView }, true)} className="px-4">
        <TabsList>{VIEWS.map((choice) => <TabsTrigger key={choice.view} value={choice.view} disabled={!can({ type: "chooseView", view: choice.view }) && choice.view !== p.view}>{choice.label}</TabsTrigger>)}</TabsList>
      </Tabs>
      {(status !== "" || device.status === "limited" || device.status === "failed") && (
        <div role="status" className="flex items-center justify-between gap-2 px-4 py-1 text-sm text-muted-foreground">
          <span>{[status, device.status === "limited" ? "2,000 max" : device.status === "failed" ? "Couldn’t load device calendars" : ""].filter(Boolean).join(" · ")}</span>
          {action === "OfferSettings" && (
            <Button variant="outline" size="sm" aria-label="Open Calendar settings" onClick={() => linkDo((service) => service.connect())}><Settings aria-hidden />Settings</Button>
          )}
          {action === "OfferRetry" && (
            <Button variant="ghost" size="icon" aria-label="Retry calendar and reminders" onClick={() => void perform(readCalendar(true, false))}><RefreshCw /></Button>
          )}
        </div>
      )}
      {device.status === "connect" && (
        <Button variant="outline" className="mx-4" onClick={() => void perform(readCalendar(true, true))}>
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
          onOpen={showRow} />
      ) : (
        <Timeline rows={rows} days={days} day={p.day} zone={zone} now={now} emptyText={emptyText}
          onOpen={showRow} onPickDay={(day) => go({ type: "chooseDay", day }, true)} />
      )}
      <CalendarSources open={p.sourcesSheet} agentShown={!agentHidden} deviceShown={p.deviceVisible} agentAccess={p.agentAccess && p.owner !== ""} deviceAccess={p.deviceAccess}
        onAgent={(shown) => go(shown ? { type: "showAgent" } : { type: "hideAgent" })} onDevice={() => go({ type: "toggleDevice" })} onClose={() => void perform(closeSources())}
        {...(p.owner === "" ? {} : { google: { ...link, onLink: () => linkDo((service) => service.link()), onCancel: () => linkDo((service) => service.cancel()),
          onConnect: () => linkDo((service) => service.connect()), onDisconnect: () => linkDo((service) => service.disconnect()) } })} />
      <DatePicker open={p.datePicker} rows={rows} day={p.day} month={p.month} zone={zone} now={now}
        onMonth={(month) => go({ type: "chooseMonth", month }, true)} onPickDay={(day) => { go({ type: "chooseDay", day }, true); }} onClose={() => go({ type: "closeDatePicker" })} />
      {p.form === "NoForm" && (
        <EventDetail row={open} facts={facts} deleting={p.deleteSheet} held={open !== undefined && open.source === "device" && writes.held !== "" && open.id.startsWith(`device:${writes.held}:`)}
          canEdit={open !== undefined && can({ type: "editForm", editable: open.writable })} canDelete={open !== undefined && can({ type: "askDelete", editable: open.writable })}
          onEdit={() => startEditor(open)} onAskDelete={() => open && go({ type: "askDelete", editable: open.writable })}
          onDelete={(scope) => open && void perform(deleteRow(open, SCOPE[scope], facts.mode === "DeclineInvitation" ? "decline_invitation" : "organizer_cancel"))}
          onCloseDelete={() => go({ type: "closeDeleteSheet" })} onCheckAgain={() => void perform(readCalendar(true, false))}
          onOpenLink={openLink} onPlace={() => open && void perform(placeRow(open))}
          {...(shownOrigin === undefined ? {} : { origin: shownOrigin, onOpenOrigin: () => open && void perform(openRowOrigin(open)) })}
          onClose={() => void perform(closeRow())} />
      )}
      {p.form !== "NoForm" && shown !== undefined && (
        <EventEditor fields={shown.fields} draft={draft} recurring={shown.row?.recurring === true} repeats={shown.row?.source === "device"}
          calendars={shown.row === undefined ? [{ value: "local", label: "Agent Calendar" },
            ...device.calendars.filter((calendar) => calendar.writable).map((calendar) => ({ value: `native:${calendar.id}`, label: calendar.account === "" ? calendar.name : `${calendar.name} · ${calendar.account}` }))] : []}
          timingLocked={rowTimingLocked(shown.row)} deviceZone={zone}
          loading={agent.state.read.id !== 0} otherAccount={shown.owner !== agent.state.owner}
          eventChanged={shown.row !== undefined && rows.find((row) => row.id === shown.row?.id)?.revision !== shown.row.revision} problem={problem}
          onEdit={(fields) => void perform(CalendarDrafts.use((drafts) => drafts.edit(fields)))}
          onRestore={() => perform(CalendarDrafts.use((drafts) => drafts.restore()))}
          onReview={(kind) => void perform(CalendarDrafts.use((drafts) => drafts.openReview(kind)))}
          onAnswerReview={(confirmed) => void perform(CalendarDrafts.use((drafts) => drafts.answerReview(confirmed)))}
          onRetry={() => void perform(CalendarDrafts.use((drafts) => drafts.retry()))}
          onRecovery={(step) => void perform(CalendarDrafts.use((drafts) => step === "open" ? Effect.flatMap(drafts.openRecovery(), () => drafts.captureRecovery())
            : step === "request" ? drafts.requestReset() : step === "confirm" ? drafts.confirmReset() : drafts.closeRecovery()))}
          onSave={(fields) => void perform(saveEditor(fields, shown.row, rowTimingLocked(shown.row), timingChanged(shown.fields, fields))).then((text) => {
            setProblem(text);
            if (text !== "") return;
            setEditing(undefined);
            if (shown.row === undefined && fields.noteLink !== undefined) void perform(linkSavedNote(fields.creationId, fields.noteLink));
          })}
          onClose={() => { setEditing(undefined); void perform(closeEditor()); }} />
      )}
    </main>
  );
}
