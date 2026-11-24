// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/reply.md, "Story: Hear a brief acknowledgment and still get the whole answer"
import {
  Alert, AssistantCard, AssistantChatHistorySheet, AssistantConversation, AssistantGrabber, AssistantSearchSheet,
  type AssistantAttachment, type AssistantDraftNoticeProps, type AssistantMessageProps, type AssistantTurnNoteProps,
} from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Conversation as Talking, Machine as ConversationMachine } from "../../gen/app__assistant.effect.vibe";
import { askable, inFlight, pending } from "../../gen/app__assistant.ts";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import type { Machine as ChatsMachine } from "../../gen/app__assistant__chats.effect.vibe";
import { making, unsure } from "../../gen/app__assistant__chats.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import type { Composer as Writing, Machine as ComposerMachine } from "../../gen/app__assistant__composer.effect.vibe";
import { textLimit } from "../../gen/app__assistant__composer.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import type { Machine as DockMachine } from "../../gen/app__assistant__dock.effect.vibe";
import { focused as dockFocused, isOpen as dockOpen } from "../../gen/app__assistant__dock.ts";
import { useMachine as useDock } from "../../gen/app__assistant__dock.react.ts";
import type { Failure, Fix, Machine as ReplyMachine } from "../../gen/app__assistant__reply.effect.vibe";
import { fixShown, managesPlan, showsWait, waitSeconds } from "../../gen/app__assistant__reply.ts";
import { useMachine as useReply } from "../../gen/app__assistant__reply.react.ts";
import type { Machine as SearchMachine } from "../../gen/app__assistant__search.effect.vibe";
import { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import { type Machine as ShellMachine, showing } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { freedom } from "./assistant.vibe";
import { Talk } from "./talk.vibe";

export interface AssistantProps {
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | ChatsMachine | ComposerMachine | SearchMachine | ReplyMachine | DockMachine | ShellMachine | Talk, unknown>;
}

function turnOf(talking: Talking, label: string): AssistantTurnNoteProps["status"] | undefined {
  const { turn, check } = talking;
  if (turn.stopping) return "stopping";
  if (check === "Aborting" || talking.recheck.status === "Loading") return "checking";
  if (check === "Finished") return "finished";
  if (check === "StoppedForSure") return "stopped";
  if (check === "NotRecorded") return "neverArrived";
  if (check === "LookLater") return "lookLater";
  if (turn.send.outcome === "Recorded" || turn.send.outcome === "Sent") return "sending";
  if (turn.reply === "Streaming") return label === "" ? undefined : "replying";
  if (turn.reply === "Broken") return "cutOff";
  if (turn.reply === "Stopped") return "stopped";
  if (turn.send.outcome === "Unknown") return "unknown";
  return undefined;
}

function noticeOf(writing: Writing): AssistantDraftNoticeProps["status"] | undefined {
  if (writing.read.status === "Loading") return "opening";
  if (writing.slot === "Damaged") return "damaged";
  if (writing.slot === "Unreadable") return "unreadable";
  if (writing.unsettled) return "review";
  if (writing.draft.sync === "Conflicted") return "conflict";
  if (writing.failing) return "failed";
  if (writing.long) return "long";
  return undefined;
}

function waiting(writing: Writing): AssistantAttachment[] {
  const { editor } = writing;
  return [
    ...Array.from({ length: editor.files }, (_, at): AssistantAttachment => ({ id: `file ${at + 1}`, kind: "file", name: `File ${at + 1}` })),
    ...(editor.mail ? [{ id: "mail", kind: "mail", name: "Mail" } as const] : []),
    ...(editor.transcript ? [{ id: "transcript", kind: "transcript", name: "Transcript" } as const] : []),
    ...(editor.shown ? [{ id: "shown", kind: "image", name: "Photo" } as const] : []),
    ...(editor.question ? [{ id: "question", kind: "transcript", name: "Question" } as const] : []),
  ];
}

const failures: Record<Failure, string> = {
  CredentialInvalid: "Your provider refused its key", InsufficientCredits: "Out of credits", LimitReached: "Too many requests",
  ProviderIssue: "The provider had a problem", TimedOut: "The reply timed out", MissingCapability: "Your agent cannot do that yet",
  NoProvider: "No AI provider", PlanLimit: "Your plan's limit is reached",
  OutOfFunds: "You’re out of plan allowance and credits, so I couldn’t reply.", OtherFailure: "The reply did not finish",
};

function about(waitMs: number): string {
  const seconds = waitSeconds(waitMs);
  if (seconds < 90) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
}

function actionOf(kind: Failure, fix: Fix): "signIn" | "funding" | "retry" | undefined {
  if (fix === "SignInFix") return "signIn";
  if (fix === "FundingFix" || (fix === "NoFix" && managesPlan(kind))) return "funding";
  if (fix === "RetryFix") return "retry";
  return undefined;
}

const detached = { mail: "Mail", transcript: "Transcript", shown: "Shown" } as const;

const barHeight = 80;

/** @model spec/app/assistant/index.md */
export function Assistant({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime);
  const chats = useChats(runtime);
  const composer = useComposer(runtime);
  const search = useSearch(runtime);
  const reply = useReply(runtime);
  const shell = useShell(runtime);
  const dock = useDock(runtime);
  const board = runtime.runSync(Effect.map(Talk, (talk) => talk.board));
  const seen = useSyncExternalStore((listener) => board.subscribe(listener), () => board.snapshot());
  const [listing, setListing] = useState(false);
  const [words, setWords] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  if (conversation.cause || chats.cause || composer.cause || reply.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Ask Alpha</Alert>;
  const [talking, shown, writing, finding] = [conversation.state, chats.state, composer.state, search.state];
  if (!talking || !shown || !writing || !finding) return null;
  const free = freedom(talking, writing, shown.chosen);
  const lines = shown.page.status === "Idle" && shown.chosen === 0 ? [] : board.page(shown.page.ticket);
  const hold = { type: "hold", askable: askable(talking) } as const;
  const start = { type: "start", ...free } as const;
  const newChat = shown.chosen === 0;
  const sendable = newChat ? writing.editor.text && !writing.long && chats.can(start) && askable(talking) : composer.can(hold);
  const status = turnOf(talking, seen.label);
  const notice = noticeOf(writing);
  const check = { type: "checkForReply" } as const;
  const checkable = conversation.can(check) && (talking.turn.send.outcome === "Unknown" || talking.turn.reply === "Stopped" || talking.check === "LookLater" || writing.unsettled);
  const settledLine = (id: string) => !id.startsWith("sent ") && !inFlight(talking.turn) && !pending(talking);

  const type = (text: string) => {
    board.type(text);
    void composer.send({ type: "edit", blank: text.trim() === "", long: text.length > textLimit });
  };
  const send = () => {
    const talk = runtime.runSync(Effect.map(Talk, (t) => t.board));
    if (newChat) {
      talk.sendWhenMade = true;
      void chats.send(start);
      return;
    }
    talk.outgoing = seen.typed;
    talk.type("");
    void composer.send(hold);
  };
  // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"
  /** The card of a reply that did not finish: live, with the fix the agent named and its wait, or read again from history, with neither. */
  const failureCard = ({ kind, fix, waitMs }: { kind: Failure; fix: Fix; waitMs: number }, live: boolean) => {
    const act = actionOf(kind, fix);
    const detail = showsWait(kind, waitMs) ? `Try again in about ${about(waitMs)}` : !live && kind === "LimitReached" ? "Wait a moment, then try again" : undefined;
    const openSettings = shell.can({ type: "openView", view: "Settings" })
      ? () => void shell.send({ type: "openView", view: "Settings" })
      : shell.state && showing(shell.state, "Settings")
        ? () => { if (shell.can({ type: "raise", detent: "Bar" })) void shell.send({ type: "raise", detent: "Bar" }); }
        : undefined;
    return (
      <AssistantCard
        card={act === undefined || !fixShown(fix, kind)
          ? { kind: "plain", text: detail === undefined ? failures[kind] : `${failures[kind]}. ${detail}` }
          : { kind: "action", action: act, title: failures[kind], ...(detail === undefined ? {} : { detail }), ...(act === "funding" ? { label: "Manage plan" } : {}) }}
        onAct={act === "retry" ? () => type(board.lastSent) : act !== undefined ? openSettings : undefined}
      />
    );
  };
  const messages = lines.map((line): AssistantMessageProps & { id: string } => {
    const message = board.numbered(line.id);
    const settled = message > 0 && settledLine(line.id);
    const fork = { type: "fork", message, ...free } as const;
    const quote = { type: "quote", message, recorded: settled } as const;
    const editAgain = { type: "editAgain", message, mine: line.mine, recorded: settled } as const;
    const readAloud = { type: "readAloud", message, mine: line.mine } as const;
    return {
      id: line.id,
      author: line.mine ? "owner" : "alpha",
      text: line.text,
      ...(line.quote === undefined ? {} : { quote: line.quote }),
      ...(line.failure === undefined ? {} : { children: failureCard({ kind: line.failure, fix: "NoFix", waitMs: -1 }, false) }),
      onFork: settled && chats.can(fork) ? () => void chats.send(fork) : undefined,
      onQuote: composer.can(quote) ? () => void composer.send(quote) : undefined,
      onEditAgain: composer.can(editAgain) ? () => { board.type(line.text); void composer.send(editAgain); } : undefined,
      onReadAloud: message > 0 && chats.can(readAloud) ? () => void chats.send(readAloud) : undefined,
    };
  });
  // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing"
  const earlier = { type: "scroll", around: board.numbered(lines[0]?.id ?? "") } as const;
  const later = { type: "scroll", around: board.numbered(lines.at(-1)?.id ?? "") } as const;
  const writingReply = seen.reply !== "" ? [{ id: "reply", author: "alpha", text: seen.reply } as const] : [];
  // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"; spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
  const failed = seen.failure === undefined ? [] : [{ id: "failure", author: "alpha", text: "", children: failureCard(seen.failure, true) } as const];
  const quoteId = writing.editor.quote > 0 ? board.messageId(writing.editor.quote) : undefined;
  const quoted = quoteId === undefined ? undefined : lines.find((line) => line.id === quoteId)?.text;
  const view = talking.context.showing.tag === "App" ? talking.context.showing.view : "Home";
  const assistantDetent = shell.state?.assistant ?? "Bar";
  const open = dockOpen(assistantDetent);
  const keptHeight = assistantDetent === "Sheet" && dock.state && dock.state.kept > 0 ? dock.state.kept : undefined;
  const openWithFocus = (focusField: boolean) => {
    for (const ask of dockFocused(assistantDetent)) {
      if (ask.tag === "Raise" && shell.can({ type: "raise", detent: ask.detent })) void shell.send({ type: "raise", detent: ask.detent });
    }
    if (focusField) composerRef.current?.focus();
  };

  return (
    <>
      <AssistantConversation
        detent={assistantDetent === "Full" ? "full" : assistantDetent === "Sheet" ? "sheet" : "bar"}
        className={open ? "fixed inset-x-0 bottom-0 mx-auto max-w-md" : "sticky bottom-0"}
        style={keptHeight ? { height: keptHeight } : undefined}
        header={{
          title: seen.titles.get(shown.chosen) ?? "Ask Alpha",
          context: { view, selected: talking.context.selected, sensitive: talking.context.sensitive },
          onHistory: () => {
            void chats.send({ type: "browse" });
            setListing(true);
          },
          onSearch: search.can({ type: "openSearch" }) ? () => { void chats.send({ type: "browse" }); void search.send({ type: "openSearch" }); } : undefined,
          onNew: chats.can(start) ? () => void chats.send(start) : undefined,
          onClose: open && shell.can({ type: "goBack" }) ? () => void shell.send({ type: "goBack" }) : undefined,
          making: making(shown),
          grabber: shell.state ? (
            <AssistantGrabber
              onPress={() => {
                void dock.send({ type: "press", detent: assistantDetent, now: untimed });
              }}
              onDrag={() => { void dock.send({ type: "drag" }); }}
              onRelease={({ direction, flick, y }) => {
                void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height: Math.max(0, Math.round(window.innerHeight - y)), floor: barHeight, full: window.innerHeight, now: untimed });
              }}
              onLift={() => {
                void dock.send({ type: "lift", now: untimed });
                if (!open) composerRef.current?.focus();
              }}
              onCancel={() => { void dock.send({ type: "shift", now: untimed }); }}
              onTap={() => {
                void dock.send({ type: "click", now: untimed });
                if (!open) composerRef.current?.focus();
              }}
            />
          ) : undefined,
        }}
        transcript={{
          messages: [...messages, ...writingReply, ...failed],
          position: { page: `${shown.chosen}/${shown.page.ticket}`, around: board.messageId(shown.around) },
          visible: open,
          status: shown.page.status === "Loading" ? "loading" : shown.page.status === "Failed" ? "failed" : "loaded",
          turn: status === undefined ? undefined : { status, label: seen.label === "" ? undefined : seen.label, onCheck: checkable ? () => void conversation.send(check) : undefined },
          onRetry: chats.can({ type: "reread" }) ? () => void chats.send({ type: "reread" }) : undefined,
          onEarlier: chats.can(earlier) ? () => void chats.send(earlier) : undefined,
          onLater: chats.can(later) ? () => void chats.send(later) : undefined,
          onReturnToOriginal: chats.can({ type: "returnToOriginal", ...free }) ? () => void chats.send({ type: "returnToOriginal", ...free }) : undefined,
        }}
        composer={{
          fieldRef: composerRef,
          value: seen.typed,
          onValueChange: type,
          closed: !composer.can({ type: "edit", blank: false, long: false }),
          notice: notice === undefined ? undefined : {
            status: notice,
            saved: seen.saved,
            onRetry: composer.can({ type: "retry" }) ? () => void composer.send({ type: "retry" }) : undefined,
            onRecover: composer.can({ type: "recover" }) ? () => void composer.send({ type: "recover" }) : undefined,
            onReopen: composer.can({ type: "open" }) ? () => void composer.send({ type: "open" }) : undefined,
            onRestoreSaved: composer.can({ type: "restoreSaved" }) ? () => {
              board.type(writing.unsettled || seen.typed === "" ? seen.saved : `${seen.saved}\n${seen.typed}`);
              void composer.send({ type: "restoreSaved" });
            } : undefined,
            onKeepCurrent: composer.can({ type: "replaceSaved" }) ? () => void composer.send({ type: "replaceSaved" }) : undefined,
            onCheck: writing.unsettled && conversation.can(check) ? () => void conversation.send(check) : undefined,
          },
          unavailable: !talking.ready ? "away" : talking.context.sensitive ? "sensitive" : undefined,
          attachments: waiting(writing),
          quote: quoted,
          editing: writing.editor.editing > 0,
          onOpen: !open ? () => openWithFocus(true) : undefined,
          onSend: sendable && !inFlight(talking.turn) ? send : undefined,
          onStop: conversation.can({ type: "stop" }) ? () => void conversation.send({ type: "stop" }) : undefined,
          stopping: talking.turn.stopping,
          onFocusField: () => openWithFocus(false),
          onClick: !open ? (event) => {
            if (event.target instanceof Element && event.target.closest("button, textarea")) return;
            openWithFocus(true);
          } : undefined,
          onRemoveAttachment: (id) => {
            if (id === "question") void composer.send({ type: "removeQuestion" });
            else if (id.startsWith("file ")) void composer.send({ type: "removeFile" });
            else if (id === "mail" || id === "transcript" || id === "shown") void composer.send({ type: "detach", kind: detached[id] });
          },
          onUnquote: composer.can({ type: "unquote" }) ? () => void composer.send({ type: "unquote" }) : undefined,
        }}
      />
      <AssistantChatHistorySheet
        open={listing}
        onOpenChange={setListing}
        history={{
          chats: shown.ids.map((id) => ({ id: String(id), title: seen.titles.get(id) ?? "Ask Alpha", current: id === shown.chosen })),
          status: shown.list.status === "Loading" ? "loading" : shown.list.status === "Failed" ? "failed" : "loaded",
          blocked: free.replying || free.holding,
          making: making(shown),
          unsure: unsure(shown),
          onChoose: (id) => {
            const choose = { type: "choose", conversation: Number(id), ...free } as const;
            if (!chats.can(choose)) return;
            void chats.send(choose);
            setListing(false);
          },
          onStart: chats.can(start) ? () => { void chats.send(start); setListing(false); } : undefined,
          onRetry: () => void chats.send({ type: "browse" }),
        }}
      />
      <AssistantSearchSheet
        open={finding.open}
        onOpenChange={(open) => { if (!open && search.can({ type: "closeSearch" })) void search.send({ type: "closeSearch" }); }}
        search={{
          words,
          hits: seen.hits.slice(0, finding.shown).map((hit, at) => ({ id: String(at + 1), chat: seen.titles.get(hit.conversation) ?? "Ask Alpha", snippet: hit.text })),
          status: finding.hits.status === "Idle" ? "idle" : finding.hits.status === "Loading" ? "loading" : finding.hits.status === "Failed" ? "failed" : "loaded",
          blocked: free.replying || free.holding,
          onWordsChange: (typed) => {
            setWords(typed);
            const find = { type: "find", words: typed.trim() } as const;
            if (search.can(find)) void search.send(find);
          },
          onMore: search.can({ type: "more" }) ? () => void search.send({ type: "more" }) : undefined,
          onOpenHit: (id) => {
            const hit = seen.hits[Number(id) - 1];
            if (hit === undefined) return;
            const open = { type: "openHit", hit: Number(id), conversation: hit.conversation, message: hit.message, here: hit.conversation === shown.chosen, ...free } as const;
            if (search.can(open)) void search.send(open);
          },
        }}
      />
    </>
  );
}
