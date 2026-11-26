// spec/app/messages/index.md, "Story: Start a new message"; spec/app/messages/composer.md, "The owner's New message uses the same send and never takes another draft's place"
import { MMS_ATTACHMENT_TYPES, MMS_MAX_ATTACHMENTS, MMS_MAX_BODY } from "@elizaos/os-bridges";
import type { TelephonySubscription } from "@elizaos/os-bridges";
import { Button, Input, Menu, MenuContent, MenuItem, MenuTrigger, Textarea } from "@repo/ui";
import { Effect } from "effect";
import { ArrowUp, Camera, ImagePlus, Mic, Plus, RefreshCw, Square, X } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import type { NewDraft } from "../../gen/app__messages.ts";
import { useMachine as useComposer } from "../../gen/app__messages__composer.react.ts";
import { busy, uncertain } from "../../gen/app__messages__sending.ts";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { useMachine as useVoice } from "../../gen/app__voice.react.ts";
import { CommsBar } from "../phone/CommsBar.tsx";
import { callerInitials } from "../phone/words.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Drafts, attachNewPictures, editNewMessage, handOffNewMessage, messageRecipients, newDraftHeld, requestNewAccess, sameSubscription, sendNewMessage, supported, type NewMessageDraft } from "./composer.vibe";
import { dictateNewMessage } from "./dictation.vibe";
import { Inbox, titleOf } from "./messages.vibe";
import type { MessagesProps } from "./Messages.tsx";

const textAction = "min-h-11 underline focus-visible:outline-2 focus-visible:outline-ring";

interface NewMessageDockProps {
  readonly runtime: MessagesProps["runtime"];
  readonly scope: NewDraft;
  readonly draft: NewMessageDraft;
  readonly textarea: RefObject<HTMLTextAreaElement | null>;
  readonly minHeight: number | undefined;
  readonly body: string;
  readonly saveStatus: "Saving" | "Failed" | undefined;
  readonly textIsSaved: () => boolean;
  readonly onBody: (body: string) => void;
  readonly onRetrySave: () => void;
}

