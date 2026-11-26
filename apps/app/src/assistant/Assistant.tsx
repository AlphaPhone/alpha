// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/reply.md, "Story: Hear a brief acknowledgment and still get the whole answer"; spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import {
  Alert, AssistantCard, AssistantCardFrame, Button, AssistantConversation, AssistantGrabber, AssistantMessageDraftCard, AssistantNoticeCard, AssistantPhotoPreview, ConfirmDialog, Sheet, SheetContent, SmsReviewCard, Textarea,
  type AssistantAttachment, type AssistantComposerProps, type AssistantPull, type AssistantDraftNoticeProps, type AssistantMessageProps, type AssistantTurnNoteProps,
} from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { FileText } from "lucide-react";
import { type FormEvent, type ReactNode, type RefObject, useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type Conversation as Talking, Machine as ConversationMachine } from "../../gen/app__assistant.effect.vibe";
import { askable, inFlight, pending } from "../../gen/app__assistant.ts";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import type { Machine as AttachmentMachine } from "../../gen/app__assistant__attachments.effect.vibe";
import { useMachine as useAttachments } from "../../gen/app__assistant__attachments.react.ts";
import type { Machine as ChatsMachine } from "../../gen/app__assistant__chats.effect.vibe";
import { making } from "../../gen/app__assistant__chats.ts";
import { useMachine as useCards } from "../../gen/app__assistant__cards.react.ts";
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
import { useMachine as useLayers } from "../../gen/app__shell__layers.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { acceptMailReview, MailQuestions, type MailQuestion } from "../inbox/mail-context.vibe";
import { MessagingBridge, type MessagingBridgeApi, type MessagingDraftProposal } from "../messaging/bridge.vibe";
import { home } from "../shell/shell.vibe";
import { isCommsView } from "../shell/views.tsx";
import { type MediaCard, MediaReview, namedReviewQuery, spokenText } from "./media-review.vibe";
import type { Agent } from "../platform/agent.vibe";
import { native, type Device } from "../platform/device.vibe";
import type { NoteStore } from "../platform/notes.vibe";
import type { Machine as NotesMachine } from "../../gen/app__notes.effect.vibe";
import { Documents } from "../platform/documents.vibe";
import { AttachmentSources, type AttachmentSourceRow } from "./AttachmentSources.tsx";
import { AttachmentPicker, choosePickerRow, clearPickerChoice, importPickerFiles, openAttachmentPicker, pickSystemDocument, upPickerFolder, usePickerVolume } from "./attachment-picker.vibe";
import { askComms, freedom, openChatSearch, restTyping } from "./assistant.vibe";
import { contactChatActionsId } from "./contact-chat-id.ts";
import { acceptedFiles, acceptedPhotos, attachmentAuthority, previewFile, removeFile, retireTranscript, sameBinding } from "./attachments.vibe";
import { chip, type MessageActions, useHistorySheets, useMessageRows } from "./history.tsx";
import { barHeight, ChatScrim, useSheetFollow } from "./follow.tsx";
import { holdMessagePress } from "./message-actions.vibe";
import { ReplyFailure } from "./ReplyFailure.tsx";
import {
  actionsOf, actionUnits, type RecordingSummary, reviewRecordingSummary, saveRecordingSummary, summaryActions, summaryUnits,
} from "./recording-summary.vibe";
import { type Attached, type Line, Talk } from "./talk.vibe";
import { CommsTarget, type CommsTargetServices } from "../phone/CommsTarget.tsx";
import { CommsBriefing } from "../phone/comms.vibe";
import { displayNumber } from "../phone/words.ts";
import { replyBlocks, wordsOf } from "./words.ts";
import { handToMaps } from "../maps/handoff.ts";
import type { MapsCard } from "@elizaos/plugin-maps-client";
import { type DictationKeyboard, type TalkStopReceipt, type VoiceKeyboard, useTalkKeyboard } from "../voice/useTalkKeyboard.ts";

