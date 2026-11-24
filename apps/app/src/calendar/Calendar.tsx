// spec/app/calendar/index.md, "Story: See my days"; spec/app/calendar/index.md, "Story: Move through the days"; spec/app/calendar/index.md, "Story: Look at an event"; spec/app/calendar/index.md, "Story: Search my events and choose which calendars I see"; spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/agent.md, "Story: Approve what the agent changes"; spec/app/calendar/deletions.md, "Story: Undo a deletion before it is sent"
import {
  AppHeader, Banner, Button, Card, CardFooter, CardTitle, Dialog, DialogContent, DialogTitle, EmptyState, Input, Label,
  ListGroup, ListRow, SearchField, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Spinner, Switch, Textarea,
} from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { CalendarDays, Eye, Layers, Plus, Search } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import * as View from "../../gen/app__calendar.ts";
import { useMachine as useView } from "../../gen/app__calendar.react.ts";
import type * as Changes from "../../gen/app__calendar__agent.ts";
import { useMachine as useChanges } from "../../gen/app__calendar__agent.react.ts";
import * as Editor from "../../gen/app__calendar__editor.ts";
import type * as Link from "../../gen/app__calendar__link.ts";
import { useMachine as useLink } from "../../gen/app__calendar__link.react.ts";
import { setUp } from "./link.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { useMachine as useEditor } from "../../gen/app__calendar__editor.react.ts";
import { useMachine as useHeld } from "../../gen/app__calendar__deletions.react.ts";
import type { Event as DeletionEvent } from "../../gen/app__calendar__deletions.ts";
import { type ReplyWord, firstColumnDay, replyWord, rowShown, statusAction } from "../../gen/app__calendar__presentation.ts";
import { type SaveBlock, goingOffered, maybeOffered, saveBlock } from "../../gen/app__calendar__writing.ts";
import type { Calendared } from "./calendar.vibe";
import { type Fields, kept, typed } from "./editor.vibe";
import { type Row, onDay, shown } from "./shown.ts";
import { allows } from "../../gen/kit__permission.ts";
import { civilDay, dateOf, dayStart, monthStart, weekStart } from "./time.ts";

