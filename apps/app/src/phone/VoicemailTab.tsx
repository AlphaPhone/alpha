// spec/app/phone/voicemail.md, "Story: See my voicemail"; spec/app/phone/voicemail.md, "Story: Listen to a voicemail"; spec/app/phone/voicemail.md, "Story: Read what was said"; spec/app/phone/voicemail.md, "Story: Answer a voicemail"; spec/app/phone/voicemail.md, "Story: Delete a voicemail"
import type { ListedVoicemail } from "@elizaos/os-bridges";
import { Banner, Button, Slider, Spinner, cn, focusRing } from "@repo/ui";
import { Effect } from "effect";
import { useSyncExternalStore } from "react";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { useMachine as useVoicemail } from "../../gen/app__phone__voicemail.react.ts";
import type { PhoneProps } from "./Phone.tsx";
import { CallAvatar } from "./CallAvatar.tsx";
import { Player, Voicemails, askVoicemailDeletion } from "./voicemail.vibe";
import { callerTitle, clockLength, shortWhen } from "./words.ts";
import { Bin, Bubble, Close, Handset, PauseGlyph, PlayGlyph, RetryGlyph } from "./icons.ts";

type Props = Pick<PhoneProps, "runtime"> & { now: number };

const playbackPlaceholder = "size-11 shrink-0 rounded-full bg-accent motion-safe:animate-pulse";
const action = "flex-1 bg-background hover:bg-accent";

function Position({ runtime, length, enabled }: Pick<Props, "runtime"> & { length: number; enabled: boolean }) {
  const player = runtime.runSync(Effect.flatMap(Player, (service) => service.controls()));
  const position = useSyncExternalStore(player.subscribe, player.position, () => 0);
  return (
    <>
      <Slider aria-label="Position" aria-valuetext={clockLength(position)} className="min-w-0 flex-1"
        min={0} max={Math.max(1, length)} value={Math.min(position, length)} disabled={!enabled || length === 0} onValueChange={player.seek} />
      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{clockLength(position)} / {clockLength(length)}</span>
    </>
  );
}

function OpenVoicemail({ runtime, row, label, title, date }: Pick<Props, "runtime"> & {
  row: ListedVoicemail;
  label: string;
  title: string;
  date: string;
}) {
  const { state, can, send } = useVoicemail(runtime);
  const phone = usePhone(runtime);
  if (!state || !phone.state) return null;
  const held = runtime.runSync(Effect.flatMap(Voicemails, (store) => store.get()));
  const busy = state.removal.outcome === "Sent";
  const live = phone.state.telecom === "OrdinaryCall" || phone.state.telecom === "MaybeEmergencyCall";
  const play = { type: "play", live } as const;
  const pause = { type: "pause" } as const;
  const message = { type: "reach", how: "Message" } as const;
  const call = { type: "reach", how: "CallBack" } as const;
  const canCall = phone.can({ type: "dialVoicemail", number: row.number });
  return (
    <section aria-label="Open voicemail" data-alpha-phone-voicemail-open="" className="mx-4 my-2 flex flex-col gap-3.5 rounded-panel bg-secondary p-3.5">
      <button type="button" aria-label={label} aria-expanded="true" className={cn(focusRing, "flex min-h-11 items-center gap-3 text-left")}
        disabled={!can({ type: "close" }) || busy} onClick={() => void send({ type: "close" })}>
        <CallAvatar name={title} raised />
        <span className="min-w-0 flex-1 truncate text-md font-bold">{title}</span>
        <span className="shrink-0 text-sm text-muted-foreground">{date}</span>
      </button>
      {state.carrierText && row.carrierTranscript !== null && <p className="text-lg leading-transcript wrap-anywhere" data-alpha-phone-transcript="">{row.carrierTranscript}</p>}
      {state.transcript.status === "Loaded" && held.transcript !== "" && <p className="text-lg leading-transcript wrap-anywhere" data-alpha-phone-transcript="">{held.transcript}</p>}
      {state.transcript.status === "Loading" && <div role="status" aria-label="Transcribing" className="h-4 w-3/5 rounded-full bg-accent motion-safe:animate-pulse" />}
      {state.transcript.status === "Failed" && <p className="text-sm text-muted-foreground">No words were heard</p>}
      {state.noRecognizer && <p className="text-sm text-muted-foreground">No transcript is available on this phone</p>}
      <div className="flex items-center gap-3">
        {state.audio.status === "Loading" && <div role="status" aria-label="Loading audio" className={playbackPlaceholder} />}
        {can({ type: "retryAudio" }) && <Button size="icon" variant="ghost" className="bg-background" aria-label="Try again" onClick={() => void send({ type: "retryAudio" })}><RetryGlyph className="size-5" /></Button>}
        {state.audio.status === "Loaded" && (
          <Button size="icon" className={cn("bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80", state.confirming && "disabled:opacity-100")} data-alpha-phone-play=""
            aria-label={state.playback === "Playing" ? "Pause" : "Play"} disabled={!can(pause) && !can(play)}
            onClick={() => void send(can(pause) ? pause : play)}>
            {state.playback === "Playing" ? <PauseGlyph className="size-4.5" /> : <PlayGlyph className="size-4.5" />}
          </Button>
        )}
        <Position runtime={runtime} length={row.durationSeconds} enabled={state.audio.status === "Loaded" && !state.confirming && !busy} />
      </div>
      {live && <p role="status" className="text-sm text-muted-foreground">Voicemail does not play during a call</p>}
      {state.confirming ? (
        <div role="group" aria-label="Delete voicemail" className="flex gap-2">
          <Button variant="ghost" size="icon" className={cn(action, "w-auto")} disabled={!can({ type: "keep" }) || busy}
            aria-label="Keep" onClick={() => void send({ type: "keep" })}><Close className="size-5" /></Button>
          <Button variant="destructive" className="h-11 flex-2 justify-start px-0 text-md" disabled={!can({ type: "confirmDelete" }) || busy}
            data-alpha-phone-voicemail-confirm="" onClick={() => void send({ type: "confirmDelete" })}>Delete</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {row.number !== "" && can(call) && <Button variant="ghost" size="icon" className={cn(action, "w-auto")} aria-label="Call back" disabled={!canCall} onClick={() => void send(call)}><Handset className="size-5" /></Button>}
          {row.number !== "" && can(message) && <Button variant="ghost" size="icon" className={cn(action, "w-auto")} aria-label="Message" onClick={() => void send(message)}><Bubble className="size-5" /></Button>}
          {can({ type: "askDelete" }) && <Button variant="ghost" size="icon" className={cn(action, "w-auto text-hangup")} aria-label="Delete"
            data-alpha-phone-voicemail-delete="" onClick={() => void runtime.runPromise(askVoicemailDeletion(row.id))}><Bin className="size-5" /></Button>}
        </div>
      )}
    </section>
  );
}