export interface AssistantProps {
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | AttachmentMachine | ChatsMachine | ComposerMachine | SearchMachine | ReplyMachine | DockMachine | ShellMachine | CommsMachine | CommsTargetServices | CommsBriefing | Talk | MailQuestions | MessagingBridge | LayersMachine | MediaReview | Documents | AttachmentPicker | Agent | Device | NoteStore | NotesMachine, unknown>;
  messageActions?: MessageActions;
  speech?: Pick<AssistantComposerProps, "onTalk" | "onDictate" | "showUnavailableTalk" | "voiceNotice"> & {
    voicePanel?: (onKeyboard: DictationKeyboard) => ReactNode;
    interim?: ReactNode;
    keyboard?: TalkStopReceipt;
    voice?: (presentation: { compactDock: boolean; atBar: boolean; onKeyboard: VoiceKeyboard }) => ReactNode;
  };
  canReadAloud?: boolean;
  onCloseTextAsk?: () => void;
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

function focusChatActions(field: HTMLTextAreaElement | null) {
  const trigger = field?.parentElement?.querySelector<HTMLButtonElement>('button[aria-label="Chat actions"]');
  if (trigger && !trigger.disabled && !trigger.closest("[inert], [hidden]")) trigger.focus({ preventScroll: true });
}

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
  const textCard = text !== undefined && card.phone?.tag !== "Choices" && card.phone?.tag !== "Unavailable" && card.notice === undefined;
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
        <SmsReviewCard review={card.id} body={text.body}
          to={card.phone?.tag === "Exact" ? card.phone.selected.name : text.recipients.map(displayNumber).join(", ")}
          number={card.phone?.tag === "Exact" ? displayNumber(card.phone.selected.number) : undefined}
          note={line === undefined ? undefined : `SIM ${line.slot + 1} · ${line.displayName}`}
          hint={spokenText(card) === undefined ? undefined : "Say “Send this text”"}
          sendDisabled={deciding || unavailable} declineDisabled={deciding}
          onSend={(event) => decide(true, event.nativeEvent.isTrusted ? "Tap" : undefined)} onDecline={unavailable ? undefined : () => decide(false)} />
      ) : (
        <AssistantCard card={{ kind: "decision", variant: "proposal", title: card.title, detail: card.detail, waiting: deciding, action: card.operation.type === "sms_compose" ? "Open draft" : card.operation.type === "browser_navigate" ? "Open" : "Approve" }}
          onHandOn={unavailable ? undefined : () => decide(true)} />
      )}
      {unavailable
        ? <Alert role="status">Alpha couldn’t confirm the decision. Check Activity before trying again.</Alert>
        : !textCard && <Button className="justify-self-end" variant="ghost" disabled={deciding} onClick={() => decide(false)}>Decline</Button>}
    </div>
  );
}

interface AssistantAttachmentsProps {
  runtime: AssistantProps["runtime"];
  attachments: ReturnType<typeof useAttachments>;
  preview: Attached | undefined;
  notice: string;
  composerRef: RefObject<HTMLTextAreaElement | null>;
}

