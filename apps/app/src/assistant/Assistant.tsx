// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/reply.md, "Story: Hear a brief acknowledgment and still get the whole answer"
import {
  Alert, Button, AssistantCard, AssistantChatHistorySheet, AssistantConversation, AssistantGrabber, AssistantSearchSheet, ConfirmDialog,
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
import type { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { type Machine as ShellMachine, showing } from "../../gen/app__shell.effect.vibe";
import type { Machine as LayersMachine } from "../../gen/app__shell__layers.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { MailQuestions } from "../inbox/mail-context.vibe";
import { useInEmail as handToEmail, type Offers } from "../inbox/suggestion.vibe";
import type { Machine as InboxList } from "../../gen/app__inbox.effect.vibe";
import { useMachine as useInboxList } from "../../gen/app__inbox.react.ts";
import type { Machine as InboxSuggestions } from "../../gen/app__inbox__suggestion.effect.vibe";
import type { Machine as InboxWriting } from "../../gen/app__inbox__drafts.effect.vibe";
import { useMachine as useInboxWriting } from "../../gen/app__inbox__drafts.react.ts";
import { home } from "../shell/shell.vibe";
import { isCommsView } from "../shell/views.tsx";
import { type Attachment, removeAttachment } from "./attachments.vibe";
import { MediaReview } from "./media-review.vibe";
import { askComms, freedom } from "./assistant.vibe";
import { Talk } from "./talk.vibe";
import { CommsTarget, type CommsTargetServices } from "../phone/CommsTarget.tsx";

export interface AssistantProps {
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | ChatsMachine | ComposerMachine | SearchMachine | ReplyMachine | DockMachine | ShellMachine | LayersMachine | CommsMachine | CommsTargetServices | Talk | MailQuestions | InboxList | InboxWriting | InboxSuggestions | Offers | MediaReview, unknown>;
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

function chip(file: Pick<Attachment, "id" | "name" | "mimeType">): AssistantAttachment {
  return { id: file.id, kind: file.mimeType.startsWith("image/") ? "image" : "file", name: file.name };
}

function waiting(writing: Writing, files: readonly Attachment[]): AssistantAttachment[] {
  const { editor } = writing;
  return [
    ...files.slice(0, editor.files).map(chip),
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

const barHeight = 102;

/** @model spec/app/assistant/index.md */
export function Assistant({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime);
  const chats = useChats(runtime);
  const composer = useComposer(runtime);
  const search = useSearch(runtime);
  const reply = useReply(runtime);
  const shell = useShell(runtime);
  const dock = useDock(runtime);
  const inbox = useInboxList(runtime);
  const email = useInboxWriting(runtime);
  const comms = useComms(runtime);
  const board = runtime.runSync(Effect.map(Talk, (talk) => talk.board));
  const seen = useSyncExternalStore((listener) => board.subscribe(listener), () => board.snapshot());
  const mail = runtime.runSync(MailQuestions);
  const reviewed = useSyncExternalStore(mail.subscribe, mail.snapshot);
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
  const onComms = isCommsView(shell.state?.trail.at(-1));
  const subject = onComms ? comms.state?.key : undefined;
  const request = subject === undefined ? "" : (comms.state?.requests.find((draft) => draft.about === subject)?.request ?? "");
  const sendable = subject !== undefined
    ? request.trim() !== "" && request.length <= textLimit && askable(talking) && (!newChat || chats.can(start))
    : newChat ? (writing.editor.text || writing.editor.files > 0) && !writing.long && chats.can(start) && askable(talking) : composer.can(hold);
  const status = turnOf(talking, seen.label);
  const notice = noticeOf(writing);
  const check = { type: "checkForReply" } as const;
  const checkable = conversation.can(check) && (talking.turn.send.outcome === "Unknown" || talking.turn.reply === "Stopped" || talking.check === "LookLater" || writing.unsettled);
  const settledLine = (id: string) => !id.startsWith("sent ") && !inFlight(talking.turn) && !pending(talking);

  const type = (text: string) => {
    if (subject !== undefined) {
      void comms.send({ type: "requestTyped", about: subject, request: text }, "Owner");
      return;
    }
    board.type(text);
    void composer.send({ type: "edit", blank: text.trim() === "", long: text.length > textLimit });
  };
  const attachMail = () => {
    const question = mail.snapshot().question;
    const offer = { type: "offer", kind: "Mail", revision: writing.offeredAt + 1 } as const;
    if (!question || !composer.can(offer)) return;
    void composer.send(offer).then((outcome) => {
      if (outcome._tag !== "Success" || mail.snapshot().question !== question) return;
      mail.attach(question);
      if (!board.snapshot().typed.trim()) type("Summarize this email");
      composerRef.current?.focus();
    });
  };
  const send = () => {
    if (subject !== undefined) {
      void runtime.runPromise(askComms({ about: subject, text: request }));
      return;
    }
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
    const account = inbox.state?.selected.account ?? 0;
    const canOfferMail = settled && !line.mine && line.text.trim() !== "" && (email.state?.open || account !== 0);
    return {
      id: line.id,
      author: line.mine ? "owner" : "alpha",
      text: line.text,
      ...(line.files === undefined ? {} : { attachments: line.files.map(chip) }),
      ...(line.quote === undefined ? {} : { quote: line.quote }),
      ...(line.failure === undefined ? {} : { children: failureCard({ kind: line.failure, fix: "NoFix", waitMs: -1 }, false) }),
      onFork: settled && chats.can(fork) ? () => void chats.send(fork) : undefined,
      onQuote: composer.can(quote) ? () => void composer.send(quote) : undefined,
      onEditAgain: composer.can(editAgain) ? () => { board.type(line.text); void composer.send(editAgain); } : undefined,
      onReadAloud: message > 0 && chats.can(readAloud) ? () => void chats.send(readAloud) : undefined,
      onUseInEmail: canOfferMail ? () => void runtime.runPromise(handToEmail(line.text, "Ask Alpha", { target: "NewEmail", account, message: 0 })) : undefined,
    };
  });
  // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing"
  const earlier = { type: "scroll", around: board.numbered(lines[0]?.id ?? "") } as const;
  const later = { type: "scroll", around: board.numbered(lines.at(-1)?.id ?? "") } as const;
  const writingReply = seen.reply !== "" ? [{ id: "reply", author: "alpha", text: seen.reply } as const] : [];
  // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"; spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
  const mediaCards = seen.media.filter((card) => !talking.context.sensitive && card.conversation === shown.chosen && card.revision === talking.context.revision).map((card) => ({
    id: `media ${card.id}`, author: "alpha" as const, text: "", children: (
      <div className="grid gap-2">
        <AssistantCard card={{ kind: "decision", variant: "proposal", title: card.title, detail: card.detail, action: "Approve" }}
          onHandOn={() => void runtime.runPromise(Effect.flatMap(MediaReview, (review) => review.decide(card, true)))} />
        <Button className="justify-self-end" variant="ghost" onClick={() => void runtime.runPromise(Effect.flatMap(MediaReview, (review) => review.decide(card, false)))}>Decline</Button>
      </div>
    ),
  }));
  const mediaNote = seen.mediaNote === "" ? [] : [{ id: "media result", author: "alpha" as const, text: seen.mediaNote }];
  const failed = seen.failure === undefined ? [] : [{ id: "failure", author: "alpha", text: "", children: failureCard(seen.failure, true) } as const];
  const quoteId = writing.editor.quote > 0 ? board.messageId(writing.editor.quote) : undefined;
  const quoted = quoteId === undefined ? undefined : lines.find((line) => line.id === quoteId)?.text;
  const view = talking.context.showing.tag === "App" ? talking.context.showing.view : "Home";
  const assistantDetent = shell.state?.assistant ?? "Bar";
  const open = dockOpen(assistantDetent);
  const full = assistantDetent === "Full";
  const keptHeight = assistantDetent === "Sheet" && dock.state && dock.state.kept > 0 ? dock.state.kept : undefined;
  const openWithFocus = (focusField: boolean) => {
    for (const ask of dockFocused(assistantDetent)) {
      if (ask.tag === "Raise" && shell.can({ type: "raise", detent: ask.detent })) void shell.send({ type: "raise", detent: ask.detent });
    }
    if (focusField) composerRef.current?.focus();
  };
  const grabber = shell.state ? (
    <AssistantGrabber
      variant={open ? "handle" : "mark"}
      onPress={() => { void dock.send({ type: "press", detent: assistantDetent, now: untimed }); }}
      onDrag={() => { void dock.send({ type: "drag" }); }}
      onRelease={({ direction, flick, y }) => {
        const height = Math.max(0, Math.round(window.innerHeight - y));
        void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: barHeight, full: window.innerHeight, now: untimed });
      }}
      onLift={() => {
        void dock.send({ type: "lift", now: untimed });
        if (!open) composerRef.current?.focus();
      }}
      onCancel={() => { void dock.send({ type: "shift", now: untimed }); }}
      onTap={({ keyboard }) => {
        void dock.send({ type: "click", now: untimed });
        if (!open && keyboard) composerRef.current?.focus();
      }}
    />
  ) : undefined;

  return (
    <>
      {onComms && full && <CommsTarget runtime={runtime} placement="strip" />}
      {(!onComms || open) && <AssistantConversation
        detent={assistantDetent === "Full" ? "full" : assistantDetent === "Sheet" ? "sheet" : "bar"}
        className={onComms ? "relative w-full motion-safe:transition-[height] motion-safe:duration-[420ms]" : open ? "fixed inset-x-0 bottom-0 mx-auto max-w-md" : "sticky bottom-0"}
        style={onComms
          ? { height: assistantDetent === "Full" ? "calc(100dvh - 52px)" : `clamp(38dvh, ${keptHeight === undefined ? "50dvh" : `${keptHeight}px`}, 60dvh)` }
          : keptHeight ? { height: keptHeight } : undefined}
        header={{
          title: seen.titles.get(shown.chosen) ?? "Ask Alpha",
          context: { view, selected: talking.context.selected, sensitive: talking.context.sensitive },
          onHome: () => void runtime.runPromise(home()),
          onClose: open && shell.can({ type: "goBack" }) ? () => void shell.send({ type: "goBack" }) : undefined,
          expanded: assistantDetent === "Full",
          onResize: assistantDetent === "Full"
            ? () => void shell.send({ type: "goBack" })
            : shell.can({ type: "raise", detent: "Full" }) ? () => void shell.send({ type: "raise", detent: "Full" }) : undefined,
          grabber: open ? grabber : undefined,
        }}
        transcript={{
          messages: [...messages, ...writingReply, ...failed, ...mediaCards, ...mediaNote],
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
          value: subject === undefined ? seen.typed : request,
          onValueChange: type,
          placeholder: onComms ? "Ask Alpha" : undefined,
          leading: onComms ? <CommsTarget runtime={runtime} placement="composer" /> : undefined,
          closed: subject === undefined && !composer.can({ type: "edit", blank: false, long: false }),
          notice: notice === undefined || onComms ? undefined : {
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
          attachments: onComms ? undefined : waiting(writing, seen.files),
          quote: onComms ? undefined : quoted,
          editing: !onComms && writing.editor.editing > 0,
          opener: !open ? grabber : undefined,
          onOpen: !open && !grabber ? () => openWithFocus(true) : undefined,
          onSend: sendable && !inFlight(talking.turn) ? send : undefined,
          onStop: conversation.can({ type: "stop" }) ? () => void conversation.send({ type: "stop" }) : undefined,
          stopping: talking.turn.stopping,
          onFocusField: () => openWithFocus(false),
          onHistory: () => {
            void chats.send({ type: "browse" });
            setListing(true);
          },
          onSearch: search.can({ type: "openSearch" }) ? () => { void chats.send({ type: "browse" }); void search.send({ type: "openSearch" }); } : undefined,
          onNew: chats.can(start) ? () => void chats.send(start) : undefined,
          making: making(shown),
          onClick: !open ? (event) => {
            if (event.target instanceof Element && event.target.closest("button, textarea")) return;
            openWithFocus(true);
          } : undefined,
          onRemoveAttachment: (id) => {
            if (id === "question") void composer.send({ type: "removeQuestion" });
            else if (id === "mail" || id === "transcript" || id === "shown") {
              if (id === "mail") mail.clear();
              void composer.send({ type: "detach", kind: detached[id] });
            } else void runtime.runPromise(removeAttachment(id));
          },
          onUnquote: composer.can({ type: "unquote" }) ? () => void composer.send({ type: "unquote" }) : undefined,
        }}
      />}
      <ConfirmDialog
        open={!onComms && open && reviewed.question !== undefined}
        title="Share this email with Alpha?"
        confirmLabel="Add to chat"
        onConfirm={attachMail}
        onCancel={() => mail.show({})}
      >
        {reviewed.question ? (
          <span className="block max-h-72 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
            {reviewed.question.review.source.subject || "(no subject)"}{"\n"}
            {reviewed.question.review.source.from}{"\n"}
            {reviewed.question.review.source.to.join(", ")}{"\n\n"}
            {reviewed.question.review.source.bodyText}
          </span>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={!onComms && open && reviewed.failure !== undefined}
        title={reviewed.failure === "tooLarge" ? "This email is too long to share in full" : "Review this email again before sharing"}
        confirmLabel="OK"
        onConfirm={() => mail.show({})}
        onCancel={() => mail.show({})}
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