/** The carrier's list and its one expanded voicemail, with a player and inline delete confirmation. @model spec/app/phone/voicemail.md */
export function VoicemailTab({ runtime, now }: Props) {
  const { state, can, send } = useVoicemail(runtime);
  if (!state) return null;
  const held = runtime.runSync(Effect.flatMap(Voicemails, (store) => store.get()));
  const rows = state.items > 0 ? held.rows : [];
  const open = async (row: ListedVoicemail) => {
    const opening = { type: "open", carrierText: row.carrierTranscript !== null } as const;
    if (!can(opening)) return;
    runtime.runSync(Effect.flatMap(Voicemails, (store) => store.set({ open: row.id, audio: "", transcript: "" })));
    await send(opening);
  };
  return (
    <div>
      {state.list.status === "Loading" && rows.length === 0 && <div className="flex justify-center p-5"><Spinner label="Reading voicemail" /></div>}
      {state.list.status === "Failed" && <Banner variant="destructive" className="mx-4">Voicemail could not be read</Banner>}
      {state.removal.outcome === "Sent" && (
        <Banner className="mx-4" action={can({ type: "undoRemoval" }) && <Button size="sm" onClick={() => void send({ type: "undoRemoval" })}>Undo</Button>}>
          {state.undo === "CanUndo" ? "Voicemail deletion queued" : state.undo === "Undoing" ? "Keeping voicemail…" : state.undo === "KeepUnconfirmed" ? "Couldn’t confirm Undo" : "Deleting voicemail…"}
        </Banner>
      )}
      {state.undo === "Kept" && <Banner className="mx-4">Voicemail kept</Banner>}
      {state.removal.outcome === "Unknown" && <Banner variant="warn" className="mx-4">Alpha cannot tell whether the voicemail was deleted</Banner>}
      {state.removal.outcome === "Refused" && state.undo !== "Kept" && state.open && <Banner variant="destructive" className="mx-4">The voicemail was not deleted</Banner>}
      {rows.map((row) => {
        const title = callerTitle(row.number, row.cachedName);
        const date = shortWhen(row.date, now);
        const current = row.id === held.open && state.open;
        const unread = !row.heard && !(current && state.heard);
        const label = `Voicemail from ${title}, ${date}${unread ? ", new" : ""}`;
        if (current) return <OpenVoicemail key={row.id} runtime={runtime} row={row} label={label} title={title} date={date} />;
        return (
          <button type="button" key={row.id} aria-label={label} aria-expanded="false" onClick={() => void open(row)}
            disabled={state.confirming || state.removal.outcome === "Sent"}
            className={cn(focusRing, "flex min-h-16 w-full items-start gap-3 px-5 py-2.5 text-left")}>
            <CallAvatar name={title} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                {unread && <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />}
                <span className={cn("min-w-0 flex-1 truncate text-md", unread ? "font-bold" : "font-semibold")}>{title}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{date}</span>
              </span>
              {row.carrierTranscript !== null && <span className="line-clamp-2 text-base text-muted-foreground">{row.carrierTranscript}</span>}
            </span>
            <span className="shrink-0 text-caption text-muted-foreground tabular-nums">{clockLength(row.durationSeconds)}</span>
          </button>
        );
      })}
    </div>
  );
}
