// spec/app/calendar/index.md, "Story: See my days"; spec/app/calendar/index.md, "Story: Move through the days"; spec/app/calendar/index.md, "Story: Look at an event"; spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/agent.md, "Story: Approve what the agent changes"
import {
  AppHeader, Banner, Button, Card, CardFooter, CardTitle, Dialog, DialogContent, DialogTitle, EmptyState, Input, Label,
  ListGroup, ListRow, Sheet, SheetContent, Spinner, Switch, Textarea,
} from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { CalendarDays, Layers, Plus } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import * as View from "../../gen/app__calendar.ts";
import { useMachine as useView } from "../../gen/app__calendar.react.ts";
import type * as Changes from "../../gen/app__calendar__agent.ts";
import { useMachine as useChanges } from "../../gen/app__calendar__agent.react.ts";
import * as Editor from "../../gen/app__calendar__editor.ts";
import { useMachine as useEditor } from "../../gen/app__calendar__editor.react.ts";
import type { Calendared } from "./calendar.vibe";
import { type Fields, kept, typed } from "./editor.vibe";
import { type Row, shown } from "./shown.ts";
import { civilDay, dateOf, monthStart, weekStart } from "./time.ts";

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
  const rows = [...shown.of("Phone", s.anchor).slice(0, s.phoneRows), ...shown.of("Google", s.anchor).slice(0, s.googleRows)].sort((a, b) => a.begin - b.begin);
  const week = Array.from({ length: 7 }, (_, at) => weekStart(s.anchor) + at);
  const send = (event: View.Event) => () => void view.send(event);
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
      {!s.connected ? <Banner>Your agent has no Google Calendar connected.</Banner> : null}
      <Drafts runtime={runtime} day={s.anchor} />
      <Proposal runtime={runtime} />
      <main className="flex-1 overflow-y-auto px-4 py-2">
        {View.empty(s) ? <EmptyState title="Nothing on this day" icon={<CalendarDays />} /> : (
          <ListGroup heading={s.layout === "Agenda" ? "From today" : longDate.format(dateOf(s.anchor))}>
            {rows.map((row) => (
              <ListRow key={row.id} title={row.title || "Untitled event"} detail={`${when(row)}${row.place ? ` · ${row.place}` : ""}`}
                disabled={!view.can({ type: "openEvent", id: row.id, place: row.place !== "", video: row.video !== "" })}
                onClick={send({ type: "openEvent", id: row.id, place: row.place !== "", video: row.video !== "" })}
                trailing={<span className="text-xs text-muted-foreground">{row.source === "Phone" ? "Phone" : "Google"}</span>} />
            ))}
          </ListGroup>
        )}
        {s.reminders > 0 ? <p className="py-2 text-sm text-muted-foreground">{`${s.reminders} reminders today`}</p> : null}
      </main>
      <Sheet open={s.overlay === "LayoutMenu"} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
        <SheetContent title="Layout">
          {layouts.map(({ layout, label }) => (
            <ListRow key={layout} title={label} selected={s.layout === layout} disabled={!view.can({ type: "chooseLayout", layout })} onClick={send({ type: "chooseLayout", layout })} />
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
            </>}>
            {s.detail === "Rereading" ? <Spinner /> : null}
            {open.place ? <p>{open.place}</p> : null}
            {open.notes ? <p className="whitespace-pre-wrap text-sm">{open.notes}</p> : null}
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

// spec/app/calendar/editor.md, "Story: Delete an event, or answer an invitation"
function EventWrites({ runtime, row }: CalendarProps & { row: Row }) {
  const editor = useEditor(runtime);
  if (!editor.state || row.source !== "Phone") return null;
  const edit: Editor.Event = { type: "editEvent", id: row.id, revision: row.revision, day: civilDay(row.begin), repeats: row.recurring };
  const remove = (scope: Editor.Scope): Editor.Event => ({ type: "deleteEvent", id: row.id, revision: row.revision, scope, repeating: row.recurring });
  const uncertain = editor.state.latched === row.id;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {uncertain ? <Banner variant="warn">Alpha can't tell whether the last change to this event was made.</Banner> : null}
      {editor.can(edit) ? <Button variant="outline" onClick={() => void editor.send(edit)}>Edit</Button> : null}
      {editor.can(remove("ThisOne")) ? <Button variant="destructive" onClick={() => void editor.send(remove("ThisOne"))}>{row.recurring ? "Delete this one" : "Delete"}</Button> : null}
      {editor.can(remove("WholeSeries")) ? <Button variant="destructive" onClick={() => void editor.send(remove("WholeSeries"))}>Delete the series</Button> : null}
    </div>
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
      {editor.can({ type: "discard" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "discard" })}>Discard</Button> : null}
    </>}>
      {`You have an unsaved event${e.form === "EditEvent" ? " change" : ""} from ${longDate.format(dateOf(e.day || day))}.`}
    </Banner>
  );
}

// spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/editor.md, "Story: Hand Android Calendar what Alpha cannot write"; spec/app/calendar/editor.md, "Story: Never create an event twice"
function Form({ runtime, day }: CalendarProps & { day: number }) {
  const editor = useEditor(runtime);
  const [fields, setFields] = useState<Fields>(() => runtime.runSync(kept(day)));
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
          {editor.can({ type: "close" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "close" })}>Close</Button> : null}
        </>}>
        {e.banner === "Failed" ? <Banner variant="warn" action={<Button onClick={() => void editor.send({ type: "retryKeeping" })}>Retry</Button>}>Your draft couldn't be kept on this phone.</Banner> : null}
        {e.banner === "Conflict" ? (
          <Banner variant="warn" action={<>
            <Button onClick={() => void editor.send({ type: "keepMyDraft" })}>Keep mine</Button>
            <Button variant="ghost" onClick={() => { setFields(runtime.runSync(kept(day))); void editor.send({ type: "takeOtherDraft" }); }}>Use the other</Button>
          </>}>Another copy of this draft replaced it.</Banner>
        ) : null}
        {Editor.canKeepMyChanges(e) ? (
          <Banner variant="warn" action={<>
            <Button onClick={() => void editor.send({ type: "keepMyChanges" })}>Keep my changes</Button>
            <Button variant="ghost" onClick={() => void editor.send({ type: "takeSavedChanges" })}>Use the saved event</Button>
          </>}>This event changed since you started editing it.</Banner>
        ) : null}
        {e.unknownCreate && e.form === "NewEvent" ? (
          <Banner variant="warn" action={<>
            {editor.can({ type: "checkReceipts" }) ? <Button onClick={() => void editor.send({ type: "checkReceipts" })}>Check again</Button> : null}
            {editor.can({ type: "createSeparately" }) ? <Button variant="ghost" onClick={() => void editor.send({ type: "createSeparately" })}>Create a separate event</Button> : null}
          </>}>Alpha can't tell whether your last new event was saved.</Banner>
        ) : null}
        <div className="flex flex-col gap-3">
          <Label>Title<Input aria-label="Title" value={fields.title} disabled={!editor.can({ type: "editTitle" })} onChange={(input) => change({ ...fields, title: input.target.value }, { type: "editTitle" })} /></Label>
          <Label>Place<Input aria-label="Place" value={fields.place} disabled={!editor.can({ type: "editTitle" })} onChange={(input) => change({ ...fields, place: input.target.value }, { type: "editTitle" })} /></Label>
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
            const extras = people.trim() !== "";
            change({ ...fields, people }, extras === e.extras ? { type: "editTitle" } : { type: "setExtras", extras });
          }} /></Label>
          <Label>Notes<Textarea value={fields.notes} disabled={!editor.can({ type: "editTitle" })} onChange={(input) => change({ ...fields, notes: input.target.value }, { type: "editTitle" })} /></Label>
          {e.form === "EditEvent" && e.repeats ? (
            <ListGroup heading="Change">
              {scopes.map(({ scope, label }) => (
                <ListRow key={scope} title={label} selected={e.scope === scope} disabled={!editor.can({ type: "chooseScope", scope }) && e.scope !== scope} onClick={() => void editor.send({ type: "chooseScope", scope })} />
              ))}
            </ListGroup>
          ) : null}
          {e.extras ? <p className="text-sm text-muted-foreground">People, video calls and alerts are added in Android Calendar.</p> : null}
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

