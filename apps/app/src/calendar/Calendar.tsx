// spec/app/calendar/index.md, "Story: Move between days, weeks, months and my schedule"
import { Alert, Banner, Button, ConfirmDialog, EmptyState, Input, Label, ListGroup, ListRow, Sheet, SheetContent, Spinner, Switch, Textarea, Toast, ToastRegion } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { CalendarDays, ChevronLeft, ChevronRight, Layers, Plus, Search } from "lucide-react";
import { useState } from "react";
import { type Calendar as State, type Layout, type Row, dayEmptiness, hides, monthRows, replyWord, rowShown, statusAction } from "../../gen/app__calendar.ts";
import type { Machine } from "../../gen/app__calendar.effect.vibe";
import { useMachine } from "../../gen/app__calendar.react.ts";
import { answersOffered, cancellationMode, defaultStart, goingOffered, maybeOffered, ownAnswer, saveBlock } from "../../gen/app__calendar__editor.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { civilDay, dateOf, dayStart, daysOf, monthStart, shownDay, weekStart } from "./time.ts";

export interface CalendarProps {
  /** Provides the Calendar machine, `calendar` of calendar.vibe, and Alpha's time, at which `can` is asked. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Time, unknown>;
  /** Opens Settings, where Alpha's account is connected. */
  onSettings: () => void;
}

type Send = ReturnType<typeof useMachine>["send"];
type Can = ReturnType<typeof useMachine>["can"];

const layouts: readonly { layout: Layout; label: string }[] = [
  { layout: "DayView", label: "Day" },
  { layout: "WeekView", label: "Week" },
  { layout: "MonthView", label: "Month" },
  { layout: "ScheduleView", label: "Schedule" },
];

const words = {
  NoReplyWord: "", WordOrganizer: "Organizer", WordAwaiting: "Awaiting reply", WordGoing: "Going", WordMaybe: "Maybe",
  WordDeclined: "Declined", WordDelegated: "Delegated", WordInvited: "Invited",
} as const;

const outcomes: Partial<Record<State["outcome"], string>> = {
  WriteBusy: "Calendar is busy. Try again in a moment",
  WriteNotAdmitted: "This event can't be changed here",
  WriteOwnerChanged: "Your account changed. Nothing was saved",
  WriteTransport: "Couldn't reach your agent. Nothing was saved",
  WriteForeign: "Your agent answered for another account",
  WriteRefused: "Your agent refused this change",
  WriteUnknown: "Alpha can't tell whether this change was made",
  WriteQueued: "Waiting for your approval",
  SentUnverified: "Sent, but Calendar couldn't read it back",
  Deleted: "Event deleted",
  DeletedByReceipt: "Event deleted",
  NotDeleted: "The event was not deleted",
};

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const monthName = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function when(row: Row): string {
  if (row.allDay) return "All day";
  return `${time.format(row.begin)} – ${time.format(row.end)}`;
}

/** The rows the screen shows: of each source it does not hide, less every deletion held, waiting or sent. */
function visible(state: State): Row[] {
  const hidden = state.hidden.includes(state.owner);
  const doomed = [...(state.held.undo.holding === "Held" ? [state.held.doomed] : []), ...state.outbox, ...state.hiding];
  const agentRows = state.agent.owner === state.owner ? state.agent.rows : [];
  return [...state.phone.rows, ...agentRows]
    .filter((row) => rowShown(row.source === "AgentSource", hidden, state.phoneVisible))
    .filter((row) => !doomed.some((d) => hides(row.source === "AgentSource", row.id === d.target, row.series !== "" && row.series === d.series, row.begin >= d.begin, d.scope)))
    .sort((a, b) => a.begin - b.begin);
}

function on(rows: Row[], civil: number): Row[] {
  return rows.filter((row) => {
    const { first, last } = daysOf(row);
    return first <= civil && civil <= last;
  });
}

interface Shown {
  state: State;
  rows: Row[];
  can: Can;
  send: Send;
}

function RowList({ rows, state, can, send, day }: Shown & { day: number }) {
  return (
    <ListGroup>
      {rows.map((row) => {
        const show = { type: "showEvent", target: row.id, source: row.source, day } as const;
        return (
          <ListRow
            key={`${row.source}:${row.id}`}
            aria-label={row.title === "" ? "(No title)" : row.title}
            title={row.title === "" ? "(No title)" : row.title}
            detail={row.place === "" ? when(row) : `${when(row)} · ${row.place}`}
            disabled={!can(show)}
            onClick={() => void send(show)}
          />
        );
      })}
      {rows.length === 0 && <Empty state={state} />}
    </ListGroup>
  );
}

