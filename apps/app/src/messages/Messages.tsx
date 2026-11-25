// spec/app/messages/index.md, "Story: See my conversations"; spec/app/messages/index.md, "Story: Read a conversation"; spec/app/messages/index.md, "Story: Act on a message"; spec/app/messages/index.md, "Story: Start a new message"; spec/app/messages/composer.md, "Story: Keep my draft"; spec/app/messages/composer.md, "Story: Send a message"
import { MMS_ATTACHMENT_TYPES, MMS_MAX_BODY, MMS_MAX_RECIPIENTS } from "@elizaos/os/bridges/definitions/messages";
import type { MessageRow, ThreadRow } from "@elizaos/os/bridges/messages";
import type { TelephonySubscription } from "@elizaos/os/bridges/phone";
import { Alert, Avatar, Banner, Button, Chip, ConfirmDialog, Input, Menu, MenuContent, MenuItem, MenuTrigger, SearchField, Spinner, Textarea } from "@repo/ui";
import type { Layer, ManagedRuntime } from "effect";
import { ArrowUp, Camera, ChevronDown, ChevronLeft, ChevronUp, CircleAlert, Copy, Image as PictureIcon, ImagePlus, Mic, Pencil, Phone as Call, Plus, RefreshCw, Search, Send, Sparkles, Square, Trash2, X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { content, noMatches, noThreads, smsNeeded, threadsFailed } from "../../gen/app__messages.ts";
import { useMachine as useMessages } from "../../gen/app__messages.react.ts";
import { delivered, sentAll, uncertain } from "../../gen/app__messages__sending.ts";
import { useMachine as useComposer } from "../../gen/app__messages__composer.react.ts";
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { Time } from "../runtime/time.vibe";
import { shortWhen } from "../phone/words.ts";
import { Drafts, attachAll, prepare, sameSubscription, supported } from "./composer.vibe";
import { Conversations, Inbox, titleOf } from "./messages.vibe";
import { CommsBar, useCommsDock } from "../phone/CommsBar.tsx";
import type { Resident } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { useMachine as useVoice } from "../../gen/app__voice.react.ts";
import { dictateMessage, type voiceArea } from "./dictation.vibe";

export interface MessagesProps {
  /** Provides Messages' and the composer's machines, both resident, Phone's, for whether a call may be an emergency call, and what they count. */
  runtime: ManagedRuntime.ManagedRuntime<Resident | Layer.Success<typeof voiceArea>, unknown>;
  onBack?: (() => void) | undefined;
  onOpenLink?: ((href: string) => void) | undefined;
}


type MessagesUI = ReturnType<typeof useMessages>;

const header = "flex min-h-12 shrink-0 items-center gap-1 px-2";
const contactRow = "flex min-h-15 w-full items-center gap-3 px-5 py-1.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";
const messageURL = /\bhttps?:\/\/[^\s<>"']+/giu;
const noMessages: ReadonlyArray<MessageRow> = [];

function firstName(title: string) {
  return /^[+(\d]/.test(title) || title.includes(",") ? title : (title.split(/\s+/, 1)[0] ?? title);
}

function initials(title: string) {
  const words = title.trim().split(/\s+/u);
  return [words[0], words.length > 1 ? words.at(-1) : undefined].map((word) => Array.from(word ?? "")[0] ?? "").join("").toUpperCase();
}

/** A message's time as develop's bubbles say it: the time today, and the date before it on another day. */
function stamp(at: number, now: number): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === new Date(now).toDateString()) return time;
  const day = date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
  return `${day} · ${time}`;
}

function clearChoice(runtime: MessagesProps["runtime"]) {
  runtime.runSync(Inbox.use((inbox) => inbox.set({ chosen: "" })));
}

/**
 * Messages: the conversation list, one conversation with its composer, and the picker that starts a new message.
 * Only the owner's Send sends. Alpha's draft is marked as Alpha's and never sends itself.
 * @model spec/app/messages/index.md
 */
export function Messages({ runtime, onBack, onOpenLink }: MessagesProps) {
  const messages = useMessages(runtime);
  const dock = useCommsDock(runtime);
  if (messages.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Messages</Alert>;
  const { state } = messages;
  if (!state) return null;
  return (
    <section data-alpha-messages data-sheet={dock.open ? "open" : "closed"} aria-label="Messages" className="group/messages flex h-full min-h-0 flex-col overflow-hidden data-[sheet=closed]:pt-2">
      {state.pane === "Threads" && <Threads runtime={runtime} messages={messages} onBack={onBack} />}
      {state.pane === "Conversation" && <Conversation key={state.thread} runtime={runtime} messages={messages} onOpenLink={onOpenLink} />}
      {state.pane === "Picker" && <Picker runtime={runtime} messages={messages} />}
    </section>
  );
}

function Threads({ runtime, messages: { state, can, send }, onBack }: MessagesProps & { messages: MessagesUI }) {
  const [searching, setSearching] = useState(false);
  if (!state) return null;
  const { threads, sought, names } = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const now = runtime.runSync(Time.use((time) => time.latest()));
  const search = (typed: string) => {
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (!can(event)) return;
    runtime.runSync(Inbox.use((inbox) => inbox.set({ sought: typed })));
    void send(event);
  };
  const open = (row: ThreadRow) => {
    clearChoice(runtime);
    const thread = runtime.runSync(Conversations.use((numbering) => numbering.of({ id: row.id, addresses: "incomplete" in row ? [] : row.addresses })));
    if (can({ type: "openThread", thread })) void send({ type: "openThread", thread });
  };
  const allow = { type: "allow", need: "SmsAccess" } as const;
  const settings = { type: "goToSettings", need: "SmsAccess" } as const;
  const unread = { type: "pickChip", chip: "UnreadThreads" } as const;
  const all = { type: "pickChip", chip: "AllThreads" } as const;
  return (
    <>
      {searching ? (
        <header className={header} data-alpha-messages-search-header>
          <Button variant="ghost" size="icon" aria-label="Back to messages" onClick={() => { search(""); setSearching(false); }}><ChevronLeft /></Button>
          <div role="search" aria-label="Search messages" className="min-w-0 flex-1 pr-2">
            <SearchField autoFocus aria-label="Search conversations" placeholder="Search conversations" value={sought} onValueChange={search} clearLabel="Clear search" />
          </div>
        </header>
      ) : (
        <header className="flex h-13 shrink-0 items-center gap-0.5 px-2 [&>button]:size-13" data-alpha-messages-header data-alpha-stage-header>
          {onBack && <Button variant="ghost" size="icon" aria-label="Back to apps" onClick={onBack}><ChevronLeft /></Button>}
          <h1 className="min-w-0 flex-1 truncate text-xl leading-tight font-semibold">Messages</h1>
          {!smsNeeded(state) && <Button variant="ghost" size="icon" aria-label="Search messages" data-alpha-messages-search onClick={() => setSearching(true)}><Search /></Button>}
          {can({ type: "newMessage" }) && <Button variant="ghost" size="icon" aria-label="New message" data-alpha-messages-new onClick={() => {
            runtime.runSync(Inbox.use((inbox) => inbox.set({ typed: "" })));
            void send({ type: "newMessage" });
          }}><Pencil /></Button>}
        </header>
      )}
      {smsNeeded(state) && (can(allow) || can(settings)) && (
        <div className="grid flex-1 place-items-center px-4">
          {can(allow) ? <Button data-alpha-messages-allow onClick={() => void send(allow)}>Allow SMS read access</Button> : <Button variant="outline" onClick={() => void send(settings)}>Open Settings for SMS access</Button>}
        </div>
      )}
      {!smsNeeded(state) && (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 empty:hidden" role="group" aria-label="Filter conversations">
            {state.chip === "UnreadThreads"
              ? <Chip onClear={can(all) ? () => void send(all) : undefined} clearLabel="Show all conversations">Unread</Chip>
              : searching && can(unread) && <Button size="sm" variant="ghost" onClick={() => void send(unread)}>Unread</Button>}
            {!searching && state.sought && <Chip onClear={() => search("")} clearLabel="Clear the search">{sought}</Chip>}
          </div>
          <div data-alpha-messages-threads className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain py-1">
            {state.list.status === "Loading" && state.threads === 0 && <div className="px-5 py-3"><Spinner label="Reading conversations" /></div>}
            {threadsFailed(state) && <div className="p-4"><Banner variant="destructive" action={can({ type: "retryThreads" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "retryThreads" })}>Retry</Button>}>Conversations could not be read</Banner></div>}
            {noThreads(state) && <p role="status" className="px-5 py-3 text-muted-foreground">No conversations</p>}
            {noMatches(state) && <p role="status" className="px-5 py-3 text-muted-foreground">No matches</p>}
            {state.threads > 0 && (
              <ul aria-label="Conversations">
                {threads.map((row) => {
                  const complete = "incomplete" in row ? undefined : row;
                  const title = complete ? titleOf(complete.addresses, names) || "Conversation" : "Conversation";
                  return (
                    <li key={row.id}>
                      <button type="button" aria-label={title} aria-description={complete?.unread ? "Unread" : undefined} onClick={() => open(row)} className={`${contactRow} min-h-17 items-start py-2.5`}>
                        <Avatar name={title} aria-hidden className="size-12 text-base" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            {complete?.unread && <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />}
                            <span className={`min-w-0 flex-1 truncate text-body leading-plain ${complete?.unread ? "font-bold" : "font-semibold"}`}>{title}</span>
                            <span className="shrink-0 text-sm text-muted-foreground">{shortWhen(row.date, now)}</span>
                          </span>
                          <span className={`block truncate text-base ${complete?.unread ? "text-foreground" : "text-muted-foreground"}`}>{complete?.snippet ?? "Open in your messaging app"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {can({ type: "olderThreads" }) && <div className="grid place-items-center py-2"><Button size="icon" variant="secondary" aria-label="Older conversations" onClick={() => void send({ type: "olderThreads" })}><ChevronDown /></Button></div>}
          </div>
        </>
      )}
      <CommsBar runtime={runtime} closed={smsNeeded(state) ? undefined : (ask, talk) => (
        <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(event) => { event.preventDefault(); ask(sought.trim()); }}>
          <Input data-alpha-composer aria-label="Search or ask" placeholder="Search or ask" value={sought} onChange={(event) => search(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent pl-2 shadow-none" />
          {sought.trim() !== "" ? <Button size="icon" variant="ghost" type="submit" aria-label="Ask Alpha"><ArrowUp /></Button>
            : talk && <Button size="icon" variant="ghost" type="button" aria-label="Talk" onClick={talk}><Mic /></Button>}
        </form>
      )} />
    </>
  );
}

/** Inline URL text, escaped by React. Whitespace and punctuation outside each URL are preserved. */
function MessageText({ text, onOpenLink }: { text: string; onOpenLink?: MessagesProps["onOpenLink"] }) {
  const parts = [];
  let consumed = 0;
  for (const matched of text.matchAll(messageURL)) {
    const found = matched[0];
    const offset = matched.index;
    if (offset === undefined) continue;
    const raw = found.replace(/[.,!?;:]+$/u, "").replace(/\)+$/u, (ending) => {
      const excess = (found.match(/\)/gu)?.length ?? 0) - (found.match(/\(/gu)?.length ?? 0);
      return ending.slice(0, Math.max(0, ending.length - Math.max(0, excess)));
    });
    const parsed = URL.parse(raw);
    if (!parsed?.hostname || parsed.username || parsed.password) continue;
    parts.push(text.slice(consumed, offset), (
      <a className="underline underline-offset-2" href={parsed.href} target="_blank" rel="noopener noreferrer" key={offset} onClick={onOpenLink ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenLink(parsed.href);
      } : undefined}>{raw}</a>
    ));
    consumed = offset + raw.length;
  }
  return <>{parts}{text.slice(consumed)}</>;
}

interface BubbleActions {
  copy?: (() => void) | undefined;
  remove?: (() => void) | undefined;
}

const Bubble = memo(function Bubble({ row, now, choose, actions, onOpenLink }: { row: MessageRow; now: number; choose: (id: string) => void; actions?: BubbleActions | undefined; onOpenLink?: MessagesProps["onOpenLink"] }) {
  const trigger = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; at: number } | null>(null);
  const complete = "incomplete" in row ? undefined : row;
  const outgoing = complete?.direction === "outgoing";
  const failed = complete?.status === "failed";
  const status = failed ? "Not sent" : complete?.status === "pending" ? "Sending" : outgoing && (complete?.status === "delivered" || complete?.deliveryReport === "complete") ? "Delivered" : outgoing ? "Sent" : "";
  const select = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a")) return;
    if (document.getSelection()?.isCollapsed === false) return;
    choose(row.id);
  };
  const moved = (event: PointerEvent) => {
    const started = pointer.current;
    if (started && Math.hypot(event.clientX - started.x, event.clientY - started.y) > 12) pointer.current = null;
  };
  const label = complete ? complete.body || "Picture message" : "A message Alpha cannot show";
  return (
    <div className={`flex max-w-[min(17.5rem,100%)] flex-col ${outgoing ? "items-end self-end" : "items-start self-start"}`}>
      <div ref={trigger} data-alpha-message-id={row.id} data-alpha-sms-outgoing={outgoing} role="button" tabIndex={0} aria-label={`Message actions: ${label}`} aria-haspopup="menu" aria-expanded={Boolean(actions)}
        className={`flex max-w-full flex-col gap-0.5 rounded-tile focus-visible:outline-2 focus-visible:outline-ring ${outgoing ? "items-end" : "items-start"}`}
        onClick={select}
        onContextMenu={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) return;
          event.preventDefault();
          select(event);
        }}
        onPointerDown={(event) => { if (event.pointerType === "touch") pointer.current = { x: event.clientX, y: event.clientY, at: event.timeStamp }; }}
        onPointerMove={moved}
        onPointerCancel={() => { pointer.current = null; }}
        onPointerUp={(event) => {
          const started = pointer.current;
          pointer.current = null;
          if (started && event.timeStamp - started.at >= 500) choose(row.id);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10") || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            choose(row.id);
          }
        }}>
        {!complete ? <p className="rounded-tile bg-muted px-4 py-2.5 text-base">{label}</p> : (
          <>
            {complete.attachments > 0 && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><PictureIcon className="size-4" aria-hidden />{complete.attachments === 1 ? "1 picture" : `${complete.attachments} pictures`}</span>}
            {complete.body && <p data-alpha-message-body className={`rounded-tile px-4 py-2.75 text-body leading-field whitespace-pre-wrap wrap-anywhere ${outgoing ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}><MessageText text={complete.body} onOpenLink={onOpenLink} /></p>}
          </>
        )}
        <span data-alpha-message-meta title={new Date(row.date).toLocaleString()} className="px-1.5 text-2xs text-muted-foreground">{[stamp(row.date, now), status].filter(Boolean).join(" · ")}</span>
        {failed && <CircleAlert className="size-4 text-destructive" role="img" aria-label="Message failed" />}
      </div>
      {actions && (
        <div data-alpha-sms-actions role="menu" aria-label="Message actions" className="flex flex-wrap items-center gap-1 py-1" onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          choose("");
          trigger.current?.focus();
        }}>
          {actions.copy && <Button role="menuitem" autoFocus size="sm" variant="secondary" onClick={actions.copy}><Copy />Copy</Button>}
          {actions.remove && <Button role="menuitem" autoFocus={!actions.copy} size="sm" variant="ghost" className="text-destructive" onClick={actions.remove}><Trash2 />Delete</Button>}
        </div>
      )}
    </div>
  );
});

/** One conversation: provider rows, their actions, and the draft belonging to this exact thread. */
function Conversation({ runtime, messages: { state, can, send }, onOpenLink }: MessagesProps & { messages: MessagesUI }) {
  const phone = usePhone(runtime).state;
  const [selected, setSelected] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const nearEnd = useRef(true);
  const held = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const now = runtime.runSync(Time.use((time) => time.latest()));
  const rows = state?.shown.rows && held.messagesThread === state.thread ? held.messages : noMessages;
  const chronological = useMemo(() => rows.toReversed(), [rows]);
  const latest = rows[0]?.id;
  const anchor = useCallback((element: HTMLDivElement | null) => {
    if (element && latest && nearEnd.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [latest]);
  const viewport = useCallback((element: HTMLDivElement | null) => {
    scroll.current = element;
    if (!element || typeof ResizeObserver === "undefined") return;
    const resize = new ResizeObserver(() => {
      if (nearEnd.current) element.scrollTop = element.scrollHeight;
    });
    resize.observe(element);
    return () => { resize.disconnect(); scroll.current = null; };
  }, []);
  const choose = useCallback((id: string) => {
    runtime.runSync(Inbox.use((inbox) => inbox.set({ chosen: id })));
    setSelected(id);
  }, [runtime]);
  if (!state || !phone) return null;
  const conversation = runtime.runSync(Conversations.use((numbering) => numbering.get(state.thread)));
  const addresses = conversation._tag === "Some" ? conversation.value.addresses : [];
  const title = titleOf(addresses, held.names) || "Conversation";
  const selectedRow = rows.find((row) => row.id === selected);
  const confirm = { type: "confirmDelete", clear: clear(phone) } as const;
  const actions = selectedRow && !("incomplete" in selectedRow) && !state.confirming && content(state) ? {
    copy: selectedRow.body && can({ type: "copy" }) ? () => { void send({ type: "copy" }); } : undefined,
    remove: state.smsApp && state.removal.outcome !== "Unknown" && can({ type: "askDelete" }) ? () => {
      const { id, kind, threadId, date } = selectedRow;
      runtime.runSync(Inbox.use((inbox) => inbox.set({ deleteTarget: { id, kind, threadId, date } })));
      void send({ type: "askDelete" });
    } : undefined,
  } : undefined;
  return (
    <>
      <header className={`${header} pb-2`} data-alpha-navigation-header data-alpha-stage-header>
        {can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => { clearChoice(runtime); void send({ type: "back" }); }}><ChevronLeft /></Button>}
        <Avatar name={title} aria-hidden size="sm" data-alpha-stage-avatar className="group-data-[sheet=closed]/messages:size-9" />
        <h1 data-alpha-messages-title className="min-w-0 flex-1 truncate pl-1.5 text-lg font-bold">{title}</h1>
        {addresses.length === 1 && can({ type: "call" }) && <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={() => void send({ type: "call" })}><Call /></Button>}
      </header>
      <div ref={viewport} data-alpha-messages-thread className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-3" onScroll={(event) => {
        const viewport = event.currentTarget;
        nearEnd.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 64;
      }}>
        <div className="flex min-h-full flex-col gap-1.5">
          {state.page.status === "Loading" && state.shown.rows === 0 && <Spinner label="Reading the conversation" />}
          {state.page.status === "Failed" && <Banner variant="destructive">The conversation could not be read</Banner>}
          {can({ type: "earlierMessages" }) && <Button className="self-center" size="icon" variant="secondary" aria-label="Earlier messages" onClick={() => void send({ type: "earlierMessages" })}><ChevronUp /></Button>}
          <div role="log" aria-label="Messages" className="mt-auto flex flex-col gap-1.5">
            {chronological.map((row) => <Bubble key={row.id} row={row} now={now} choose={choose} actions={row.id === selected && (actions?.copy || actions?.remove) ? actions : undefined} onOpenLink={onOpenLink} />)}
          </div>
          {selectedRow && "incomplete" in selectedRow && can({ type: "openElsewhere" }) && <Button size="sm" variant="outline" className="self-start" onClick={() => void send({ type: "openElsewhere" })}>Open in messaging app</Button>}
          <div ref={anchor} aria-hidden />
        </div>
      </div>
      {state.removal.outcome === "Unknown" && <Banner variant="warn">Alpha cannot tell whether the message was deleted</Banner>}
      {state.removal.outcome === "Refused" && held.deleteTarget && <Banner variant="destructive">The message was not deleted</Banner>}
      <ConfirmDialog open={state.confirming} title="Delete message?" confirmLabel="Delete" destructive
        onConfirm={() => void (selectedRow && !("incomplete" in selectedRow) && can(confirm) && send(confirm))} onCancel={() => void (can({ type: "keep" }) && send({ type: "keep" }))}>Delete this message from this phone?</ConfirmDialog>
      <Compose runtime={runtime} title={title} addresses={addresses} thread={state.thread} />
    </>
  );
}

/** The thread's one person-target input, or its complete draft while the Alpha sheet is up. */
function Compose({ runtime, title, addresses, thread }: MessagesProps & { title: string; addresses: ReadonlyArray<string>; thread: number }) {
  const composer = useComposer(runtime);
  const phone = usePhone(runtime).state;
  const dock = useCommsDock(runtime);
  const voice = useVoice(runtime);
  const field = useRef<HTMLTextAreaElement>(null);
  const picturesInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const focus = useRef(false);
  const [simChoice, selectSim] = useState<{ thread: number; subscription: TelephonySubscription }>();
  const selectedSim = simChoice?.thread === thread ? simChoice.subscription : undefined;
  const { state, can, send } = composer;
  if (!state || !phone || state.thread !== thread || addresses.length === 0) return <CommsBar runtime={runtime} />;
  const person = { label: title, initials: initials(title) };
  const text = state.slot.author === "Nobody" ? "" : runtime.runSync(Drafts.use((drafts) => drafts.text(thread)));
  const pictures = runtime.runSync(Drafts.use((drafts) => drafts.pictures()));
  const subscriptions = runtime.runSync(Drafts.use((drafts) => drafts.subscriptions()));
  const write = (next: string) => {
    const event = { type: "typeText", empty: next.length === 0 } as const;
    if (!can(event)) return;
    runtime.runSync(Drafts.use((drafts) => drafts.write(thread, next)));
    void send(event);
  };
  const outgoing = state.outgoing;
  const here = outgoing.thread === thread;
  const checking = here && uncertain(outgoing);
  const sendNow = { type: "send", supported: runtime.runSync(supported(state.recipients, pictures.length)), clear: clear(phone) } as const;
  const simReady = selectedSim === undefined ? state.sims <= 1 : subscriptions.some((sim) => sameSubscription(sim, selectedSim));
  const sendable = (checking || simReady && (Boolean(text.trim()) || pictures.length > 0)) && can(sendNow);
  const submit = () => {
    if (!sendable) return;
    if (!checking && !runtime.runSync(prepare(thread, selectedSim))) return;
    void send(sendNow);
  };
  const edit = () => {
    if (!can({ type: "typeText", empty: false })) return;
    write(text);
    if (!dock.open) { field.current?.focus(); return; }
    focus.current = true;
    dock.close();
  };
  const sendLabel = checking ? "Check send status" : "Send";
  const alpha = state.slot.author === "AlphaWrote";
  const addressed = title === addresses.join(", ") ? title : `${title} · ${addresses.join(", ")}`;
  const draft = text && (alpha || dock.open);
  const editable = can({ type: "typeText", empty: text.length === 0 });
  const attachment = { type: "attach", fits: true } as const;
  const canPicture = runtime.runSync(supported(state.recipients, 1)) && can(attachment);
  const canSuggest = can({ type: "suggest" });
  const handoff = { type: "handOff", supported: sendNow.supported } as const;
  const recorder = voice.state?.recorder;
  const recording = recorder?.field === "MessagesBar" && recorder.stage !== "Closed";
  const stop = { type: "stopRecording", now: untimed } as const;
  const discard = { type: "closeRecorder" } as const;
  const retry = { type: "transcribeAgain", now: untimed } as const;
  const messageForm = recording ? (
    <div data-alpha-composer data-alpha-bar-recorder="" aria-label="Message dictation" role="group" className="flex min-w-0 flex-1 items-center gap-2">
      <span role="status" className="min-w-0 flex-1 text-sm">{recorder.stage === "Recording" ? "Recording" : recorder.stage === "Recorded" ? "Couldn’t transcribe" : recorder.stage === "Transcribing" ? "Transcribing" : "Starting microphone"}</span>
      {voice.can(retry) && <Button variant="ghost" size="icon" aria-label="Try transcription again" onClick={() => void voice.send(retry)}><RefreshCw /></Button>}
      {voice.can(discard) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void voice.send(discard)}><X /></Button>}
      {voice.can(stop) && <Button size="icon" aria-label="Stop recording" onClick={() => void voice.send(stop)}><Square fill="currentColor" /></Button>}
    </div>
  ) : (
    <div data-alpha-composer data-alpha-messages-composer className="flex min-w-0 flex-1 items-end gap-1">
      <Textarea className="max-h-[min(10.5rem,28dvh)] min-w-0 flex-1 overflow-y-auto border-0 bg-transparent pl-2 shadow-none" aria-label="Message" placeholder={`Text ${firstName(title)}`} rows={1} value={text} maxLength={MMS_MAX_BODY} readOnly={!editable}
        ref={(element) => {
          field.current = element;
          if (element && focus.current) { focus.current = false; element.focus(); }
        }}
        onChange={(event) => write(event.target.value)} />
      {(canPicture || canSuggest) && <Menu>
        <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Message actions"><Plus /></Button></MenuTrigger>
        <MenuContent aria-label="Message actions" side="top" sideOffset={8}>
          {canPicture && <>
            <MenuItem onSelect={() => cameraInput.current?.click()}><Camera />Camera</MenuItem>
            <MenuItem onSelect={() => picturesInput.current?.click()}><ImagePlus />Add media</MenuItem>
          </>}
          {canSuggest && <MenuItem onSelect={() => void send({ type: "suggest" })}><Sparkles />Let Alpha suggest a reply</MenuItem>}
        </MenuContent>
      </Menu>}
      {([["Attach a picture", picturesInput, false], ["Take a picture", cameraInput, true]] as const).map(([label, input, camera]) => (
        <input key={label} ref={input} hidden type="file" aria-label={label} multiple={!camera} capture={camera ? "environment" : undefined} accept={MMS_ATTACHMENT_TYPES.join(",")} disabled={!canPicture} onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) void runtime.runPromise(attachAll(files));
        }} />
      ))}
      {editable && phone.telecom === "NoCall" && voice.can({ type: "openRecorder", target: "MessagesBar" }) && <Button variant="ghost" size="icon" aria-label={`Dictate a text to ${firstName(title)}`} onClick={() => void runtime.runPromise(dictateMessage(thread))}><Mic /></Button>}
      {sendable && <Button size="icon" aria-label={sendLabel} data-alpha-bar-send onClick={submit}>{checking ? <RefreshCw /> : <Send />}</Button>}
    </div>
  );
  return (
    <>
      {draft && (
        <div data-alpha-draft-bubble={alpha ? "alpha" : "owner"} role="group" aria-label={alpha ? `Message draft to ${addressed}` : "Your draft, not sent"}
          className="mx-3 flex max-h-[55%] min-h-0 shrink flex-col rounded-tile border border-dashed border-input bg-secondary px-4 pt-2">
          <div className="min-h-0 overflow-y-auto">
            <p className="text-sm font-semibold text-muted-foreground">{alpha ? `Alpha's draft · To ${addressed}` : "Your draft"}</p>
            <p className="text-base whitespace-pre-wrap wrap-anywhere">{text}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1 py-1">
            {can({ type: "undo" }) && <Button size="sm" variant="ghost" onClick={() => void send({ type: "undo" })}>Don't send</Button>}
            {editable && <Button size="sm" variant="outline" data-alpha-draft-edit onClick={edit}>Edit</Button>}
            {dock.open && <Button size="sm" data-alpha-draft-send disabled={!sendable} onClick={submit}>{sendLabel}</Button>}
          </div>
        </div>
      )}
      <div data-alpha-messages-accessories className="flex max-h-[34%] shrink-0 flex-wrap gap-1.5 overflow-y-auto px-3 empty:hidden">
        {state.slot.draft.sync === "Conflicted" && (
          <Banner variant="warn" action={<>
            {can({ type: "keepMine" }) && <Button size="sm" onClick={() => void send({ type: "keepMine" })}>Keep mine</Button>}
            {can({ type: "takeSaved" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "takeSaved" })}>Use the saved draft</Button>}
          </>}>Another draft was saved for this conversation</Banner>
        )}
        {checking && <Banner variant="warn">Alpha is still waiting for the send result</Banner>}
        {here && outgoing.denied && <Banner variant="destructive">The phone did not send the message</Banner>}
        {here && outgoing.op.outcome === "Refused" && !outgoing.denied && outgoing.failed > 0 && <Banner variant="destructive">The message did not reach everyone</Banner>}
        {here && sentAll(outgoing) && <p role="status" className="basis-full text-xs text-muted-foreground">{`${delivered(outgoing) ? "Delivered" : "Sent"} to ${title}`}</p>}
        {pictures.map((picture, at) => (
          <Chip key={`${picture.name}-${at}`} onClear={can({ type: "detach" }) ? () => {
            runtime.runSync(Drafts.use((drafts) => drafts.setPictures(pictures.filter((_, other) => other !== at))));
            void send({ type: "detach" });
          } : undefined} clearLabel={`Remove ${picture.name}`}>{picture.name}</Chip>
        ))}
        {(subscriptions.length > 1 || selectedSim !== undefined && subscriptions.length === 1) && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="SIM">
            {subscriptions.map((subscription, at) => {
              const pick = { type: "pickSim", sim: at + 1 } as const;
              const canPick = can(pick);
              const samePosition = state.simInfo.grant === "Granted" && (state.sim === pick.sim || state.sims === 1);
              const picked = selectedSim !== undefined && sameSubscription(subscription, selectedSim);
              return <Button key={subscription.id} size="sm" aria-pressed={picked} variant={picked ? "primary" : "secondary"} disabled={!canPick && !samePosition}
                onClick={() => {
                  if (!canPick && !samePosition) return;
                  selectSim({ thread, subscription });
                  if (canPick) void send(pick);
                }}>{`SIM ${subscription.slot + 1}`}</Button>;
            })}
          </div>
        )}
        {(["SendAccess", "SimAccess"] as const).map((need) => {
          const right = need === "SendAccess" ? "SMS send" : "SIM";
          if (need === "SimAccess" && state.sims <= 1) return null;
          const allow = { type: "allow", need } as const;
          const settings = { type: "goToSettings", need } as const;
          if (can(allow)) return <Button key={need} size="sm" variant="outline" onClick={() => void send(allow)}>{`Allow ${right} access`}</Button>;
          if (can(settings)) return <Button key={need} size="sm" variant="outline" onClick={() => void send(settings)}>{`Open Settings for ${right} access`}</Button>;
          return null;
        })}
        {can(handoff) && <Button size="sm" variant="outline" onClick={() => void send(handoff)}>{pictures.length > 0 ? "Review text in messaging app" : "Review in messaging app"}</Button>}
      </div>
      <CommsBar runtime={runtime} person={person} closed={messageForm} />
    </>
  );
}

/** A typed recipient list or a contact's number opens one exact conversation. */
function Picker({ runtime, messages: { state, can, send } }: MessagesProps & { messages: MessagesUI }) {
  const [typed, setTyped] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!state) return null;
  const held = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const find = (text: string) => {
    setTyped(text);
    runtime.runSync(Inbox.use((inbox) => inbox.set({ typed: text.split(",").at(-1)?.trim() ?? "" })));
    if (can({ type: "findChoices" })) void send({ type: "findChoices" });
  };
  const open = (addresses: ReadonlyArray<string>, typedIn: boolean) => {
    clearChoice(runtime);
    const thread = runtime.runSync(Conversations.use((numbering) => numbering.of({ id: "", addresses })));
    const event = { type: state.offeredPicture > 0 ? "choosePictureRecipient" : "choose", thread, typed: typedIn } as const;
    if (can(event)) void send(event);
  };
  const offer = state.offeredPicture > 0 ? runtime.runSync(Drafts.use((drafts) => drafts.offeredPicture())) : undefined;
  const to = typed.split(",").map((part) => part.trim());
  const parsed = to.map((part) => /^\+?[\d\s().-]+$/u.test(part) && part.replace(/\D/gu, "").length >= 3 ? normalizePhoneNumber(part) : null);
  const numbers = parsed.length <= MMS_MAX_RECIPIENTS && parsed.every((number) => number !== null) ? [...new Set(parsed)] : [];
  const allow = { type: "allow", need: "ContactsAccess" } as const;
  const settings = { type: "goToSettings", need: "ContactsAccess" } as const;
  return (
    <>
      <header data-alpha-navigation-header className={`${header} pr-4 pb-2`}>
        {can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "back" })}><ChevronLeft /></Button>}
        <form className="min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); if (numbers.length > 0) open(numbers, true); }}>
          <SearchField ref={input} aria-label="To" placeholder="To" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={230}
            data-alpha-messages-recipients value={typed} onValueChange={find} />
        </form>
        <Button variant="ghost" size="icon" aria-label="Choose a contact" aria-expanded={browsing} onClick={() => { setBrowsing(!browsing); input.current?.focus(); }}><Plus /></Button>
      </header>
      {offer?.ticket === state.offeredPicture && (
        <div aria-label="Picture for this message" className="flex px-5 py-2">
          <Chip clearLabel={`Remove ${offer.picture.name}`} onClear={() => void send({ type: "clearPictureOffer", ticket: offer.ticket })}>
            <PictureIcon aria-hidden />{offer.picture.name}
          </Chip>
        </div>
      )}
      <div data-alpha-messages-picks className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-2">
        {numbers.length > 0 && <div className="px-5 py-1"><Button variant="outline" onClick={() => open(numbers, true)}>{numbers.length === 1 ? `Text ${numbers[0]}` : `Text ${numbers.length} recipients`}</Button></div>}
        {can(allow) && <div className="px-5 py-2"><Button variant="outline" onClick={() => void send(allow)}>Allow Contacts access</Button></div>}
        {can(settings) && <div className="px-5 py-2"><Button variant="outline" onClick={() => void send(settings)}>Open Settings for Contacts access</Button></div>}
        {state.picker.status === "Loading" && <div className="px-5"><Spinner label="Checking Contacts" /></div>}
        {state.picker.status === "Failed" && can({ type: "findChoices" }) && <div className="px-5"><Banner variant="destructive" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "findChoices" })}>Retry</Button>}>Contacts could not be read</Banner></div>}
        {state.choices > 0 && (
          <ul aria-label="Contacts" data-alpha-messages-contact-picker={browsing || undefined}>
            {held.choices.flatMap((contact) => contact.phones.map((phone) => (
              <li key={`${contact.id}:${phone}`}>
                <button type="button" className={contactRow} aria-label={contact.name} aria-description={phone} onClick={() => {
                  if (to.length === 1) { open([phone], false); return; }
                  find([...to.slice(0, -1), phone].join(", "));
                }}>
                  <Avatar name={contact.name} aria-hidden className="size-11 text-base" />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{contact.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{phone}</span>
                </button>
              </li>
            )))}
          </ul>
        )}
        {can({ type: "loadMoreChoices" }) && <div className="px-5 py-2"><Button variant="outline" size="sm" onClick={() => void send({ type: "loadMoreChoices" })}>More contacts</Button></div>}
      </div>
      <CommsBar runtime={runtime} />
    </>
  );
}