function AssistantAttachments({ runtime, attachments, preview, notice, composerRef }: AssistantAttachmentsProps) {
  const board = useMemo(() => runtime.runSync(AttachmentPicker).board, [runtime]);
  const view = useSyncExternalStore(board.subscribe, board.snapshot);
  const state = attachments.state;
  const active = state?.open && view.visit === state.visit;
  const currentRows = active && state.rows.status === "Loaded" && view.ticket === state.rows.ticket;
  const chooseMore = { type: "choosePhotoItems" } as const;
  const request = { type: "requestAccess" } as const;
  const settings = { type: "openSettings" } as const;
  const retry = { type: "retryList" } as const;
  const refresh = { type: "refresh" } as const;
  const more = { type: "more" } as const;
  const attach = { type: "attachChosen" } as const;
  const cancel = { type: "cancel" } as const;
  const source = state?.tab === "Photos" ? "photos" : "files";
  const permission = active && view.availability === "available"
    ? attachments.can(chooseMore) ? { label: "Choose more photos", run: () => void attachments.send(chooseMore) }
      : attachments.can(request) ? { label: `Allow ${source} access`, run: () => void attachments.send(request) }
      : attachments.can(settings) ? { label: `Open ${source} settings`, run: () => void attachments.send(settings) }
      : undefined
    : undefined;
  const chosen = active ? new Set(view.selected.map((row) => row.id)) : undefined;
  const visible = currentRows ? view.rows : [];
  const imported = active ? view.selected.filter((row) => row.external && (state.tab === "Photos") === (row.kind === "photo")
    && row.name.toLowerCase().includes(state.query.trim().toLowerCase())) : [];
  const rows: AttachmentSourceRow[] = active ? [...visible, ...imported].map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    thumbnail: row.image,
    thumbnailFile: row.imageFile,
    bytes: row.bytes,
    selected: chosen?.has(row.id) === true,
    onPress: row.available === false ? undefined : () => void runtime.runPromise(choosePickerRow(row.id, state.visit, state.rows.ticket)),
  })) : [];
  const location = currentRows && state.tab === "Documents" && view.location ? {
    label: view.location.name,
    onUp: view.location.up ? () => void runtime.runPromise(upPickerFolder(state.visit)) : undefined,
    volumes: view.volumes.length > 1 ? view.volumes.map((volume) => ({
      id: volume.id, name: volume.name, selected: view.location?.volume === volume.id,
      onPress: () => void runtime.runPromise(usePickerVolume(volume.id, state.visit)),
    })) : undefined,
  } : undefined;
  const browsingNativePhotos = active && native() && state.tab === "Photos"
    && state.photos.grant === "Granted" && view.availability === "available" && state.rows.status !== "Failed";
  return (
    <>
      {preview !== undefined && <AssistantPhotoPreview
        open
        name={preview.name}
        src={`data:${preview.mimeType};base64,${preview.data}`}
        onOpenChange={(open) => { if (!open && attachments.can({ type: "closePreview" })) void attachments.send({ type: "closePreview" }); }}
      />}
      {state?.open && <AttachmentSources
        tab={state.tab}
        room={state.room}
        accept={state.tab === "Photos" ? acceptedPhotos : acceptedFiles}
        query={state.query}
        rows={rows}
        selected={state.selected}
        reading={state.reading.outcome === "Sent" || (active && view.preparing) === true}
        status={!active || view.availability === "checking" ? "Loading" : view.availability === "failed" ? "Failed" : state.rows.status}
        problem={active ? view.problem ?? (state.refused > 0 ? (notice || "Could not attach the selected files") : undefined) : undefined}
        access={permission}
        location={location}
        truncated={currentRows && view.truncated}
        onClose={() => { if (attachments.can(cancel)) void attachments.send(cancel); }}
        onReturnFocus={() => focusChatActions(composerRef.current)}
        onTab={(tab) => { const event = { type: "switchTab", tab } as const; if (attachments.can(event)) void attachments.send(event); }}
        onSearch={(query) => { const event = { type: "setQuery", query } as const; if (attachments.can(event)) void attachments.send(event); }}
        onRetry={attachments.can(retry) ? () => void attachments.send(retry) : view.availability === "failed" && attachments.can(refresh) ? () => void attachments.send(refresh) : undefined}
        onMore={attachments.can(more) ? () => void attachments.send(more) : undefined}
        onClear={active && state.selected > 0 ? () => void runtime.runPromise(clearPickerChoice(state.visit)) : undefined}
        onAttach={active && attachments.can(attach) ? () => void attachments.send(attach) : undefined}
        onBrowse={active && state.tab === "Documents" && view.systemDocuments ? () => void runtime.runPromise(pickSystemDocument(state.visit)) : undefined}
        onImport={active && !browsingNativePhotos && (!view.systemDocuments || state.tab === "Photos") ? (files) => void runtime.runPromise(importPickerFiles(files, state.visit)) : undefined}
        importLabel={view.systemDocuments ? "Choose photos" : undefined}
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

// spec/app/assistant/cards.md, "The owner reviews the summary before it can be saved"
function RecordingSummaryReview({ runtime, offer }: { runtime: AssistantProps["runtime"]; offer: RecordingSummary }) {
  const card = useCards(offer.runtime);
  const form = useId();
  const heading = useId();
  const actionItems = useId();
  const dismiss = { type: "dismissSummary" } as const;
  const dismissReview = () => { if (card.can(dismiss)) void card.send(dismiss); };
  const outcome = card.state?.save.outcome;
  const message = card.state?.settled ? "Recording is unavailable. Ask about its current transcript again."
    : outcome === "Confirmed" ? "Recording summary saved. No reminders scheduled."
    : outcome === "Unknown" ? "Save is unconfirmed. Check Notes before trying again."
    : outcome === "Sent" ? "Saving recording summary…"
    : outcome === "Refused" ? "Recording summary could not be saved." : undefined;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!card.can({ type: "saveToNotes" })) return;
    const values = new FormData(event.currentTarget);
    const summary = values.get("summary");
    const actions = values.get("actions");
    if (typeof summary !== "string" || typeof actions !== "string") return;
    if (summary.trim() === "") {
      const field = event.currentTarget.elements.namedItem("summary");
      if (field instanceof HTMLTextAreaElement) {
        field.setCustomValidity("Enter a summary.");
        field.reportValidity();
      }
      return;
    }
    const field = event.currentTarget.elements.namedItem("actions");
    const items = actionsOf(actions);
    if (items.length > summaryActions || items.some((item) => item.length > actionUnits)) {
      if (field instanceof HTMLTextAreaElement) {
        field.setCustomValidity(`Use up to ${summaryActions} lines of ${actionUnits} characters each.`);
        field.reportValidity();
      }
      return;
    }
    void runtime.runPromise(saveRecordingSummary(offer, summary, actions));
  };
  return <>
    {card.state && <AssistantCardFrame icon={<FileText />} title="Review summary note" detail={offer.source.title}
      settled={card.state.settled || outcome === "Confirmed" || outcome === "Unknown"}
      onOpen={card.can({ type: "reviewSummary" }) ? () => void runtime.runPromise(reviewRecordingSummary(offer)) : undefined}>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </AssistantCardFrame>}
    <Sheet open={card.state?.reviewing === true} onOpenChange={(open) => { if (!open) dismissReview(); }}>
      <SheetContent title="Review recording summary" description={offer.source.title} actions={<>
        <Button variant="secondary" onClick={dismissReview}>Cancel</Button>
        <Button type="submit" form={form} disabled={!card.can({ type: "saveToNotes" })}>Save recording summary</Button>
      </>}>
        <form id={form} onSubmit={submit} className="grid gap-3">
          <label htmlFor={heading} className="grid gap-1.5 text-sm font-medium">
            Summary
            <Textarea id={heading} aria-label="Summary" name="summary" defaultValue={offer.words} maxLength={summaryUnits} required
              onInput={(event) => event.currentTarget.setCustomValidity("")} />
          </label>
          <label htmlFor={actionItems} className="grid gap-1.5 text-sm font-medium">
            Action items
            <Textarea id={actionItems} aria-label="Action items" name="actions" placeholder="One action per line" maxLength={summaryActions * (actionUnits + 1)}
              onInput={(event) => event.currentTarget.setCustomValidity("")} />
          </label>
        </form>
      </SheetContent>
    </Sheet>
  </>;
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

function draftMessageCards(
  drafts: ReadonlyArray<MessagingDraftProposal>,
  bridge: MessagingBridgeApi,
  runSend: (id: string) => void,
  runOpen: (draft: MessagingDraftProposal) => void,
): (AssistantMessageProps & { id: string })[] {
  return drafts.map((draft) => ({
    id: `messaging-draft-${draft.id}`,
    author: "alpha",
    text: "",
    children: (
      <AssistantMessageDraftCard
        platform={draft.platform}
        target={draft.target}
        replyContext={draft.replyContext}
        body={draft.body}
        onBodyChange={(body) => bridge.editDraft(draft.id, body)}
        status={draft.status}
        error={draft.error}
        settled={draft.settled}
        onSend={() => runSend(draft.id)}
        onOpenInApp={() => runOpen(draft)}
        onDecline={() => bridge.declineDraft(draft.id)}
      />
    ),
  }));
}

function useMessagingDrafts(
  runtime: AssistantProps["runtime"],
  shell: ReturnType<typeof useShell>,
): (AssistantMessageProps & { id: string })[] {
  const bridge = useMemo(() => runtime.runSync(MessagingBridge), [runtime]);
  const store = useMemo(() => ({ subscribe: (listener: () => void) => bridge.subscribe(listener), snapshot: () => bridge.snapshot() }), [bridge]);
  const snap = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return draftMessageCards(
    snap.drafts,
    bridge,
    (id) => { void runtime.runPromise(bridge.sendDraft(id)); },
    (draft) => {
      void runtime.runPromise(bridge.openDraftInApp(draft.id));
      const openView = { type: "openView", view: draft.platform } as const;
      if (shell.can(openView)) void shell.send(openView);
    },
  );
}

function useExternal<T>(store: { readonly subscribe: (listener: () => void) => () => void; readonly snapshot: () => T }): T {
  const bound = useMemo(() => ({ subscribe: (listener: () => void) => store.subscribe(listener), snapshot: () => store.snapshot() }), [store]);
  return useSyncExternalStore(bound.subscribe, bound.snapshot);
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
export function Assistant({ runtime, messageActions, speech, canReadAloud = false, onCloseTextAsk }: AssistantProps) {
  const conversation = useConversation(runtime);
  const attachments = useAttachments(runtime);
  const chats = useChats(runtime);
  const composer = useComposer(runtime);
  const search = useSearch(runtime);
  const reply = useReply(runtime);
  const shell = useShell(runtime);
  const layers = useLayers(runtime);
  const dock = useDock(runtime);
  const comms = useComms(runtime);
  const board = useMemo(() => runtime.runSync(Effect.map(Talk, (talk) => talk.board)), [runtime]);
  const seen = useExternal(board);
  const mail = useMemo(() => runtime.runSync(MailQuestions), [runtime]);
  const reviewed = useExternal(mail);
  const draftCards = useMessagingDrafts(runtime, shell);
  const acceptingMail = useRef<MailQuestion | undefined>(undefined);
  const sectionRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const focusOnRevealRef = useRef(false);
  const { voice: renderVoice, voicePanel: renderDictation, interim, keyboard, ...speechProps } = speech ?? {};
  const keyboardOwner = useCallback(() => keyboardScope(runtime), [runtime]);
  const { onKeyboard, onDictationKeyboard, takeFocus } = useTalkKeyboard(composerRef, keyboardOwner, keyboard);
  const voicePanel = renderDictation?.(onDictationKeyboard);
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
  const holdMessage = useCallback((held: () => void) => {
    const fiber = runtime.runFork(holdMessagePress(held));
    return () => fiber.interruptUnsafe();
  }, [runtime]);
  const [talking, shown, writing, finding] = [conversation.state, chats.state, composer.state, search.state];
  const free = talking && shown && writing ? freedom(talking, writing, shown.chosen) : { replying: true, holding: true };
  const searchRoute = shell.state?.route;
  const beginSearch = searchRoute === undefined ? undefined : () => void runtime.runPromiseExit(openChatSearch(searchRoute));
  const returnChatFocus = () => focusChatActions(composerRef.current);
  const returnSearchFocus = () => {
    const origin = finding?.origin;
    if (origin?.tag !== "ContactDock") returnChatFocus();
    else if (origin.route === searchRoute) document.getElementById(contactChatActionsId(origin.route, origin.person))?.focus();
  };
  const history = useHistorySheets(chats, search, layers, seen, free, beginSearch, returnChatFocus, returnSearchFocus);
  const page = shown === undefined || (shown.page.status === "Idle" && shown.chosen === 0) ? undefined : seen.pages.get(shown.page.ticket);
  const lines = page?.lines ?? emptyLines;
  const later = page?.bounds?.later;
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
  const [historyRows, newerRows] = useMemo(() => {
    const edge = later === undefined ? -1 : lines.findIndex((line) => line.id === later);
    if (edge < 0 || edge === lines.length - 1) return [messages, undefined] as const;
    const following = new Set(lines.slice(edge + 1).map((line) => line.id));
    const split = messages.findIndex((message) => following.has(message.id));
    return split < 0 ? [messages, undefined] as const : [messages.slice(0, split), messages.slice(split)] as const;
  }, [later, lines, messages]);
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
    if (!question || acceptingMail.current || !composer.can(offer)) return;
    acceptingMail.current = question;
    void (async () => {
      const accepted = await runtime.runPromise(acceptMailReview(question));
      if (mail.snapshot().question !== question) return;
      if (!accepted || !composer.can(offer)) {
        mail.show({ failure: "changed" });
        return;
      }
      const outcome = await composer.send(offer);
      if (outcome._tag !== "Success" || mail.snapshot().question !== question) return;
      mail.attach(question);
      if (!board.snapshot().typed.trim()) type("Summarize this email");
      composerRef.current?.focus();
    })().finally(() => {
      acceptingMail.current = undefined;
    });
  };
  const dismissMail = () => {
    if (acceptingMail.current) return;
    const notice = mail.snapshot().question?.notice;
    mail.show({});
    if (notice) void runtime.runPromise(notice.dismiss());
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
  const earlier = page?.bounds?.earlier;
  const readEarlier = { type: "scroll", around: board.numbered(earlier ?? "") } as const;
  const readLater = { type: "scroll", around: board.numbered(later ?? "") } as const;
  const replyWords = replyBlocks(seen.reply, true).words;
  const onOpenLink = messageActions?.openLink;
  const writingReply = replyWords !== "" ? [{ id: "reply", author: "alpha", text: replyWords, streaming: true, onOpenLink } as const] : [];
  // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"; spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
  const mediaCards = seen.media.filter((card) => !talking.context.sensitive && card.conversation === shown.chosen && card.revision === talking.context.revision).map((card) => ({
    id: `media ${card.id}`, author: "alpha" as const, text: "", children: <DeviceReview runtime={runtime} card={card} />,
  }));
  const offer = seen.recordingSummary;
  const recordingSummary = offer !== undefined && !talking.context.sensitive && offer.conversation === shown.chosen
    && lines.some((line) => !line.mine && line.id === offer.message)
    ? [{ id: `recording summary ${offer.message}`, author: "alpha" as const, text: "",
      children: <RecordingSummaryReview runtime={runtime} offer={offer} /> }] : [];
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
  const textAsk = shell.state?.textAsk.tag === "TextAskVisit";
  const keptHeight = assistantDetent === "Sheet" && dock.state && dock.state.kept > 0 ? dock.state.kept : undefined;
  const openWithFocus = (focusField: boolean) => {
    for (const ask of dockFocused(assistantDetent)) if (ask.tag === "Raise" && shell.can({ type: "raise", detent: ask.detent })) void shell.send({ type: "raise", detent: ask.detent });
    if (focusField) composerRef.current?.focus();
  };
  const revealComposer = () => {
    const typing = { type: "raise", detent: "Typing" } as const;
    if (!shell.can(typing)) return;
    focusOnRevealRef.current = true;
    void shell.send(typing).then((sent) => { if (sent._tag === "Failure") focusOnRevealRef.current = false; });
  };
  const draftEditable = composer.can({ type: "edit", blank: false, long: false });
  const pullFromField = shell.state && browserFieldPull(shell.state, seen.typed === "", draftEditable);
  const grabber = shell.state ? <DockHandle dock={dock} detent={assistantDetent} compact={compact} gesture={gesture} done={done}
    focusOnPointerOpen={currentView !== undefined && !compact} field={composerRef} /> : undefined;
  const live = following !== undefined;
  const scrim = !onComms && !live && !dock.state?.voice && currentView !== "Camera" && (assistantDetent === "Sheet" || assistantDetent === "Typing");

  return (
    <>
      <AssistantAttachments runtime={runtime} attachments={attachments} preview={previewed} notice={seen.attachmentNotice} composerRef={composerRef} />
      {onComms && full && <CommsTarget runtime={runtime} placement="strip" />}
      {scrim ? <ChatScrim typing={assistantDetent === "Typing"} field={composerRef} onLower={() => { if (shell.can(back)) void shell.send(back); }} /> : null}
      {(!onComms || open) && <AssistantConversation
        ref={sectionRef}
        voicePanel={voicePanel}
        detent={live && !onComms ? "sheet" : assistantDetent === "Full" ? "full" : assistantDetent === "Sheet" ? "sheet" : "bar"}
        barDrag={shell.state ? {
          onStart: () => {
            void dock.send({ type: "press", detent: assistantDetent, now: untimed });
            void dock.send({ type: "drag" });
          },
          onRelease: ({ direction, flick, y }) => {
            const height = Math.max(0, Math.round(window.innerHeight - y));
            void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: barHeight, full: window.innerHeight, now: untimed });
          },
          onCancel: () => { void dock.send({ type: "shift", now: untimed }); },
        } : undefined}
        className={onComms ? "relative w-full motion-safe:transition-[height] motion-safe:duration-[420ms]" : open || live ? "fixed inset-x-0 bottom-0 mx-auto max-w-md" : "sticky bottom-0"}
        style={onComms
          ? live ? { height: following, transition: "none" } : assistantDetent === "Full" ? { height: "calc(100dvh - 52px)" } : keptHeight === undefined ? undefined : { height: `clamp(38dvh, ${keptHeight}px, 60dvh)` }
          : live ? { height: following, borderRadius: following >= window.innerHeight ? 0 : undefined } : keptHeight ? { height: keptHeight } : undefined}
        header={{
          title: seen.titles.get(shown.chosen) ?? "Ask Alpha",
          context: { view, selected: talking.context.selected, sensitive: talking.context.sensitive },
          subtitle: onComms ? <CommsTarget runtime={runtime} placement="context" /> : undefined,
          returnOnClose: textAsk,
          onHome: textAsk ? onCloseTextAsk : () => void runtime.runPromise(home()),
          onClose: textAsk ? onCloseTextAsk : open && shell.can({ type: "goBack" }) ? () => void shell.send({ type: "goBack" }).then((lowered) => { if (full && lowered._tag === "Success" && shell.can({ type: "goBack" })) void shell.send({ type: "goBack" }); }) : undefined,
          expanded: assistantDetent === "Full",
          onResize: textAsk ? undefined : assistantDetent === "Full"
            ? () => void shell.send({ type: "goBack" })
            : shell.can({ type: "raise", detent: "Full" }) ? () => void shell.send({ type: "raise", detent: "Full" }) : undefined,
          grabber: open && !textAsk ? grabber : undefined,
        }}
        attachmentNotice={onComms ? undefined : seen.attachmentNotice}
        transcript={{
          messages: historyRows,
          messagesAfterLater: newerRows,
          holdMessage: open ? holdMessage : undefined,
          briefing: brief === "" ? undefined : <AssistantNoticeCard key={`briefing:${subject}`} title="Phone" detail={brief} />,
          liveMessages: [...writingReply, ...draftCards, ...failed, ...mediaCards, ...mediaNote, ...recordingSummary],
          interim: open && shown.around === 0 && !talking.context.sensitive ? interim : undefined,
          position: { page: `${shown.chosen}/${shown.page.ticket}`, around: board.messageId(shown.around), earlier, later },
          visible: open,
          status: shown.page.status === "Loading" ? "loading" : shown.page.status === "Failed" ? "failed" : "loaded",
          turn: status === undefined ? undefined : { status, label: seen.label === "" ? undefined : seen.label, onCheck: checkable ? () => void conversation.send(check) : undefined },
          onRetry: chats.can({ type: "reread" }) ? () => void chats.send({ type: "reread" }) : undefined,
          onEarlier: earlier !== undefined && chats.can(readEarlier) ? () => void chats.send(readEarlier) : undefined,
          onLater: later !== undefined && chats.can(readLater) ? () => void chats.send(readLater) : undefined,
          onReturnToOriginal: chats.can({ type: "returnToOriginal", ...free }) ? () => void chats.send({ type: "returnToOriginal", ...free }) : undefined,
        }}
        composer={{
          ...speechProps,
          ...(live && !open ? { variant: "bar" as const } : {}),
          voice: voicePanel ?? renderVoice?.({ compactDock: compact, atBar: assistantDetent === "Bar", onKeyboard }),
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
              void runtime.runPromise(openAttachmentPicker({ binding: writing.binding, slot: writing.read.ticket, revision: talking.context.revision, authority }, request.room));
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
      <MailReviewDialogs open={!onComms && open} review={reviewed} attach={attachMail} dismiss={dismissMail} />
      {history.sheets}
    </>
  );
}