// spec/app/calendar/index.md, "A day is free only when the read covering it was complete"
function Empty({ state }: { state: State }) {
  const agentRead = state.agent.status === "Ready" || state.agent.status === "Partial" || state.agent.status === "Unavailable";
  const complete = state.agent.status === "Ready" || state.agent.status === "NotConnected";
  const emptiness = dayEmptiness(complete, state.phone.truncated || state.agent.status === "Partial", agentRead || state.phone.read.status === "Loaded");
  const said = { DayFree: "Free", DayIncomplete: "Some events may be missing", DayUnread: "Reading your calendar" } as const;
  return <p className="px-4 py-3 text-sm text-muted-foreground">{said[emptiness]}</p>;
}

function DayList(shown: Shown) {
  const civil = shownDay(shown.state.today, "DayView", shown.state.day, 0);
  return <RowList {...shown} rows={on(shown.rows, civil)} day={shown.state.day} />;
}

function WeekList(shown: Shown) {
  const start = weekStart(shown.state.today + shown.state.day);
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 7 }, (_, at) => start + at).map((civil) => (
        <section key={civil} aria-label={longDate.format(dateOf(civil))} className="flex flex-col gap-1">
          <h3 className="px-4 text-sm font-semibold">{longDate.format(dateOf(civil))}</h3>
          <RowList {...shown} rows={on(shown.rows, civil)} day={civil - shown.state.today} />
        </section>
      ))}
    </div>
  );
}

function ScheduleList(shown: Shown) {
  const days = [...new Set(shown.rows.flatMap((row) => {
    const { first, last } = daysOf(row);
    return Array.from({ length: last - first + 1 }, (_, at) => first + at);
  }))].filter((civil) => civil >= shown.state.today).sort((a, b) => a - b);
  if (days.length === 0) return <Empty state={shown.state} />;
  return (
    <div className="flex flex-col gap-4">
      {days.map((civil) => (
        <section key={civil} aria-label={longDate.format(dateOf(civil))} className="flex flex-col gap-1">
          <h3 className="px-4 text-sm font-semibold">{longDate.format(dateOf(civil))}</h3>
          <RowList {...shown} rows={on(shown.rows, civil)} day={civil - shown.state.today} />
        </section>
      ))}
    </div>
  );
}

