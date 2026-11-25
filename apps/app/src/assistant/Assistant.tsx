// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/reply.md, "Story: Hear a brief acknowledgment and still get the whole answer"
import {
  Alert, AssistantCard, Button, AssistantChatHistorySheet, AssistantConversation, AssistantGrabber, AssistantPhotoPreview, AssistantSearchSheet, ConfirmDialog,
  type AssistantAttachment, type AssistantComposerProps, type AssistantDraftNoticeProps, type AssistantTurnNoteProps,
} from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Conversation as Talking, Machine as ConversationMachine } from "../../gen/app__assistant.effect.vibe";
import { askable, inFlight, pending } from "../../gen/app__assistant.ts";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import type { Machine as AttachmentMachine } from "../../gen/app__assistant__attachments.effect.vibe";
import { useMachine as useAttachments } from "../../gen/app__assistant__attachments.react.ts";
import type { Machine as ChatsMachine } from "../../gen/app__assistant__chats.effect.vibe";
import { making, unsure } from "../../gen/app__assistant__chats.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import type { Composer as Writing, Machine as ComposerMachine } from "../../gen/app__assistant__composer.effect.vibe";
import { content, textLimit } from "../../gen/app__assistant__composer.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import type { Machine as DockMachine } from "../../gen/app__assistant__dock.effect.vibe";
import { focused as dockFocused, isOpen as dockOpen } from "../../gen/app__assistant__dock.ts";
import { useMachine as useDock } from "../../gen/app__assistant__dock.react.ts";
import type { Machine as ReplyMachine } from "../../gen/app__assistant__reply.effect.vibe";
import { useMachine as useReply } from "../../gen/app__assistant__reply.react.ts";
import type { Machine as SearchMachine } from "../../gen/app__assistant__search.effect.vibe";
import { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import type { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { Machine as ShellMachine, showing } from "../../gen/app__shell.effect.vibe";
import type { Machine as LayersMachine } from "../../gen/app__shell__layers.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { MailQuestions } from "../inbox/mail-context.vibe";
import { home } from "../shell/shell.vibe";
import { isCommsView } from "../shell/views.tsx";
import { MediaReview } from "./media-review.vibe";
import { askComms, freedom } from "./assistant.vibe";
import { acceptedFiles, insertFiles, previewFile, removeFile, sameBinding } from "./attachments.vibe";
import { chip, type MessageActions, useMessageRows } from "./history.tsx";
import { ReplyFailure } from "./ReplyFailure.tsx";
import { type Attached, type Line, Talk } from "./talk.vibe";
import { CommsTarget, type CommsTargetServices } from "../phone/CommsTarget.tsx";

export interface AssistantProps {
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | AttachmentMachine | ChatsMachine | ComposerMachine | SearchMachine | ReplyMachine | DockMachine | ShellMachine | CommsMachine | CommsTargetServices | Talk | MailQuestions | LayersMachine | MediaReview, unknown>;
  messageActions?: MessageActions;
  speech?: Pick<AssistantComposerProps, "onTalk" | "onDictate" | "voice" | "voiceNotice">;
  canReadAloud?: boolean;
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

function waiting(writing: Writing, files: readonly Attached[]): AssistantAttachment[] {
  const { editor } = writing;
  return [
    ...files.slice(0, editor.files).map(chip),
    ...(editor.mail ? [{ id: "mail", kind: "mail", name: "Mail" } as const] : []),
    ...(editor.transcript ? [{ id: "transcript", kind: "transcript", name: "Transcript" } as const] : []),
    ...(editor.shown ? [{ id: "shown", kind: "image", name: "Photo" } as const] : []),
    ...(editor.question ? [{ id: "question", kind: "transcript", name: "Question" } as const] : []),
  ];
}

const detached = { mail: "Mail", transcript: "Transcript", shown: "Shown" } as const;

const barHeight = 102;
const emptyLines: readonly Line[] = [];
const settings = { type: "openView", view: "Settings" } as const;
const back = { type: "goBack" } as const;

/** @model spec/app/assistant/index.md */
export function Assistant({ runtime, messageActions, speech, canReadAloud = false }: AssistantProps) {
  const conversation = useConversation(runtime);
  const attachments = useAttachments(runtime);
  const chats = useChats(runtime);
  const composer = useComposer(runtime);
  const search = useSearch(runtime);
  const reply = useReply(runtime);
  const shell = useShell(runtime);
  const dock = useDock(runtime);
  const comms = useComms(runtime);
  const board = useMemo(() => runtime.runSync(Effect.map(Talk, (talk) => talk.board)), [runtime]);
  const boardStore = useMemo(() => ({ subscribe: (listener: () => void) => board.subscribe(listener), snapshot: () => board.snapshot() }), [board]);
  const seen = useSyncExternalStore(boardStore.subscribe, boardStore.snapshot);
  const mail = useMemo(() => runtime.runSync(MailQuestions), [runtime]);
  const reviewed = useSyncExternalStore(mail.subscribe, mail.snapshot);
  const [listing, setListing] = useState(false);
  const [words, setWords] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<{ binding: Writing["binding"]; slot: number } | undefined>(undefined);
  const [talking, shown, writing, finding] = [conversation.state, chats.state, composer.state, search.state];
  const free = talking && shown && writing ? freedom(talking, writing, shown.chosen) : { replying: true, holding: true };
  const lines = !shown || (shown.page.status === "Idle" && shown.chosen === 0) ? emptyLines : seen.pages.get(shown.page.ticket)?.lines ?? emptyLines;
  const canPreview = attachments.can({ type: "preview", attachment: 1 });
  const preview = useCallback((file: Attached) => void runtime.runPromise(previewFile(file)), [runtime]);
  const onSettingsPage = shell.state && showing(shell.state, "Settings") && shell.state.assistant !== "Bar" && shell.can(back);
  const settingsAction = shell.can(settings) ? settings : onSettingsPage ? back : undefined;
  const onSettings = useCallback(() => {
    if (settingsAction) void runtime.runPromiseExit(ShellMachine.use((machine) => machine.send(settingsAction)));
  }, [runtime, settingsAction]);
  const messages = useMessageRows({
    runtime, board, lines, chats: shown, writing, ...free, actions: messageActions, canReadAloud,
    settled: Boolean(talking && !inFlight(talking.turn) && !pending(talking)),
    onSettings: settingsAction ? onSettings : undefined,
    onPreview: canPreview ? preview : undefined,
  });
  if (conversation.cause || chats.cause || composer.cause || reply.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Ask Alpha</Alert>;
  if (!talking || !shown || !writing || !finding) return null;
  const hold = { type: "hold", askable: askable(talking) } as const;
  const start = { type: "start", ...free } as const;
  const newChat = shown.chosen === 0;
  const onComms = isCommsView(shell.state?.trail.at(-1));
  const subject = onComms ? comms.state?.key : undefined;
  const request = subject === undefined ? "" : (comms.state?.requests.find((draft) => draft.about === subject)?.request ?? "");
  const sendable = subject !== undefined
    ? request.trim() !== "" && request.length <= textLimit && askable(talking) && (!newChat || chats.can(start))
    : newChat ? content(writing.editor) && !writing.long && chats.can(start) && askable(talking) : composer.can(hold);
  const status = turnOf(talking, seen.label);
  const notice = noticeOf(writing);
  const check = { type: "checkForReply" } as const;
  const checkable = conversation.can(check) && (talking.turn.send.outcome === "Unknown" || talking.turn.reply === "Stopped" || talking.check === "LookLater" || writing.unsettled);
  const draftFiles = sameBinding(seen.filesBinding, writing.binding) ? seen.files : [];
  const previewed = seen.preview?.ticket === attachments.state?.preview ? seen.preview?.file : undefined;

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
    if (newChat) {
      board.queueSend();
      void chats.send(start);
      return;
    }
    board.hold(seen.typed);
    board.type("");
    void composer.send(hold);
  };
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
  const mediaNote = talking.context.sensitive || seen.mediaNote?.conversation !== shown.chosen
    ? [] : [{ id: "media result", author: "alpha" as const, text: seen.mediaNote.text }];
  const failed = seen.failure === undefined ? [] : [{ id: "failure", author: "alpha", text: "", children: <ReplyFailure {...seen.failure} fix={seen.failure.kind === "OutOfFunds" ? "FundingFix" : seen.failure.fix} live onRetry={() => type(board.lastSent)} onSettings={settingsAction ? onSettings : undefined} /> } as const];
  const quoted = board.line(shown.chosen, writing.editor.quote)?.text;
  const view = talking.context.showing.tag === "App" ? talking.context.showing.view : "Home";
  const assistantDetent = shell.state?.assistant ?? "Bar";
  const open = dockOpen(assistantDetent);
  const compact = view === "Camera" || view === "Photos" || view === "Files";
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
        if (!open && !compact) composerRef.current?.focus();
      }}
      onCancel={() => { void dock.send({ type: "shift", now: untimed }); }}
      onTap={({ keyboard }) => {
        void dock.send({ type: "click", now: untimed });
        if (!open && keyboard && !compact) composerRef.current?.focus();
      }}
    />
  ) : undefined;

  return (
    <>
      {previewed !== undefined && <AssistantPhotoPreview
        open
        name={previewed.name}
        src={`data:${previewed.mimeType};base64,${previewed.data}`}
        onOpenChange={(open) => { if (!open && attachments.can({ type: "closePreview" })) void attachments.send({ type: "closePreview" }); }}
      />}
      <input ref={fileInput} type="file" accept={acceptedFiles} multiple hidden onChange={(event) => {
        const target = fileTarget.current;
        fileTarget.current = undefined;
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        if (target && files.length > 0) void runtime.runPromise(insertFiles(target.binding, target.slot, files));
      }} />
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
        attachmentNotice={onComms ? undefined : seen.attachmentNotice}
        transcript={{
          messages,
          liveMessages: [...writingReply, ...failed, ...mediaCards, ...mediaNote],
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
          ...speech,
          onDictate: onComms || inFlight(talking.turn) || !speech?.onDictate ? undefined : () => {
            openWithFocus(false);
            speech.onDictate?.();
          },
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
          attachments: onComms ? undefined : waiting(writing, draftFiles),
          onPreviewAttachment: !onComms && canPreview ? (id) => {
            const file = draftFiles.find((one) => one.id === id);
            if (file) preview(file);
          } : undefined,
          quote: onComms ? undefined : quoted,
          editing: !onComms && writing.editor.editing > 0,
          opener: !open ? grabber : undefined,
          onOpen: !open && !grabber ? () => openWithFocus(!compact) : undefined,
          onType: compact ? () => openWithFocus(true) : undefined,
          onSend: sendable && !inFlight(talking.turn) ? send : undefined,
          onStop: conversation.can({ type: "stop" }) ? () => void conversation.send({ type: "stop" }) : undefined,
          stopping: talking.turn.stopping,
          onAttach: !onComms && composer.can({ type: "attach", count: 1 }) ? () => {
            fileTarget.current = { binding: writing.binding, slot: writing.read.ticket };
            openWithFocus(false);
            fileInput.current?.click();
          } : undefined,
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
            } else void runtime.runPromise(removeFile(id));
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