export function NewMessageDock({ runtime, scope, draft, textarea, minHeight, body, saveStatus, textIsSaved, onBody, onRetrySave }: NewMessageDockProps) {
  const composer = useComposer(runtime);
  const phone = usePhone(runtime);
  const voice = useVoice(runtime);
  const [selected, setSelected] = useState<TelephonySubscription>();
  const pictures = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const chooserRevision = useRef<number | undefined>(undefined);
  const state = composer.state;
  if (!state || !phone.state) return <CommsBar runtime={runtime} />;

  const { visit, recipient, revision, picking } = scope;
  const addresses = messageRecipients(draft.recipients);
  const held = runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.get()));
  const names = new Map(held.names);
  for (const contact of held.choices) {
    for (const number of contact.phones) names.set(number, contact.name);
  }
  const title = titleOf(addresses, names);
  const first = /^[+(\d]/u.test(title) || title.includes(",") ? title : title.split(/\s+/u, 1)[0];
  const label = first ? `Text ${first}` : "Message";
  const editable = !newDraftHeld(state, revision);
  const hasContent = Boolean(body.trim()) || draft.pictures.length > 0;
  const saved = saveStatus === undefined && draft.revision === revision && body === draft.body;
  const sending = state.newSend.revision === revision && busy(state.outgoing);
  const checking = state.newSend.revision === revision && uncertain(state.outgoing);
  const supportedSend = runtime.runSync(supported(addresses.length, draft.pictures.length));
  const canPicture = editable && saved && !picking && draft.pictures.length < MMS_MAX_ATTACHMENTS && runtime.runSync(supported(1, 1));
  const canSend = saved && hasContent && !picking && (checking || state.sims <= 1 || selected !== undefined)
    && composer.can({ type: "sendNew", thread: recipient, recipients: addresses.length, visit, revision, supported: supportedSend, clear: clear(phone.state) });
  const subscriptions = runtime.runSync(Effect.flatMap(Drafts, (store) => store.subscriptions()));
  const recorder = voice.state?.recorder;
  const recording = recorder?.field === "MessagesBar" && recorder.stage !== "Closed";
  const stop = { type: "stopRecording", now: untimed } as const;
  const dismiss = { type: "closeRecorder" } as const;
  const retry = { type: "transcribeAgain", now: untimed } as const;
  const chooseFile = (input: HTMLInputElement | null) => {
    if (!textIsSaved()) return;
    chooserRevision.current = revision;
    input?.click();
  };
  return <>
    <div className="flex shrink-0 flex-wrap gap-1.5 px-3 text-caption text-muted-foreground empty:hidden">
      {(saveStatus === "Saving" || saveStatus === undefined && !saved) && <p role="status" className="basis-full">Saving message draft…</p>}
      {saveStatus === "Failed" && <p role="status" className="basis-full">Message draft couldn’t be saved <button type="button" className={textAction} onClick={onRetrySave}>Retry save</button></p>}
      {sending && <p role="status" className="basis-full">Sending…</p>}
      {checking && <p role="status" className="basis-full">Alpha is still waiting for the send result</p>}
      {state.pendingClear.source === "NewMessageDraft" && state.pendingClear.revision === revision && composer.can({ type: "clearSentDraft" }) && <button
        type="button" className={textAction} onClick={() => void composer.send({ type: "clearSentDraft" })}>Finish updating the saved draft</button>}
      {state.newSend.revision === revision && state.outgoing.denied && <p role="status" className="basis-full">The phone did not send the message</p>}
      {(["SendAccess", "SimAccess"] as const).map((need) => {
        if (need === "SimAccess" && state.sims <= 1) return null;
        const allow = composer.can({ type: "allowNew", need });
        const settings = composer.can({ type: "settingsNew", need });
        if (!allow && !settings) return null;
        const access = need === "SendAccess" ? "SMS send" : "SIM";
        return <button key={need} type="button" className={textAction} onClick={() => void runtime.runPromise(requestNewAccess(visit, need, settings))}>
          {`${settings ? "Open Settings for" : "Allow"} ${access} access`}
        </button>;
      })}
      {editable && saved && !picking && !supportedSend && recipient > 0 && draft.body.trim() && draft.pictures.length === 0 && <button type="button" className={textAction}
        onClick={() => { if (textIsSaved()) void runtime.runPromise(handOffNewMessage(visit, revision)); }}>Review in messaging app</button>}
      {(state.sims > 1 || selected !== undefined && state.sims === 1) && <div role="group" aria-label="SIM" className="flex flex-wrap gap-1.5">
        {subscriptions.map((sim) => <Button key={sim.id} variant="secondary" aria-pressed={selected !== undefined && sameSubscription(selected, sim)}
          disabled={!editable || state.simInfo.grant !== "Granted"} onClick={() => setSelected(sim)}>{sim.displayName || `SIM ${sim.slot + 1}`}</Button>)}
      </div>}
      {draft.pictures.map((picture) => <Button key={picture.name} variant="secondary" aria-label={`Remove ${picture.name}`} disabled={!editable || !saved}
        onClick={() => { if (textIsSaved()) void runtime.runPromise(editNewMessage(visit, { pictures: draft.pictures.filter((one) => one !== picture) }, false, revision)); }}>
        {picture.name}<X aria-hidden />
      </Button>)}
    </div>
    <CommsBar runtime={runtime} {...(title ? { person: { label: title, initials: callerInitials(title) } } : {})} closed={recording ? (
      <div data-alpha-composer data-alpha-bar-recorder="" aria-label="Message dictation" role="group" className="flex min-w-0 flex-1 items-center gap-2">
        <span role="status" className="min-w-0 flex-1 text-sm">{recorder.stage === "Recording" ? "Recording" : recorder.stage === "Recorded" ? "Couldn’t transcribe" : recorder.stage === "Transcribing" ? "Transcribing" : "Starting microphone"}</span>
        {voice.can(retry) && <Button variant="ghost" size="icon" aria-label="Try transcription again" onClick={() => void voice.send(retry)}><RefreshCw /></Button>}
        {voice.can(dismiss) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void voice.send(dismiss)}><X /></Button>}
        {voice.can(stop) && <Button size="icon" aria-label="Stop recording" onClick={() => void voice.send(stop)}><Square fill="currentColor" /></Button>}
      </div>
    ) : (
      <div data-alpha-composer data-alpha-messages-composer className="flex min-w-0 flex-1 items-center gap-1">
        {canPicture && <Menu>
          <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Message attachments"><Plus /></Button></MenuTrigger>
          <MenuContent aria-label="Message actions" side="top" sideOffset={8}>
            <MenuItem onSelect={() => chooseFile(camera.current)}><Camera />Camera</MenuItem>
            <MenuItem onSelect={() => chooseFile(pictures.current)}><ImagePlus />Add media</MenuItem>
          </MenuContent>
        </Menu>}
        <Textarea ref={textarea} rows={1} aria-label={label} placeholder={label} value={body} maxLength={MMS_MAX_BODY} readOnly={!editable}
          onChange={(event) => onBody(event.currentTarget.value)} style={minHeight === undefined ? undefined : { minHeight }}
          className="max-h-[min(10.5rem,28dvh)] min-h-11 min-w-0 flex-1 overflow-y-auto rounded-none border-0 bg-transparent py-2.75 pr-0.5 pl-2 text-body leading-field shadow-none focus-visible:outline-none" />
        {([["Attach a picture", pictures, false], ["Take a picture", camera, true]] as const).map(([name, input, capture]) => <Input
          key={name} ref={input} type="file" hidden className="hidden" aria-label={name} multiple={!capture} capture={capture ? "environment" : undefined}
          accept={MMS_ATTACHMENT_TYPES.join(",")} disabled={!canPicture} onChange={(event) => {
            const files = [...(event.currentTarget.files ?? [])];
            event.currentTarget.value = "";
            const picked = chooserRevision.current;
            chooserRevision.current = undefined;
            if (picked !== undefined && files.length > 0) void runtime.runPromise(attachNewPictures(visit, picked, files));
          }} />)}
        {hasContent && <Button size="icon" className="disabled:opacity-100" aria-label={checking ? "Check send status" : "Send"} data-alpha-bar-send disabled={!canSend}
          onClick={(event) => { if (textIsSaved()) void runtime.runPromise(sendNewMessage(visit, revision, selected, event.nativeEvent.isTrusted)); }}>{checking ? <RefreshCw /> : <ArrowUp />}</Button>}
        {editable && phone.state.telecom === "NoCall" && voice.can({ type: "openRecorder", target: "MessagesBar" }) && <Button variant="ghost" size="icon"
          aria-label={`Dictate a text to ${first || "them"}`} disabled={picking || !saved} onClick={() => { if (textIsSaved()) void runtime.runPromise(dictateNewMessage(visit, revision)); }}><Mic /></Button>}
      </div>
    )} />
  </>;
}