// spec/app/calendar/index.md, "The month grid has five weeks unless the month and its leading days need six"
function MonthGrid({ state, rows, can, send, first }: Shown & { first: number }) {
  const lead = first - weekStart(first);
  const days = monthStart(first, 1) - first;
  const cells = monthRows(days, lead);
  const shown = state.today + state.day;
  return (
    <div role="grid" aria-label={monthName.format(dateOf(first))} className="grid grid-cols-7 gap-1 px-2">
      {Array.from({ length: 7 }, (_, at) => <span key={at} className="text-center text-xs text-muted-foreground">{weekday.format(dateOf(weekStart(first) + at))}</span>)}
      {Array.from({ length: cells }, (_, at) => weekStart(first) + at).map((civil) => {
        const choose = { type: "chooseDay", day: civil - state.today } as const;
        const count = on(rows, civil).length;
        const label = `${longDate.format(dateOf(civil))}${count > 0 ? `, ${count} events` : ""}`;
        return (
          <Button
            key={civil}
            variant={civil === shown ? "secondary" : "ghost"}
            size="sm"
            aria-label={label}
            aria-current={civil === state.today ? "date" : undefined}
            disabled={!can(choose)}
            className={civil < first || civil >= first + days ? "text-muted-foreground" : ""}
            onClick={() => void send(choose)}
          >
            {dateOf(civil).getDate()}
            {count > 0 && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
          </Button>
        );
      })}
    </div>
  );
}

function Searching(shown: Shown) {
  const [query, setQuery] = useState("");
  const wanted = query.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");
  const found = wanted.length === 0 ? [] : shown.rows.filter((row) => {
    const text = `${row.title} ${row.place} ${row.notes}`.toLocaleLowerCase();
    return wanted.every((word) => text.includes(word));
  });
  return (
    <div className="flex flex-col gap-3">
      <Input aria-label="Search events" placeholder="Search events" value={query} onChange={(event) => setQuery(event.target.value)} />
      {wanted.length > 0 && <RowList {...shown} rows={found} day={shown.state.day} />}
    </div>
  );
}

// spec/app/calendar/index.md, "The people list says Organizer or Alpha's word for each reply, never the provider's value"
function EventSheet({ state, row, can, send }: Omit<Shown, "rows"> & { row: Row | undefined }) {
  const mode = row === undefined ? "NoCancellation" : cancellationMode(row.organizer, row.invited, false, row.source === "AgentSource" && row.organizer);
  const editable = row !== undefined && row.source === "AgentSource" && row.writable && row.version !== "";
  const answer = row === undefined ? "NotInvited" : ownAnswer(row.invited, row.answer);
  const offered = row !== undefined && answersOffered(mode, answer, editable, false, row.recurring);
  const replies = [
    ...(goingOffered(answer, offered) ? [{ reply: "accepted", label: "Going" }] : []),
    ...(maybeOffered(answer, offered) ? [{ reply: "tentative", label: "Maybe" }] : []),
  ];
  const edit = { type: "editForm", editable } as const;
  const remove = { type: "askDelete", editable: editable && mode !== "NoCancellation" } as const;
  return (
    <Sheet open={state.opened.id !== "" && state.form === "NoForm"} onOpenChange={(open) => { if (!open && can({ type: "closeEvent" })) void send({ type: "closeEvent" }); }}>
      <SheetContent
        title={row === undefined ? "Event" : row.title === "" ? "(No title)" : row.title}
        description={row === undefined ? "This event is no longer in your calendar" : `${longDate.format(row.begin)} · ${when(row)}`}
        actions={(
          <>
            {can(edit) && <Button variant="outline" onClick={() => void send(edit)}>Edit</Button>}
            {can(remove) && <Button variant="destructive" onClick={() => void send(remove)}>{mode === "DeclineInvitation" ? "Decline" : "Delete"}</Button>}
          </>
        )}
      >
        {row !== undefined && (
          <div className="flex flex-col gap-3">
            {row.place !== "" && <p>{row.place}</p>}
            {row.notes !== "" && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.notes}</p>}
            {row.people.length > 0 && (
              <ListGroup heading="People" surface="plain">
                {row.people.map((person, at) => (
                  // eslint-disable-next-line @eslint-react/no-array-index-key -- People have no key of their own and never move.
                  <ListRow key={at} title={person.name} trailing={words[replyWord(person.organizer, person.reply)]} />
                ))}
              </ListGroup>
            )}
            {replies.length > 0 && (
              <div className="flex gap-2">
                {replies.map(({ reply, label }) => {
                  const say = { type: "answerInvite", reply, admitted: true } as const;
                  return can(say) && <Button key={reply} variant="outline" onClick={() => void send(say)}>{label}</Button>;
                })}
              </div>
            )}
            {row.link !== "" && <a className="text-sm text-primary underline" href={row.link} target="_blank" rel="noreferrer">Open in Google Calendar</a>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

const hhmm = (ms: number) => {
  const at = new Date(ms);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
};
const ymd = (ms: number) => {
  const at = new Date(ms);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
};
const at = (date: string, clock: string) => new Date(`${date}T${clock}`).getTime();

// spec/app/calendar/index.md, "Saving the agent's event writes it once: a new event is created, an open one changed at the version shown"; spec/app/calendar/editor.md, "Save is off while loading, while saving, for another account, for an event that changed, and without a title, in that order"
function EventForm({ state, row, can, send }: Omit<Shown, "rows"> & { row: Row | undefined }) {
  const start = defaultStart(state.formDay, new Date(state.readAt).getHours());
  const begin = row && state.form === "EditForm" ? row.begin : dayStart(state.today + start.offset) + start.hour * 3_600_000;
  const [title, setTitle] = useState(state.form === "EditForm" ? row?.title ?? "" : "");
  const [place, setPlace] = useState(state.form === "EditForm" ? row?.place ?? "" : "");
  const [notes, setNotes] = useState(state.form === "EditForm" ? row?.notes ?? "" : "");
  const [date, setDate] = useState(ymd(begin));
  const [from, setFrom] = useState(hhmm(begin));
  const [to, setTo] = useState(hhmm(row && state.form === "EditForm" ? row.end : begin + 3_600_000));
  const [allDay, setAllDay] = useState(state.form === "EditForm" ? row?.allDay ?? false : false);
  const first = allDay ? at(date, "00:00") : at(date, from);
  const last = allDay ? dayStart(civilDay(first) + 1) : at(date, to);
  const valid = Number.isFinite(first) && Number.isFinite(last) && last > first;
  const save = {
    type: "save", edits: JSON.stringify({ title: title.trim(), place, notes, begin: first, end: last, allDay }),
    valid, admitted: state.form === "NewForm" || (row !== undefined && row.source === "AgentSource" && row.writable), day: civilDay(first) - state.today,
  } as const;
  const changed = state.form === "EditForm" && row !== undefined && row.version !== state.opened.version;
  const block = saveBlock(state.agent.read.status === "Loading", state.saving, false, changed, title.trim() === "");
  const why = { SaveAllowed: "", WaitLoading: "Reading your calendar", WaitSaving: "Saving", OtherAccount: "Another account is signed in", CheckEvent: "This event changed. Check it again", AddTitle: "Add a title" } as const;
  return (
    <Sheet open={state.form !== "NoForm"} onOpenChange={(open) => { if (!open && can({ type: "closeForm" })) void send({ type: "closeForm" }); }}>
      <SheetContent
        title={state.form === "NewForm" ? "New event" : "Edit event"}
        actions={(
          <>
            <Button variant="outline" disabled={!can({ type: "closeForm" })} onClick={() => void send({ type: "closeForm" })}>Cancel</Button>
            <Button disabled={block !== "SaveAllowed" || !can(save)} onClick={() => void send(save)}>{state.saving ? "Saving" : "Save"}</Button>
          </>
        )}
      >
        <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <Input aria-label="Title" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input aria-label="Place" placeholder="Place" value={place} onChange={(event) => setPlace(event.target.value)} />
          <Input aria-label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Label>
            <Switch checked={allDay} onCheckedChange={setAllDay} aria-label="All day" />
            All day
          </Label>
          {!allDay && (
            <div className="flex gap-2">
              <Input aria-label="Starts" type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
              <Input aria-label="Ends" type="time" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          )}
          <Textarea aria-label="Notes" placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          {block !== "SaveAllowed" && block !== "WaitSaving" && <p className="text-sm text-muted-foreground">{why[block]}</p>}
          {!valid && <p className="text-sm text-destructive">The event must end after it starts</p>}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Picker({ state, can, send }: Omit<Shown, "rows">) {
  const first = monthStart(state.today + state.day, state.month);
  return (
    <Sheet open={state.picker} onOpenChange={(open) => { if (!open && can({ type: "closePicker" })) void send({ type: "closePicker" }); }}>
      <SheetContent title="Choose date">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => void send({ type: "chooseMonth", month: state.month - 1 })}><ChevronLeft /></Button>
          <span className="font-semibold">{monthName.format(dateOf(first))}</span>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => void send({ type: "chooseMonth", month: state.month + 1 })}><ChevronRight /></Button>
        </div>
        <MonthGrid state={state} rows={[]} can={can} send={send} first={first} />
      </SheetContent>
    </Sheet>
  );
}

// spec/app/calendar/index.md, "Hiding the agent's calendar is a preference of that account; hiding the phone's calendars is the phone's"
function Sources({ state, can, send }: Omit<Shown, "rows">) {
  const agentShown = !state.hidden.includes(state.owner);
  return (
    <Sheet open={state.sources} onOpenChange={(open) => { if (!open && can({ type: "closeSources" })) void send({ type: "closeSources" }); }}>
      <SheetContent title="Calendars">
        <ListGroup surface="plain">
          <ListRow
            title="Your agent's calendar"
            trailing={<Switch aria-label="Your agent's calendar" checked={agentShown} disabled={!can({ type: agentShown ? "hideAgent" : "showAgent" })} onCheckedChange={() => void send({ type: agentShown ? "hideAgent" : "showAgent" })} />}
          />
          <ListRow
            title="Phone calendars"
            trailing={<Switch aria-label="Phone calendars" checked={state.phoneVisible} onCheckedChange={() => void send({ type: "togglePhone" })} />}
          />
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Calendar: the day, week, month or schedule of both sources, the open event, its form, the Calendars sheet and the
 * date picker, each control offered exactly when the rules take its event.
 * @model spec/app/calendar/index.md
 */
export function Calendar({ runtime, onSettings }: CalendarProps) {
  const { state, cause, can, send } = useTimed(runtime, useMachine);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Calendar</Alert>;
  if (!state) return null;
  const rows = visible(state);
  const shown = { state, rows, can, send };
  const opened = (state.opened.source === "PhoneSource" ? state.phone.rows : state.agent.rows).find((row) => row.id === state.opened.id);
  const action = statusAction(state.usable && state.owner !== "", state.agent.status === "Unreadable");
  const civil = shownDay(state.today, state.layout, state.day, state.month);
  const title = state.layout === "MonthView" ? monthName.format(dateOf(civil)) : longDate.format(dateOf(civil));
  const undo = { type: "undoDelete", now: untimed } as const;
  const said = state.outcome === "Saved" ? "" : outcomes[state.outcome] ?? "";
  return (
    <section aria-label="Calendar" className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-1">
        <Button variant="ghost" className="mr-auto" aria-label="Choose date" disabled={!can({ type: "openPicker" })} onClick={() => void send({ type: "openPicker" })}>
          <CalendarDays />
          {title}
        </Button>
        {can({ type: "openSearch" }) && <Button variant="ghost" size="icon" aria-label="Search" onClick={() => void send({ type: "openSearch" })}><Search /></Button>}
        {can({ type: "openSources" }) && <Button variant="ghost" size="icon" aria-label="Calendars" onClick={() => void send({ type: "openSources" })}><Layers /></Button>}
        {can({ type: "newForm" }) && <Button size="icon" aria-label="New event" onClick={() => void send({ type: "newForm" })}><Plus /></Button>}
      </div>
      <nav aria-label="Views" className="flex gap-1">
        {layouts.map(({ layout, label }) => (
          <Button
            key={layout}
            size="sm"
            variant={state.layout === layout ? "secondary" : "ghost"}
            aria-pressed={state.layout === layout}
            disabled={state.layout !== layout && !can({ type: "chooseLayout", layout })}
            onClick={() => { if (state.layout !== layout) void send({ type: "chooseLayout", layout }); }}
          >
            {label}
          </Button>
        ))}
      </nav>
      {action === "OfferSettings" && <Banner action={<Button size="sm" variant="outline" onClick={onSettings}>Settings</Button>}>Your agent's calendar is not connected</Banner>}
      {action === "OfferRetry" && (
        <Banner variant="warn" action={can({ type: "refresh", now: untimed }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh", now: untimed })}>Try again</Button>}>
          {state.agent.error === "AccessRefused" ? "Your agent refused to share its calendar" : "Calendar couldn't read your agent's calendar"}
        </Banner>
      )}
      {can({ type: "askAccess" }) && <Banner action={<Button size="sm" onClick={() => void send({ type: "askAccess" })}>Allow</Button>}>Show your phone's calendars here</Banner>}
      {state.agent.status === "Fetching" && <Spinner label="Reading your calendar" />}
      {state.searching
        ? <Searching {...shown} />
        : state.layout === "DayView" ? <DayList {...shown} />
        : state.layout === "WeekView" ? <WeekList {...shown} />
        : state.layout === "MonthView" ? <MonthGrid {...shown} first={monthStart(state.today + state.day, state.month)} />
        : <ScheduleList {...shown} />}
      {state.searching && can({ type: "closeSearch" }) && <Button variant="outline" onClick={() => void send({ type: "closeSearch" })}>Done</Button>}
      {rows.length === 0 && state.layout === "MonthView" && !state.searching && <EmptyState title="Nothing this month" />}
      <EventSheet state={state} row={opened} can={can} send={send} />
      {state.form !== "NoForm" && <EventForm key={`${state.form}:${state.opened.id}`} state={state} row={opened} can={can} send={send} />}
      <ConfirmDialog
        open={state.sheet.showing}
        title={opened?.invited ? "Decline this invitation?" : "Delete this event?"}
        confirmLabel={opened?.invited ? "Decline" : "Delete"}
        destructive
        onCancel={() => void send({ type: "keepEvent" })}
        onConfirm={() => {
          const confirm = { type: "confirmDelete", decline: opened?.invited ?? false, scope: "HideEvent", series: opened?.series ?? "", begin: opened?.begin ?? 0, now: untimed } as const;
          if (can(confirm)) void send(confirm);
        }}
      />
      <Picker state={state} can={can} send={send} />
      <Sources state={state} can={can} send={send} />
      <ToastRegion>
        {can(undo) && <Toast key={state.held.undo.until} onUndo={() => void send(undo)}>{state.held.doomed.decline ? "Invitation declined" : "Event deleted"}</Toast>}
        {!can(undo) && said !== "" && <Toast>{said}</Toast>}
      </ToastRegion>
    </section>
  );
}
