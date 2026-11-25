// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/reply.md, "Story: Hear a brief acknowledgment and still get the whole answer"; spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import {
  Alert, AssistantCard, AssistantCardFrame, Button, AssistantConversation, AssistantGrabber, AssistantPhotoPreview, ConfirmDialog,
  type AssistantAttachment, type AssistantComposerProps, type AssistantPull, type AssistantDraftNoticeProps, type AssistantTurnNoteProps,
} from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { ClipboardCheck } from "lucide-react";
import { type ReactNode, type RefObject, useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type Conversation as Talking, Machine as ConversationMachine } from "../../gen/app__assistant.effect.vibe";
import { askable, inFlight, pending } from "../../gen/app__assistant.ts";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import type { Machine as AttachmentMachine } from "../../gen/app__assistant__attachments.effect.vibe";
import { useMachine as useAttachments } from "../../gen/app__assistant__attachments.react.ts";
import type { Machine as ChatsMachine } from "../../gen/app__assistant__chats.effect.vibe";
import { making } from "../../gen/app__assistant__chats.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { type Composer as Writing, Machine as ComposerMachine } from "../../gen/app__assistant__composer.effect.vibe";
import { attachments as attachmentCount, content, maxFiles, textLimit } from "../../gen/app__assistant__composer.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import type { Machine as DockMachine } from "../../gen/app__assistant__dock.effect.vibe";
import { browserFieldPull, focused as dockFocused, isOpen as dockOpen } from "../../gen/app__assistant__dock.ts";
import { useMachine as useDock } from "../../gen/app__assistant__dock.react.ts";
import type { Machine as ReplyMachine } from "../../gen/app__assistant__reply.effect.vibe";
import { liveAddsToHistory } from "../../gen/app__assistant__reply.ts";
import { useMachine as useReply } from "../../gen/app__assistant__reply.react.ts";
import type { Machine as SearchMachine } from "../../gen/app__assistant__search.effect.vibe";
import { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { Machine as ShellMachine, showing } from "../../gen/app__shell.effect.vibe";
import type { Machine as LayersMachine } from "../../gen/app__shell__layers.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { MailQuestions } from "../inbox/mail-context.vibe";
import { home } from "../shell/shell.vibe";
import { isCommsView } from "../shell/views.tsx";
import { type MediaCard, MediaReview, namedReviewQuery, spokenText } from "./media-review.vibe";
import type { Agent } from "../platform/agent.vibe";
import { Documents } from "../platform/documents.vibe";
import { AttachmentSources } from "./AttachmentSources.tsx";
import { askComms, freedom, restTyping } from "./assistant.vibe";
import { acceptedFiles, acceptedPhotos, attachmentAuthority, chooseDocument, type FileTarget, insertFiles, previewFile, readChosenDocument, removeFile, retireTranscript, sameBinding } from "./attachments.vibe";
import { chip, type MessageActions, useHistorySheets, useMessageRows } from "./history.tsx";
import { barHeight, ChatScrim, useSheetFollow } from "./follow.tsx";
import { ReplyFailure } from "./ReplyFailure.tsx";
import { type Attached, type Line, Talk } from "./talk.vibe";
import { CommsTarget, type CommsTargetServices } from "../phone/CommsTarget.tsx";
import { CommsBriefing } from "../phone/comms.vibe";
import { displayNumber } from "../phone/words.ts";
import { replyBlocks, wordsOf } from "./words.ts";
import { handToMaps } from "../maps/handoff.ts";
import type { MapsCard } from "@elizaos/plugin-maps-client";
import { type TalkStopReceipt, type VoiceKeyboard, useTalkKeyboard } from "../voice/useTalkKeyboard.ts";

export interface AssistantProps {
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | AttachmentMachine | ChatsMachine | ComposerMachine | SearchMachine | ReplyMachine | DockMachine | ShellMachine | CommsMachine | CommsTargetServices | CommsBriefing | Talk | MailQuestions | LayersMachine | MediaReview | Documents | Agent, unknown>;
  messageActions?: MessageActions;
  speech?: Pick<AssistantComposerProps, "onTalk" | "onDictate" | "showUnavailableTalk" | "voiceNotice"> & {
    voicePanel?: ReactNode;
    interim?: ReactNode;
    keyboard?: TalkStopReceipt;
    voice?: (presentation: { compactDock: boolean; atBar: boolean; onKeyboard: VoiceKeyboard }) => ReactNode;
  };
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

function waiting(writing: Writing, files: readonly Attached[], transcriptTitle: string | undefined): AssistantAttachment[] {
  const { editor } = writing;
  return [
    ...files.slice(0, editor.files).map(chip),
    ...(editor.mail ? [{ id: "mail", kind: "mail", name: "Mail" } as const] : []),
    ...(editor.transcript && transcriptTitle !== undefined ? [{ id: "transcript", kind: "transcript", name: transcriptTitle } as const] : []),
    ...(editor.shown ? [{ id: "shown", kind: "image", name: "Photo" } as const] : []),
    ...(editor.question ? [{ id: "question", kind: "transcript", name: "Question" } as const] : []),
  ];
}

const detached = { mail: "Mail", shown: "Shown" } as const;

const emptyLines: readonly Line[] = [];
const settings = { type: "openView", view: "Settings" } as const;
const maps = { type: "openView", view: "Maps" } as const;
const back = { type: "goBack" } as const;

function DeviceReview({ runtime, card }: { runtime: AssistantProps["runtime"]; card: MediaCard }) {
  const decide = (approve: boolean, confirmation?: "Tap") => void runtime.runPromise(Effect.flatMap(MediaReview, (review) => review.decide(card, approve, confirmation)));
  const deciding = card.decision === "Deciding";
  const unavailable = card.decision === "Unconfirmed";
  const text = card.operation.type === "sms_send" ? { body: card.operation.body, recipients: card.operation.recipients }
    : card.operation.type === "sms_compose" && card.composeLine !== undefined
      ? { body: card.operation.body, recipients: card.phone?.tag === "Exact" ? [card.phone.selected.number]
        : "target" in card.operation && card.operation.target.kind === "number" ? [card.operation.target.number] : [] }
      : undefined;
  const line = card.sms?.subscription ?? card.composeLine?.subscription;
  return (
    <div className="grid gap-2" aria-busy={deciding}>
      {card.phone?.tag === "Choices" ? (
        <div role="group" aria-label="Choose a phone number" className="grid gap-2 rounded-sheet bg-secondary p-3">
          <p className="font-semibold">Choose a number for {namedReviewQuery(card.operation)}</p>
          {card.phone.options.map((choice, index) => (
            <Button key={`${choice.contact}\n${choice.number}`} variant="ghost" className="h-auto min-h-11 justify-start text-left whitespace-normal" disabled={card.decision !== undefined}
              onClick={() => void runtime.runPromise(Effect.flatMap(MediaReview, (review) => review.choosePhone(card, index)))}>
              {choice.name} · {displayNumber(choice.number)}
            </Button>
          ))}
          {card.phone.more && <p className="text-sm text-muted-foreground">More contacts matched. Use a more specific name if needed.</p>}
        </div>
      ) : card.phone?.tag === "Unavailable" ? (
        <Alert role="status">{card.phone.reason}</Alert>
      ) : card.notice !== undefined ? (
        <Alert role="status">{`${card.title}: ${card.detail}. ${card.notice}`}</Alert>
      ) : text !== undefined ? (
        <AssistantCardFrame icon={<ClipboardCheck />} title={card.title} data-alpha-review={card.id}
          detail={line === undefined ? undefined : `SIM ${line.slot + 1} · ${line.displayName}`}
          actions={<Button data-alpha-review-send="" disabled={deciding || unavailable} onClick={(event) => decide(true, event.nativeEvent.isTrusted ? "Tap" : undefined)}>Approve</Button>}>
          <p className="font-semibold wrap-anywhere">{card.phone?.tag === "Exact" ? `${card.phone.selected.name} · ` : ""}{text.recipients.map(displayNumber).join(", ")}</p>
          <p className="whitespace-pre-wrap wrap-anywhere">{text.body}</p>
          {spokenText(card) !== undefined && <p className="text-meta text-muted-foreground">Say “Send this text”</p>}
        </AssistantCardFrame>
      ) : (
        <AssistantCard card={{ kind: "decision", variant: "proposal", title: card.title, detail: card.detail, waiting: deciding, action: card.operation.type === "sms_compose" ? "Open draft" : "Approve" }}
          onHandOn={unavailable ? undefined : () => decide(true)} />
      )}
      {unavailable
        ? <Alert role="status">Alpha couldn’t confirm the decision. Check Activity before trying again.</Alert>
        : <Button className="justify-self-end" variant="ghost" disabled={deciding} onClick={() => decide(false)}>Decline</Button>}
    </div>
  );
}

interface AssistantAttachmentsProps {
  runtime: AssistantProps["runtime"];
  attachments: ReturnType<typeof useAttachments>;
  preview: Attached | undefined;
  targetRef: RefObject<FileTarget | undefined>;
  composerRef: RefObject<HTMLTextAreaElement | null>;
}

function AssistantAttachments({ runtime, attachments, preview, targetRef, composerRef }: AssistantAttachmentsProps) {
  return (
    <>
      {preview !== undefined && <AssistantPhotoPreview
        open
        name={preview.name}
        src={`data:${preview.mimeType};base64,${preview.data}`}
        onOpenChange={(open) => { if (!open && attachments.can({ type: "closePreview" })) void attachments.send({ type: "closePreview" }); }}
      />}
      {attachments.state?.open && <AttachmentSources
        tab={attachments.state.tab}
        room={attachments.state.room}
        accept={attachments.state.tab === "Photos" ? acceptedPhotos : acceptedFiles}
        chooseDocument={runtime.runSync(Documents).client._tag === "Some" ? async () => {
          const chosen = await runtime.runPromise(chooseDocument());
          if (chosen) return { id: chosen.id, name: chosen.name, bytes: chosen.bytes, load: () => runtime.runPromise(readChosenDocument(chosen.id)) };
        } : undefined}
        onClose={() => {
          targetRef.current = undefined;
          void attachments.send({ type: "cancel" });
        }}
        onReturnFocus={() => composerRef.current?.parentElement?.querySelector<HTMLButtonElement>('button[aria-label="Chat actions"]')?.focus()}
        onTab={(tab) => void attachments.send({ type: "switchTab", tab })}
        onAttach={async (selected) => {
          const held = targetRef.current;
          if (!held) return false;
          const files = await Promise.all(selected.map((file) => file.load()));
          const current = () => targetRef.current === held;
          if (files.some((file) => file === undefined) || !current()) return false;
          const accepted = await runtime.runPromise(insertFiles(held, files.filter((file) => file !== undefined), current));
          if (accepted && current()) {
            targetRef.current = undefined;
            await attachments.send({ type: "cancel" });
          }
          return accepted;
        }}
      />}
    </>
  );
}

interface MailReviewDialogsProps {
  open: boolean;
  review: ReturnType<MailQuestions.Shape["snapshot"]>;
  attach: () => void;
  dismiss: () => void;
}

function MailReviewDialogs({ open, review, attach, dismiss }: MailReviewDialogsProps) {
  const source = review.question?.review.source;
  return (
    <>
      <ConfirmDialog open={open && source !== undefined} title="Share this email with Alpha?" confirmLabel="Add to chat" onConfirm={attach} onCancel={dismiss}>
        {source && <span className="block max-h-72 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
          {source.subject || "(no subject)"}{"\n"}{source.from}{"\n"}{source.to.join(", ")}{"\n\n"}{source.bodyText}
        </span>}
      </ConfirmDialog>
      <ConfirmDialog open={open && review.failure !== undefined} title={review.failure === "tooLarge" ? "This email is too long to share in full" : "Review this email again before sharing"}
        confirmLabel="OK" onConfirm={dismiss} onCancel={dismiss} />
    </>
  );
}

interface DockHandleProps {
  dock: ReturnType<typeof useDock>;
  detent: Parameters<typeof dockOpen>[0];
  compact: boolean;
  focusOnPointerOpen: boolean;
  field: RefObject<HTMLTextAreaElement | null>;
  /** The press, drag, release and cancel of the handle, which the sheet follows. */
  gesture: AssistantPull;
  /** The press ended without moving: the gesture is over. */
  done: () => void;
}

function dockPull(dock: DockHandleProps["dock"], detent: DockHandleProps["detent"]): NonNullable<AssistantComposerProps["fieldPull"]> {
  return {
    onPress: () => { void dock.send({ type: "press", detent, now: untimed }); },
    onDrag: () => { void dock.send({ type: "drag" }); },
    onRelease: ({ direction, flick, y }) => {
      const height = Math.max(0, Math.round(window.innerHeight - y));
      void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: barHeight, full: window.innerHeight, now: untimed });
    },
    onCancel: () => { void dock.send({ type: "shift", now: untimed }); },
  };
}