export interface CalendarProps {
  /** Provides Calendar's machines, `calendared` of calendar.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Calendared, unknown>;
}

const hour = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const monthName = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

const layouts: ReadonlyArray<{ layout: View.Layout; label: string }> = [
  { layout: "Agenda", label: "Agenda" },
  { layout: "Timeline", label: "Day" },
  { layout: "Columns", label: "Several days" },
];

const changes: Readonly<Record<Changes.Change, string>> = { Create: "Create an event", Update: "Change an event", Delete: "Delete an event", Respond: "Answer an invitation" };
const replies: Readonly<Record<Changes.Reply, string>> = { NoReply: "", Going: "Going", Maybe: "Maybe", NotGoing: "Not going" };
const results: Partial<Record<Changes.Result, string>> = {
  Done: "Done, and seen in your calendar.",
  NotFound: "Sent, but Calendar could not find the change.",
  Refused: "Google refused the change. Nothing changed.",
  InDoubt: "Alpha can't tell whether this change was made. It won't be sent again.",
};

const words: Readonly<Record<ReplyWord, string>> = {
  NoReplyWord: "", WordOrganizer: "Organizer", WordAwaiting: "Hasn't answered", WordGoing: "Going", WordMaybe: "Maybe",
  WordDeclined: "Not going", WordDelegated: "Delegated", WordInvited: "Invited",
};

const repeats: ReadonlyArray<{ repeat: NonNullable<Fields["repeat"]>; label: string }> = [
  { repeat: "NoRepeat", label: "Never" }, { repeat: "Daily", label: "Every day" }, { repeat: "Weekly", label: "Every week" },
  { repeat: "Monthly", label: "Every month" }, { repeat: "Yearly", label: "Every year" },
];

const saveOff: Readonly<Record<SaveBlock, string>> = {
  SaveAllowed: "", WaitLoading: "Loading…", WaitSaving: "Saving…", OtherAccount: "This draft belongs to another account.",
  CheckEvent: "This event changed. Check it before saving.", AddTitle: "Add a title.",
};

function when(row: Row): string {
  return row.allDay ? "All day" : `${hour.format(row.begin)} – ${hour.format(row.end)}`;
}

/** A local `datetime-local` value of `ms`. */
function local(ms: number): string {
  const at = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return at.toISOString().slice(0, 16);
}

/** Calendar: the anchored day from the phone's calendar and the agent's, an event, its form, and the agent's card. */
export function Calendar({ runtime }: CalendarProps) {
  const view = useView(runtime);
  const editor = useEditor(runtime);
  const agent = useChanges(runtime);
  useSyncExternalStore(shown.subscribe, shown.snapshot, shown.snapshot);
  const s = view.state;
  if (!s) return <Spinner />;
  const send = (event: View.Event) => () => void view.send(event);
  const visible = shown.visible(s.hidden, allows(s.access), s.connected);
  const dayRows = (day: number) => visible.filter((row) => onDay(row, day));
  const rows = s.layout === "Agenda" ? visible.filter((row) => row.end > dayStart(s.today)) : dayRows(s.anchor);
  const columns = s.layout === "Columns" ? Array.from({ length: 3 }, (_, at) => firstColumnDay(s.anchor, 3) + at) : [];
  const opening = (row: Row): View.Event => ({ type: "openEvent", id: row.id, place: row.place !== "", video: row.video !== "", local: row.source === "Phone", web: row.link !== "" });
  const listed = (row: Row) => (
    <ListRow key={row.id} title={row.title || "Untitled event"} detail={`${s.layout === "Agenda" ? `${longDate.format(row.begin)} · ` : ""}${when(row)}${row.place ? ` · ${row.place}` : ""}`}
      disabled={!view.can(opening(row))} onClick={send(opening(row))}
      trailing={<span className="text-xs text-muted-foreground">{row.source === "Phone" ? "Phone" : "Google"}</span>} />
  );
  const week = Array.from({ length: 7 }, (_, at) => weekStart(s.anchor) + at);
  const offer = (event: View.Event, label: string, variant: "primary" | "outline" | "ghost" = "outline") =>
    view.can(event) ? <Button variant={variant} onClick={send(event)}>{label}</Button> : null;
  const newEvent: Editor.Event = { type: "newEvent", day: s.anchor };
  const open = s.open === 0 ? undefined : shown.find(s.open);
  return (
    <div className="flex h-full flex-col">
      <AppHeader title={longDate.format(dateOf(s.anchor))}>
        {offer({ type: "goToday" }, "Today", "ghost")}
        {view.can({ type: "openMonth" }) ? <Button variant="ghost" size="icon" aria-label="Choose a day" onClick={send({ type: "openMonth" })}><CalendarDays /></Button> : null}
        {view.can({ type: "openLayoutMenu" }) ? <Button variant="ghost" size="icon" aria-label="Layout" onClick={send({ type: "openLayoutMenu" })}><Layers /></Button> : null}
        {view.can({ type: "openSearch" }) ? <Button variant="ghost" size="icon" aria-label="Search" onClick={send({ type: "openSearch" })}><Search /></Button> : null}
        {view.can({ type: "openCalendars" }) ? <Button variant="ghost" size="icon" aria-label="Calendars" onClick={send({ type: "openCalendars" })}><Eye /></Button> : null}
        {editor.can(newEvent) ? <Button variant="ghost" size="icon" aria-label="New event" onClick={() => void editor.send(newEvent)}><Plus /></Button> : null}
      </AppHeader>
      <nav aria-label="Week" className="flex justify-between gap-1 px-4 py-2">
        {week.map((day) => (
          <Button key={day} variant={day === s.anchor ? "primary" : "ghost"} disabled={!view.can({ type: "pickDay", day }) && day !== s.anchor} onClick={send({ type: "pickDay", day })}>
            {`${weekday.format(dateOf(day))} ${dateOf(day).getDate()}`}
          </Button>
        ))}
      </nav>
      <Access runtime={runtime} />
      {s.phoneLimited ? <Banner variant="warn">Android gave only part of this day. Some events may be missing.</Banner> : null}
      {s.phone.status === "Failed" || s.google.status === "Failed" ? <Banner variant="warn" action={offer({ type: "refresh" }, "Retry")}>Calendar couldn't read this day.</Banner> : null}
      {statusAction(s.connected, false) === "OfferSettings" ? <Banner action={offer({ type: "openAccountSettings" }, "Settings")}>Not connected: your agent has no Google Calendar.</Banner> : null}
      <Undo runtime={runtime} />
      <Drafts runtime={runtime} day={s.anchor} />
      <GoogleRow runtime={runtime} />
      <Proposal runtime={runtime} />
      <main className="flex-1 overflow-y-auto px-4 py-2">
        {s.layout === "Columns" ? (
          <div className="grid grid-cols-3 gap-2">
            {columns.map((day) => (
              <ListGroup key={day} heading={longDate.format(dateOf(day))}>{dayRows(day).map(listed)}</ListGroup>
            ))}
          </div>
        ) : View.empty(s) ? <EmptyState title="Nothing on this day" icon={<CalendarDays />} /> : (
          <ListGroup heading={s.layout === "Agenda" ? "From today" : longDate.format(dateOf(s.anchor))}>
            {rows.map(listed)}
            {s.reminders > 0 ? <ListRow title={s.reminders === 1 ? "1 reminder" : `${s.reminders} reminders`} detail={longDate.format(dateOf(s.remindersDay))} /> : null}
          </ListGroup>
        )}
      </main>
      <Sheet open={s.overlay === "LayoutMenu"} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
        <SheetContent title="Layout">
          {layouts.map(({ layout, label }) => (
            <ListRow key={layout} title={label} selected={s.layout === layout} disabled={!view.can({ type: "chooseLayout", layout })} onClick={send({ type: "chooseLayout", layout })} />
          ))}
        </SheetContent>
      </Sheet>
      <Searching runtime={runtime} />
      <Sheet open={s.overlay === "CalendarsSheet"} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
        <SheetContent title="Calendars">
          {[...new Map([...shown.all("Google"), ...shown.all("Phone")].map((row) => [row.calendar, row])).values()].map((row) => (
            <Label key={row.calendar} className="flex items-center justify-between">
              {row.source === "Google" ? "Your agent's calendar" : `Phone calendar ${row.calendarId}`}
              <Switch checked={rowShown(row.calendar, [...s.hidden])} disabled={!view.can({ type: "toggleCalendar", calendar: row.calendar })}
                onCheckedChange={() => void view.send({ type: "toggleCalendar", calendar: row.calendar })} />
            </Label>
          ))}
        </SheetContent>
      </Sheet>
      <Dialog open={s.overlay === "MonthDialog"} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
        <DialogContent closeLabel="Close">
          <DialogTitle>{monthName.format(dateOf(s.anchor))}</DialogTitle>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart(s.anchor, 1) - monthStart(s.anchor, 0) }, (_, at) => monthStart(s.anchor, 0) + at).map((day) => (
              <Button key={day} variant={day === s.today ? "primary" : "ghost"} disabled={!view.can({ type: "pickDay", day })} onClick={send({ type: "pickDay", day })}>
                {dateOf(day).getDate()}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Sheet open={open !== undefined} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeEvent" }))}>
        {open === undefined ? null : (
          <SheetContent title={open.title || "Untitled event"} description={`${longDate.format(open.begin)} · ${when(open)}`}
            actions={<>
              {offer({ type: "joinVideo" }, "Join video call", "primary")}
              {offer({ type: "openPlace" }, "Open in Maps")}
              {offer({ type: "openInAndroidCalendar" }, "Open in Android Calendar")}
              {offer({ type: "openInGoogle" }, "Open in Google Calendar")}
            </>}>
            {s.detail === "Rereading" ? <Spinner /> : null}
            {open.place ? <p>{open.place}</p> : null}
            {open.notes ? <p className="whitespace-pre-wrap text-sm">{open.notes}</p> : null}
            {open.people.length > 0 ? (
              <ListGroup heading="People">
                {open.people.map((person, at) => <ListRow key={at} title={person.name} detail={words[replyWord(person.organizer, person.status)]} />)}
              </ListGroup>
            ) : null}
            <EventWrites runtime={runtime} row={open} />
          </SheetContent>
        )}
      </Sheet>
      {editor.state?.shown ? <Form runtime={runtime} day={s.anchor} /> : null}
    </div>
  );
}

// spec/app/calendar/index.md, "Story: Let Calendar read my phone's calendar"
function Access({ runtime }: CalendarProps) {
  const view = useView(runtime);
  useSyncExternalStore(shown.subscribe, shown.snapshot, shown.snapshot);
  if (!view.state || !shown.present()) return null;
  if (view.can({ type: "askAccess" })) return <Banner action={<Button onClick={() => void view.send({ type: "askAccess" })}>Allow</Button>}>Calendar needs access to your phone's calendar.</Banner>;
  if (view.can({ type: "openSettings" })) return <Banner variant="warn" action={<Button onClick={() => void view.send({ type: "openSettings" })}>Open Calendar settings</Button>}>Calendar can't read your phone's calendar.</Banner>;
  return null;
}

// spec/app/calendar/editor.md, "Story: Delete an event, or answer an invitation"; spec/app/calendar/deletions.md, "Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest"
function EventWrites({ runtime, row }: CalendarProps & { row: Row }) {
  const editor = useEditor(runtime);
  const held = useHeld(runtime);
  if (!editor.state || !held.state) return null;
  const edit: Editor.Event = { type: "editEvent", id: row.id, revision: row.revision, day: civilDay(row.begin), repeats: row.recurring };
  const remove = (series: boolean) => {
    const confirmed = { type: "confirm", id: row.id, series, now: untimed } as const;
    return held.can(confirmed) && editor.can({ type: "deleteEvent", id: row.id, revision: row.revision, scope: series ? "WholeSeries" : "ThisOne", repeating: row.recurring })
      ? () => void held.send(confirmed) : undefined;
  };
  const respond = (going: boolean, offered: boolean): Editor.Event => ({ type: "respond", id: row.id, revision: row.revision, going, offered });
  const going = respond(true, goingOffered(row.answer, row.answerable));
  const maybe = respond(false, maybeOffered(row.answer, row.answerable));
  const uncertain = editor.state.latched === row.id;
  const one = remove(false);
  const series = row.recurring ? remove(true) : undefined;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {uncertain ? <Banner variant="warn">Alpha can't tell whether the last change to this event was made.</Banner> : null}
      {row.answer === "AnsweredGoing" ? <p className="text-sm">You're going.</p> : row.answer === "AnsweredMaybe" ? <p className="text-sm">You might go.</p> : null}
      {editor.can(going) ? <Button onClick={() => void editor.send(going)}>Going</Button> : null}
      {editor.can(maybe) ? <Button variant="outline" onClick={() => void editor.send(maybe)}>Maybe</Button> : null}
      {editor.can(edit) ? <Button variant="outline" onClick={() => void editor.send(edit)}>Edit</Button> : null}
      {one ? <Button variant="destructive" onClick={one}>{row.answer !== "NotInvited" ? "Decline" : row.recurring ? "Delete this one" : "Delete"}</Button> : null}
      {series ? <Button variant="destructive" onClick={series}>Delete the series</Button> : null}
    </div>
  );
}

// spec/app/calendar/deletions.md, "Undo inside the window sends nothing, and shows the event again"; spec/app/calendar/deletions.md, "The window ends only once its Undo notice is no longer shown"
function Undo({ runtime }: CalendarProps) {
  const held = useTimed(runtime, useHeld);
  const d = held.state;
  if (!d || d.waiting === 0 || !d.notice) return null;
  const row = shown.find(d.waiting);
  const undo: DeletionEvent | undefined = held.can({ type: "undo", now: untimed }) ? { type: "undo", now: untimed } : held.can({ type: "undoShown" }) ? { type: "undoShown" } : undefined;
  return (
    <Banner action={undo ? <Button onClick={() => void held.send(undo)}>Undo</Button> : null}>
      {`Deleted ${row?.title || "the event"}.`}
    </Banner>
  );
}

// spec/app/calendar/index.md, "Search and the Calendars sheet open over the days, never over an open event"
function Searching({ runtime }: CalendarProps) {
  const view = useView(runtime);
  const [query, setQuery] = useState("");
  const s = view.state;
  if (!s || s.overlay !== "Search") return null;
  const words = query.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");
  const found = shown.visible(s.hidden, allows(s.access), s.connected)
    .filter((row) => words.length > 0 && words.every((word) => `${row.title} ${row.place} ${row.notes}`.toLocaleLowerCase().includes(word)));
  const all = [...shown.all("Phone"), ...shown.all("Google")];
  const covers = all.length === 0 ? "" : `${longDate.format(Math.min(...all.map((row) => row.begin)))} to ${longDate.format(Math.max(...all.map((row) => row.end)))}`;
  return (
    <Sheet open onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
      <SheetContent title="Search" description={covers === "" ? undefined : `Events read from ${covers}`}>
        <SearchField aria-label="Search events" value={query} onValueChange={setQuery} />
        <ListGroup>
          {found.map((row) => (
            <ListRow key={row.id} title={row.title || "Untitled event"} detail={`${longDate.format(row.begin)} · ${when(row)}`}
              disabled={!view.can({ type: "pickDay", day: civilDay(row.begin) })} onClick={() => void view.send({ type: "pickDay", day: civilDay(row.begin) })} />
          ))}
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}

// spec/app/calendar/editor.md, "Story: Keep my draft through a restart"
function Drafts({ runtime, day }: CalendarProps & { day: number }) {
  const editor = useEditor(runtime);
  const e = editor.state;
  if (!e || e.banner !== "Available") return null;
  const restore: Editor.Event = { type: "restore", revision: e.revision };
  return (
    <Banner action={<>
      {editor.can(restore) ? <Button onClick={() => void editor.send(restore)}>Restore</Button> : null}
      {editor.can({ type: "askDiscard" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "askDiscard" })}>Discard</Button> : null}
      {editor.can({ type: "discard" }) ? <Button variant="destructive" onClick={() => void editor.send({ type: "discard" })}>Discard it</Button> : null}
      {editor.can({ type: "callOff" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "callOff" })}>Keep it</Button> : null}
    </>}>
      {`You have an unsaved event${e.form === "EditEvent" ? " change" : ""} from ${longDate.format(dateOf(e.day || day))}.`}
    </Banner>
  );
}

// spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/editor.md, "Story: Hand Android Calendar what Alpha cannot write"; spec/app/calendar/editor.md, "Story: Never create an event twice"
function Form({ runtime, day }: CalendarProps & { day: number }) {
  const editor = useEditor(runtime);
  const [fields, setFields] = useState<Fields>(() => runtime.runSync(kept(day, editor.state?.owner ?? 0)));
  const e = editor.state;
  if (!e) return null;
  const change = (next: Fields, edit: Editor.Event) => {
    setFields(next);
    void runtime.runPromise(typed(next, edit));
  };
  const scopes: ReadonlyArray<{ scope: Editor.Scope; label: string }> = [
    { scope: "ThisOne", label: "This event" }, { scope: "ThisAndFollowing", label: "This and following" }, { scope: "WholeSeries", label: "All events" },
  ];
  const timing = (begin: number, end: number): Editor.Event => ({ type: "setTiming", start: begin, end });
  return (
    <Sheet open onOpenChange={(opened) => (opened || !editor.can({ type: "close" }) ? undefined : void editor.send({ type: "close" }))}>
      <SheetContent title={e.form === "NewEvent" ? "New event" : "Edit event"}
        actions={<>
          {e.extras
            ? (editor.can({ type: "handOff" }) ? <Button onClick={() => void editor.send({ type: "handOff" })}>Finish in Android Calendar</Button> : null)
            : <Button loading={e.draft.sync === "Saving"} disabled={!editor.can({ type: "save" })} onClick={() => void editor.send({ type: "save" })}>Save</Button>}
          {!e.extras && !editor.can({ type: "save" }) ? <span className="text-sm text-muted-foreground">{saveOff[saveBlock(e.form === "NewEvent" && e.receipts.status === "Loading", e.draft.sync === "Saving", false, Editor.canKeepMyChanges(e), !e.titled)]}</span> : null}
          {editor.can({ type: "close" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "close" })}>Close</Button> : null}
        </>}>
        {e.banner === "Failed" ? <Banner variant="warn" action={<Button onClick={() => void editor.send({ type: "retryKeeping" })}>Retry</Button>}>Your draft couldn't be kept on this phone.</Banner> : null}
        {e.banner === "Conflict" ? (
          <Banner variant="warn" action={<>
            <Button onClick={() => void editor.send({ type: "keepMyDraft" })}>Keep mine</Button>
            {editor.can({ type: "askReplace" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "askReplace" })}>Use the other</Button> : null}
            {editor.can({ type: "takeOtherDraft" }) ? <Button variant="ghost" onClick={() => { setFields(runtime.runSync(kept(day, e.owner))); void editor.send({ type: "takeOtherDraft" }); }}>Replace mine</Button> : null}
            {editor.can({ type: "callOff" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "callOff" })}>Cancel</Button> : null}
          </>}>Another copy of this draft replaced it.</Banner>
        ) : null}
        {Editor.canKeepMyChanges(e) ? (
          <Banner variant="warn" action={<>
            <Button onClick={() => void editor.send({ type: "keepMyChanges" })}>Keep my changes</Button>
            <Button variant="ghost" onClick={() => void editor.send({ type: "takeSavedChanges" })}>Use the saved event</Button>
          </>}>This event changed since you started editing it.</Banner>
        ) : null}
        {e.form === "NewEvent" && e.receipts.status === "Failed" ? (
          <Banner variant="warn" action={editor.can({ type: "checkReceipts" }) ? <Button onClick={() => void editor.send({ type: "checkReceipts" })}>Try again</Button> : null}>
            Alpha couldn't check for events it may already have made, so it won't create this one yet.
          </Banner>
        ) : null}
        {e.unknownCreate && e.form === "NewEvent" ? (
          <Banner variant="warn" action={<>
            {editor.can({ type: "checkReceipts" }) ? <Button onClick={() => void editor.send({ type: "checkReceipts" })}>Check again</Button> : null}
            {editor.can({ type: "createSeparately" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "createSeparately" })}>Create a separate event</Button> : null}
            {editor.can({ type: "letDoubtGo" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "letDoubtGo" })}>Stop checking</Button> : null}
          </>}>Alpha can't tell whether your last new event was saved.</Banner>
        ) : null}
        <div className="flex flex-col gap-3">
          <Label>Title<Input aria-label="Title" value={fields.title} disabled={!editor.can({ type: "editTitle", blank: false })} onChange={(input) => change({ ...fields, title: input.target.value }, { type: "editTitle", blank: input.target.value.trim() === "" })} /></Label>
          <Label>Place<Input aria-label="Place" value={fields.place} disabled={!editor.can({ type: "editTitle", blank: fields.title.trim() === "" })} onChange={(input) => change({ ...fields, place: input.target.value }, { type: "editTitle", blank: fields.title.trim() === "" })} /></Label>
          <Label className="flex items-center justify-between">All day
            <Switch checked={e.allDay} disabled={!editor.can({ type: "setAllDay", allDay: !e.allDay })} onCheckedChange={(allDay) => change({ ...fields, allDay }, { type: "setAllDay", allDay })} />
          </Label>
          <Label>Starts<Input type="datetime-local" value={local(fields.begin)} onChange={(input) => {
            const begin = new Date(input.target.value).getTime();
            const end = Math.max(fields.end, begin + 1);
            if (Number.isFinite(begin) && editor.can(timing(begin, end))) change({ ...fields, begin, end }, timing(begin, end));
          }} /></Label>
          <Label>Ends<Input type="datetime-local" value={local(fields.end)} onChange={(input) => {
            const end = new Date(input.target.value).getTime();
            if (Number.isFinite(end) && editor.can(timing(fields.begin, end))) change({ ...fields, end }, timing(fields.begin, end));
          }} /></Label>
          <Label>People<Input value={fields.people} placeholder="Email addresses, separated by commas" onChange={(input) => {
            const people = input.target.value;
            const extras = people.trim() !== "" || (fields.repeat ?? "NoRepeat") !== "NoRepeat";
            change({ ...fields, people }, extras === e.extras ? { type: "editTitle", blank: fields.title.trim() === "" } : { type: "setExtras", extras });
          }} /></Label>
          {e.form === "NewEvent" ? (
            <Label>Repeats
              <Select value={fields.repeat ?? "NoRepeat"} onValueChange={(value) => {
                const repeat = value as NonNullable<Fields["repeat"]>;
                const extras = repeat !== "NoRepeat" || fields.people.trim() !== "";
                change({ ...fields, repeat }, extras === e.extras ? { type: "editTitle", blank: fields.title.trim() === "" } : { type: "setExtras", extras });
              }}>
                <SelectTrigger aria-label="Repeats" />
                <SelectContent>
                  {repeats.map(({ repeat, label }) => <SelectItem key={repeat} value={repeat}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Label>
          ) : null}
          <p className="text-sm text-muted-foreground">{`Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`}</p>
          <Label>Notes<Textarea value={fields.notes} disabled={!editor.can({ type: "editTitle", blank: fields.title.trim() === "" })} onChange={(input) => change({ ...fields, notes: input.target.value }, { type: "editTitle", blank: fields.title.trim() === "" })} /></Label>
          {e.form === "EditEvent" && e.repeats ? (
            <ListGroup heading="Change">
              {scopes.map(({ scope, label }) => (
                <ListRow key={scope} title={label} selected={e.scope === scope} disabled={!editor.can({ type: "chooseScope", scope }) && e.scope !== scope} onClick={() => void editor.send({ type: "chooseScope", scope })} />
              ))}
            </ListGroup>
          ) : null}
          {e.extras ? <p className="text-sm text-muted-foreground">People, repeats, video calls and alerts are added in Android Calendar.</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// spec/app/calendar/agent.md, "Only the owner approves, and approving sends the change once, under a new number"; spec/app/calendar/agent.md, "A card that leaves out a field its change would set can be declined, never approved"
function Proposal({ runtime }: CalendarProps) {
  const agent = useChanges(runtime);
  const a = agent.state;
  if (!a) return null;
  if (a.stage === "Idle") return a.result in results ? <Banner>{results[a.result]}</Banner> : null;
  const row = shown.find(a.id);
  return (
    <Card className="mx-4 my-2">
      <CardTitle>{`${changes[a.change]}${a.reply === "NoReply" ? "" : `: ${replies[a.reply]}`}`}</CardTitle>
      {row ? <p className="text-sm">{`${row.title || "Untitled event"} · ${longDate.format(row.begin)} · ${when(row)}`}</p> : null}
      {a.series ? <p className="text-sm">Every event in the series</p> : null}
      {a.complete ? null : <p className="text-sm text-muted-foreground">Alpha can't show this whole change, so it can't be approved.</p>}
      {a.stage === "Sending" || a.stage === "ReadingBack" ? <Spinner /> : null}
      <CardFooter>
        {agent.can({ type: "approve" }, "Owner") ? <Button onClick={() => void agent.send({ type: "approve" }, "Owner")}>Approve</Button> : null}
        {agent.can({ type: "decline" }, "Owner") ? <Button variant="ghost" onClick={() => void agent.send({ type: "decline" }, "Owner")}>Decline</Button> : null}
      </CardFooter>
    </Card>
  );
}

const said: Readonly<Record<Link.Said, string>> = {
  Quiet: "", ReadOnlyAccess: "Google lets your agent read this calendar but not change it. Allow changes to link it.",
  NotConnected: "Google isn't connected.", Stopped: "Setup stopped. Nothing was linked.", NotReady: "Calendar isn't ready yet. Try again.",
  ControlChanged: "Sync was changed somewhere else. Check it and try again.", DestinationMissing: "The linked calendar is no longer in your Google account.",
  DestinationUnapproved: "The linked calendar isn't one your agent may write to.", WaitingForDispatch: "Your agent is still sending an earlier change.",
  StillSyncing: "Syncing.", ChoosePrimary: "Choose a calendar in Google Calendar first.", ConflictHeld: "One event conflicts and is held.",
  ConflictMany: "Several events conflict.", UnconfirmedReview: "Alpha couldn't confirm sync.", UnconfirmedWrite: "Alpha couldn't confirm the change to sync.",
  UnconfirmedLinks: "Alpha couldn't read the linked events back.", UnsentReview: "Alpha couldn't read sync. Nothing changed.", Linked: "Synced.",
};

const endings: Readonly<Record<Link.Outcome, string>> = {
  NoOutcome: "Google Calendar", Synced: "Synced", Syncing: "Syncing", NeedsGrant: "Finish setup", NotLinked: "Not linked", Unconfirmed: "Couldn't check",
};

// spec/app/calendar/link.md, "Story: See whether my agent's Calendar reaches Google"; spec/app/calendar/link.md, "Story: Link a Google calendar I can write to, and be told it is synced only when it is"; spec/app/calendar/link.md, "Story: Disconnect Google from Calendar without leaving sync running"
function GoogleRow({ runtime }: CalendarProps) {
  const link = useLink(runtime);
  const view = useView(runtime);
  const l = link.state;
  if (!l || !view.state || l.owner === 0) return null;
  const running = l.phase !== "Idle" && l.phase !== "Done";
  return (
    <ListGroup heading="Google Calendar" className="mx-4 my-2">
      <ListRow title={running ? "Checking…" : view.state.connected || l.ending !== "NoOutcome" ? endings[l.ending] : "Not connected"} detail={said[l.said] || undefined} />
      <div className="flex flex-wrap gap-2 p-2">
        {link.can({ type: "start", grant: "Writable" }) ? <Button variant={l.ending === "Synced" ? "outline" : "primary"} onClick={() => void runtime.runPromise(setUp())}>{l.ending === "NoOutcome" ? "Link Google Calendar" : "Check again"}</Button> : null}
        {link.can({ type: "cancel" }) ? <Button variant="ghost" onClick={() => void link.send({ type: "cancel" })}>Cancel</Button> : null}
        {link.can({ type: "pauseAsked" }) && l.ending === "Synced" ? <Button variant="ghost" onClick={() => void link.send({ type: "pauseAsked" })}>Pause sync</Button> : null}
      </div>
      {l.pause === "PauseConfirmed" ? <p className="px-4 text-sm">Sync is paused.</p> : l.pause === "PauseUnknown" ? <p className="px-4 text-sm">Alpha couldn't confirm sync paused.</p> : null}
    </ListGroup>
  );
}