function DockHandle({ dock, detent, compact, focusOnPointerOpen, field, gesture, done }: DockHandleProps) {
  const open = dockOpen(detent);
  return (
    <AssistantGrabber
      variant={open ? "handle" : "mark"}
      {...gesture}
      onLift={() => {
        done();
        void dock.send({ type: "lift", now: untimed });
        if (!open && focusOnPointerOpen) field.current?.focus();
      }}
      onTap={({ keyboard }) => {
        void dock.send({ type: "click", now: untimed });
        if (!open && keyboard && !compact) field.current?.focus();
      }}
    />
  );
}

/** The route and draft that own the composer during a Talk-to-keyboard request. */
function keyboardScope(runtime: AssistantProps["runtime"]): string | undefined {
  const held = runtime.runSyncExit(Effect.gen(function* () {
    const route = yield* ShellMachine.use((machine) => machine.get());
    const draft = yield* ComposerMachine.use((machine) => machine.get());
    const { context } = yield* ConversationMachine.use((machine) => machine.get());
    const subject = isCommsView(route.trail.at(-1)) ? (yield* CommsMachine.use((machine) => machine.get())).key : undefined;
    return JSON.stringify([route.trail, route.assistant, subject, context.revision, draft.binding.owner, draft.binding.conversation, draft.read.ticket]);
  }));
  return held._tag === "Success" ? held.value : undefined;
}

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
  const mailStore = useMemo(() => ({ subscribe: (listener: () => void) => mail.subscribe(listener), snapshot: () => mail.snapshot() }), [mail]);
  const reviewed = useSyncExternalStore(mailStore.subscribe, mailStore.snapshot);
  const sectionRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const focusOnRevealRef = useRef(false);
  const { voice: renderVoice, voicePanel, interim, keyboard, ...speechProps } = speech ?? {};
  const keyboardOwner = useCallback(() => keyboardScope(runtime), [runtime]);
  const { onKeyboard, takeFocus } = useTalkKeyboard(composerRef, keyboardOwner, keyboard);
  const currentView = shell.state?.trail.at(-1);
  const onComms = isCommsView(currentView);
  const assistantDetent = shell.state?.assistant ?? "Bar";
  const { following, gesture, done } = useSheetFollow(dock, assistantDetent, sectionRef);
  const compact = assistantDetent === "Bar" && currentView !== undefined && currentView !== "Browser" && !onComms;
  const composerField = useCallback((element: HTMLTextAreaElement | null) => {
    composerRef.current = element;
    if (element && !compact && focusOnRevealRef.current) {
      focusOnRevealRef.current = false;
      if (assistantDetent === "Typing") element.focus();
    }

    takeFocus(element);
  }, [assistantDetent, compact, takeFocus]);
  const fileTargetRef = useRef<FileTarget | undefined>(undefined);
  const [talking, shown, writing, finding] = [conversation.state, chats.state, composer.state, search.state];
  const free = talking && shown && writing ? freedom(talking, writing, shown.chosen) : { replying: true, holding: true };
  const history = useHistorySheets(chats, search, seen, free);
  const lines = !shown || (shown.page.status === "Idle" && shown.chosen === 0) ? emptyLines : seen.pages.get(shown.page.ticket)?.lines ?? emptyLines;
  const canPreview = attachments.can({ type: "preview", attachment: 1 });
  const preview = useCallback((file: Attached) => void runtime.runPromise(previewFile(file)), [runtime]);
  const onSettingsPage = shell.state && showing(shell.state, "Settings") && shell.state.assistant !== "Bar" && shell.can(back);
  const settingsAction = shell.can(settings) ? settings : onSettingsPage ? back : undefined;
  const onSettings = useCallback(() => {
    if (settingsAction) void runtime.runPromiseExit(Effect.flatMap(ShellMachine, (machine) => machine.send(settingsAction)));
  }, [runtime, settingsAction]);
  // spec/app/maps/cards.md, "A card's Map button runs one flow, chosen from what the card carries": a search card hands Maps its search
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  const onOpenMaps = useCallback((card: MapsCard, message: number) => {
    setOpened((before) => new Set([...before, message]));
    const query = card.kind === "places" || card.kind === "locate" ? card.query : undefined;
    handToMaps(query !== undefined && query.trim() !== "" ? query : undefined);
    void runtime.runPromiseExit(Effect.flatMap(ShellMachine, (machine) => machine.send(maps)));
  }, [runtime]);
  const mapsShowing = Boolean(shell.state && showing(shell.state, "Maps"));
  // spec/app/maps/cards.md, "A tap sends one answer while the composer is quiet; a draft or an edit says why it waits; a failed send asks again"
  const answeredRef = useRef(new Set<string>());
  const onChoose = useCallback((choice: string, value: string) => {
    if (!talking || answeredRef.current.has(choice) || board.snapshot().typed.trim() !== "") return;
    const edit = { type: "edit", blank: false, long: value.length > textLimit } as const;
    if (!composer.can(edit)) return;
    answeredRef.current.add(choice);
    board.type(value);
    const answer = { type: "hold", askable: askable(talking) } as const;
    void composer.send(edit)
      .then(() => {
        board.hold(value);
        board.type("");
        return composer.send(answer);
      })
      .then((outcome) => { if (outcome._tag !== "Success") answeredRef.current.delete(choice); });
  }, [board, composer, talking]);
  const messages = useMessageRows({
    runtime, board, lines, chats: shown, writing, ...free, actions: messageActions, canReadAloud,
    settled: Boolean(talking && !inFlight(talking.turn) && !pending(talking)),
    onSettings: settingsAction ? onSettings : undefined,
    onPreview: canPreview ? preview : undefined,
    onOpenMaps: shell.can(maps) || mapsShowing ? onOpenMaps : undefined,
    opened,
    onChoose,
  });
  if (conversation.cause || chats.cause || composer.cause || reply.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Ask Alpha</Alert>;
  if (!talking || !shown || !writing || !finding) return null;
  const hold = { type: "hold", askable: askable(talking) } as const;
  const start = { type: "start", ...free } as const;
  const newChat = shown.chosen === 0;
  const subject = onComms ? comms.state?.key : undefined;
  const brief = subject !== undefined && comms.state?.briefed === subject && shell.state?.trail.at(-1) === "Phone"
    ? runtime.runSync(Effect.flatMap(CommsBriefing, (reading) => reading.forSubject(subject))) : "";
  const request = subject === undefined ? "" : (comms.state?.requests.find((draft) => draft.about === subject)?.request ?? "");
  const sendable = subject !== undefined
    ? request.trim() !== "" && request.length <= textLimit && askable(talking) && (!newChat || chats.can(start))
    : newChat ? content(writing.editor) && !writing.long && chats.can(start) && askable(talking) : composer.can(hold);
  const status = turnOf(talking, seen.label);
  const notice = noticeOf(writing);
  const check = { type: "checkForReply" } as const;
  const checkable = conversation.can(check) && (talking.turn.send.outcome === "Unknown" || talking.turn.reply === "Stopped" || talking.check === "LookLater" || writing.unsettled);
  const draftFiles = sameBinding(seen.filesBinding, writing.binding) ? seen.files : [];
  const transcriptTitle = sameBinding(seen.transcript?.binding, writing.binding) ? seen.transcript?.offered.title : undefined;
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
  const replyWords = replyBlocks(seen.reply, true).words;
  const onOpenLink = messageActions?.openLink;
  const writingReply = replyWords !== "" ? [{ id: "reply", author: "alpha", text: replyWords, streaming: true, onOpenLink } as const] : [];
  // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"; spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
  const mediaCards = seen.media.filter((card) => !talking.context.sensitive && card.conversation === shown.chosen && card.revision === talking.context.revision).map((card) => ({
    id: `media ${card.id}`, author: "alpha" as const, text: "", children: <DeviceReview runtime={runtime} card={card} />,
  }));
  const mediaNote = talking.context.sensitive || seen.mediaNote?.conversation !== shown.chosen
    ? [] : [{ id: "media result", author: "alpha" as const, text: seen.mediaNote.text, onOpenLink }];
  const failure = seen.failure;
  const liveFix = failure?.kind === "OutOfFunds" ? "FundingFix" : failure?.fix ?? "NoFix";
  const readAgain = failure?.messageId !== undefined && lines.some((line) => line.id === failure.messageId && line.failure === failure.kind);
  const failed = failure === undefined || (readAgain && !liveAddsToHistory(failure.kind, liveFix, failure.waitMs)) ? [] : [{ id: "failure", author: "alpha", text: "", children: <ReplyFailure kind={failure.kind} fix={liveFix} waitMs={failure.waitMs} live onRetry={() => type(board.lastSent)} onSettings={settingsAction ? onSettings : undefined} /> } as const];
  const quotedLine = board.line(shown.chosen, writing.editor.quote);
  const quoted = quotedLine === undefined ? undefined : wordsOf(quotedLine);
  const view = talking.context.showing.tag === "App" ? talking.context.showing.view : "Home";
  const open = dockOpen(assistantDetent);
  const full = assistantDetent === "Full";
  const keptHeight = assistantDetent === "Sheet" && dock.state && dock.state.kept > 0 ? dock.state.kept : undefined;
  const openWithFocus = (focusField: boolean) => {
    for (const ask of dockFocused(assistantDetent)) {
      if (ask.tag === "Raise" && shell.can({ type: "raise", detent: ask.detent })) void shell.send({ type: "raise", detent: ask.detent });
    }
    if (focusField) composerRef.current?.focus();
  };
  const revealComposer = () => {
    const typing = { type: "raise", detent: "Typing" } as const;
    if (!shell.can(typing)) return;
    focusOnRevealRef.current = true;
    void shell.send(typing).then((sent) => {
      if (sent._tag === "Failure") focusOnRevealRef.current = false;
    });
  };
  const draftEditable = composer.can({ type: "edit", blank: false, long: false });
  const pullFromField = shell.state && browserFieldPull(shell.state, seen.typed === "", draftEditable);
  const grabber = shell.state ? <DockHandle dock={dock} detent={assistantDetent} compact={compact} gesture={gesture} done={done}
    focusOnPointerOpen={currentView !== undefined && !compact} field={composerRef} /> : undefined;
  const live = following !== undefined;
  const scrim = !onComms && !live && !dock.state?.voice && currentView !== "Camera" && (assistantDetent === "Sheet" || assistantDetent === "Typing");

  return (
    <>
      <AssistantAttachments runtime={runtime} attachments={attachments} preview={previewed} targetRef={fileTargetRef} composerRef={composerRef} />
      {onComms && full && <CommsTarget runtime={runtime} placement="strip" />}
      {scrim ? <ChatScrim typing={assistantDetent === "Typing"} field={composerRef} onLower={() => { if (shell.can(back)) void shell.send(back); }} /> : null}
      {(!onComms || open) && <AssistantConversation
        ref={sectionRef}
        voicePanel={voicePanel}
        detent={live && !onComms ? "sheet" : assistantDetent === "Full" ? "full" : assistantDetent === "Sheet" ? "sheet" : "bar"}
        className={onComms ? "relative w-full motion-safe:transition-[height] motion-safe:duration-[420ms]" : open || live ? "fixed inset-x-0 bottom-0 mx-auto max-w-md" : "sticky bottom-0"}
        style={onComms
          ? live ? { height: following, transition: "none" } : assistantDetent === "Full" ? { height: "calc(100dvh - 52px)" } : keptHeight === undefined ? undefined : { height: `clamp(38dvh, ${keptHeight}px, 60dvh)` }
          : live ? { height: following, borderRadius: following >= window.innerHeight ? 0 : undefined } : keptHeight ? { height: keptHeight } : undefined}
        header={{
          title: seen.titles.get(shown.chosen) ?? "Ask Alpha",
          context: { view, selected: talking.context.selected, sensitive: talking.context.sensitive },
          subtitle: onComms ? <CommsTarget runtime={runtime} placement="context" /> : undefined,
          onHome: () => void runtime.runPromise(home()),
          onClose: open && shell.can({ type: "goBack" }) ? () => void shell.send({ type: "goBack" }).then((lowered) => { if (full && lowered._tag === "Success" && shell.can({ type: "goBack" })) void shell.send({ type: "goBack" }); }) : undefined,
          expanded: assistantDetent === "Full",
          onResize: assistantDetent === "Full"
            ? () => void shell.send({ type: "goBack" })
            : shell.can({ type: "raise", detent: "Full" }) ? () => void shell.send({ type: "raise", detent: "Full" }) : undefined,
          grabber: open ? grabber : undefined,
        }}
        attachmentNotice={onComms ? undefined : seen.attachmentNotice}
        transcript={{
          messages,
          liveMessages: [...(brief === "" ? [] : [{ id: `briefing:${subject}`, author: "alpha" as const, text: brief, onOpenLink }]), ...writingReply, ...failed, ...mediaCards, ...mediaNote],
          interim: open && shown.around === 0 && !talking.context.sensitive ? interim : undefined,
          position: { page: `${shown.chosen}/${shown.page.ticket}`, around: board.messageId(shown.around) },
          visible: open,
          status: shown.page.status === "Loading" ? "loading" : shown.page.status === "Failed" ? "failed" : "loaded",
          turn: status === undefined ? undefined : { status, label: seen.label === "" ? undefined : seen.label, onCheck: checkable ? () => void conversation.send(check) : undefined },
          onRetry: chats.can({ type: "reread" }) ? () => void chats.send({ type: "reread" }) : undefined,
          onEarlier: earlier.around > 1 && chats.can(earlier) ? () => void chats.send(earlier) : undefined,
          onLater: later.around < shown.messages && chats.can(later) ? () => void chats.send(later) : undefined,
          onReturnToOriginal: chats.can({ type: "returnToOriginal", ...free }) ? () => void chats.send({ type: "returnToOriginal", ...free }) : undefined,
        }}
        composer={{
          ...speechProps,
          ...(live && !open ? { variant: "bar" as const } : {}),
          voice: renderVoice?.({ compactDock: compact, atBar: assistantDetent === "Bar", onKeyboard }),
          onDictate: onComms || inFlight(talking.turn) || !speech?.onDictate ? undefined : () => {
            openWithFocus(false);
            speech.onDictate?.();
          },
          fieldRef: composerField,
          fieldPull: pullFromField ? {
            ...dockPull(dock, assistantDetent),
            onLift: () => { void dock.send({ type: "fieldLift", now: untimed }); },
          } : undefined,
          value: subject === undefined ? seen.typed : request,
          onValueChange: type,
          placeholder: onComms ? "Ask Alpha" : assistantDetent === "Bar" && currentView === "Browser" ? "Ask about this page" : undefined,
          leading: onComms ? <CommsTarget runtime={runtime} placement="composer" /> : undefined,
          closed: subject === undefined && !draftEditable,
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
          attachments: onComms ? undefined : waiting(writing, draftFiles, transcriptTitle),
          onPreviewAttachment: !onComms && canPreview ? (id) => {
            const file = draftFiles.find((one) => one.id === id);
            if (file) preview(file);
          } : undefined,
          quote: onComms ? undefined : quoted,
          editing: !onComms && writing.editor.editing > 0,
          opener: !open ? grabber : undefined,
          onOpen: !open && !grabber ? () => openWithFocus(!compact) : undefined,
          onType: compact ? revealComposer : undefined,
          onSwipeUp: compact ? () => openWithFocus(false) : undefined,
          onSend: sendable && !inFlight(talking.turn) ? () => {
            if (assistantDetent === "Typing") openWithFocus(false);
            send();
          } : undefined,
          onStop: conversation.can({ type: "stop" }) ? () => void conversation.send({ type: "stop" }) : undefined,
          stopping: talking.turn.stopping,
          onAttach: !onComms && composer.can({ type: "attach", count: 1 }) ? () => {
            const request = { type: "openPicker", room: maxFiles - attachmentCount(writing.editor) } as const;
            if (!attachments.can(request)) return;
            void runtime.runPromise(attachmentAuthority()).then((authority) => {
              if (authority === undefined) {
                board.change({ attachmentNotice: "Could not verify the owner for these attachments. Try again." });
                return;
              }
              fileTargetRef.current = { binding: writing.binding, slot: writing.read.ticket, revision: talking.context.revision, authority };
              openWithFocus(false);
              void attachments.send(request);
            });
          } : undefined,
          onFocusField: assistantDetent === "Typing" ? undefined : () => openWithFocus(false),
          onBlur: assistantDetent === "Typing" && !onComms ? (event) => {
            const next = event.relatedTarget;
            if (next instanceof Element && (event.currentTarget.contains(next) || next.closest("[role='menu'], [role='dialog'], [role='alertdialog']"))) return;
            void runtime.runPromise(restTyping);
          } : undefined,
          onHistory: history.browse,
          onSearch: history.search,
          onNew: chats.can(start) ? () => void chats.send(start) : undefined,
          making: making(shown),
          onClick: assistantDetent === "Bar" && !compact ? (event) => {
            if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target) || event.target.closest("button, textarea")) return;
            openWithFocus(true);
          } : undefined,
          onRemoveAttachment: (id) => {
            if (id === "question") void composer.send({ type: "removeQuestion" });
            else if (id === "transcript") {
              if (composer.can({ type: "detach", kind: "Transcript" })) void runtime.runPromise(retireTranscript());
            } else if (id === "mail" || id === "shown") {
              if (id === "mail") mail.clear();
              void composer.send({ type: "detach", kind: detached[id] });
            } else void runtime.runPromise(removeFile(id));
          },
          onUnquote: composer.can({ type: "unquote" }) ? () => void composer.send({ type: "unquote" }) : undefined,
        }}
      />}
      <MailReviewDialogs open={!onComms && open} review={reviewed} attach={attachMail} dismiss={() => mail.show({})} />
      {history.sheets}
    </>
  );
}
