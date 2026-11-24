// spec/app/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/app/telephony/phone.md, "Story: Call a number myself"; spec/app/telephony/voicemail.md, "Story: Hear a voicemail"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { Alert, Banner, Button, Chip, ConfirmDialog, EmptyState, Input, ListGroup, ListRow, SearchField, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Delete, Phone as Call, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";
import type { Machine as PhoneMachine, PhoneTab, Recent } from "../../gen/app__telephony__phone.effect.vibe";
import { useMachine as usePhone } from "../../gen/app__telephony__phone.react.ts";
import type { Machine as VoicemailMachine, VoicemailRow } from "../../gen/app__telephony__voicemail.effect.vibe";
import { useMachine as useVoicemail } from "../../gen/app__telephony__voicemail.react.ts";
import { matches, placements } from "./words.ts";

export interface PhoneProps {
  /** Provides Phone's machine, resident, and the Voicemail tab's, the area's own. */
  runtime: ManagedRuntime.ManagedRuntime<PhoneMachine | VoicemailMachine, unknown>;
}

const kinds = { InboundCall: PhoneIncoming, OutboundCall: PhoneOutgoing, MissedCall: PhoneMissed } as const;
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const when = (date: number) => new Date(date).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

/**
 * Phone: Recents, the keypad and Voicemail where the carrier offers it, each control offered exactly when the rules
 * allow it. Only the owner's own Call ever asks Telecom to place a call.
 * @model spec/app/telephony/phone.md
 */
export function Phone({ runtime }: PhoneProps) {
  const phone = usePhone(runtime);
  const voicemail = useVoicemail(runtime);
  if (phone.cause || voicemail.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Phone</Alert>;
  const { state, can, send } = phone;
  if (!state || !voicemail.state) return null;
  const dial = (number: string) => ({ type: "dial", number, valid: normalizePhoneNumber(number) !== null }) as const;
  const typed = state.listQuery.tag === "OwnerQuery" ? state.listQuery.typed : "";
  const query = state.listQuery.tag === "NoQuery" ? "" : state.listQuery.tag === "OwnerQuery" ? state.listQuery.typed : state.listQuery.query;
  const rows = state.rows.filter((row) => matches(query, row.title, row.number));
  const busy = state.call.outcome === "Sent";
  return (
    <section aria-label="Phone" className="flex flex-col gap-4 p-4">
      <Tabs value={state.tab} onValueChange={(tab) => void send({ type: "tabChosen", tab: tab as PhoneTab })}>
        <TabsList aria-label="Phone">
          <TabsTrigger value="RecentsTab">Recents</TabsTrigger>
          <TabsTrigger value="KeypadTab">Keypad</TabsTrigger>
          {state.voicemailReady && <TabsTrigger value="VoicemailTab">Voicemail</TabsTrigger>}
        </TabsList>
        {state.notice.tag === "Placement" && placements[state.notice.outcome] !== "" && <Banner variant="warn">{placements[state.notice.outcome]}</Banner>}
        {busy && <Spinner label="Calling" />}
        <TabsContent value="RecentsTab" className="flex flex-col gap-3">
          <SearchField aria-label="Call or ask" placeholder="Call or ask" value={typed} onValueChange={(value) => void send({ type: "queryTyped", typed: value })} />
          {state.listQuery.tag === "AlphaQuery" && <Chip onClear={() => void send({ type: "queryCleared" })} clearLabel="Clear Alpha's filter">{state.listQuery.label}</Chip>}
          {state.recents.status === "Loading" && state.rows.length === 0 && <Spinner label="Reading recent calls" />}
          {state.notice.tag === "ReadFailed" && <Banner variant="destructive" action={can({ type: "refresh" }) && <Button variant="outline" size="sm" onClick={() => void send({ type: "refresh" })}>Try again</Button>}>Recent calls could not be read</Banner>}
          {state.callLog.grant === "Denied" && (
            <Banner variant="warn" action={can({ type: "allow" }) && <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button>}>
              {can({ type: "allow" }) ? "Phone needs access to your call log" : "Allow call log access for Alpha in Android's settings"}
            </Banner>
          )}
          {state.recents.status === "Loaded" && state.callLog.grant === "Granted" && rows.length === 0 && <EmptyState title={query === "" ? "No recent calls" : "No matching calls"} />}
          {!state.declared && <EmptyState title="No recent calls" />}
          {rows.length > 0 && (
            <ListGroup aria-label="Recent calls">
              {rows.map((row) => <RecentRow key={row.id} row={row} onCall={can(dial(row.number)) ? () => void send(dial(row.number)) : undefined} />)}
            </ListGroup>
          )}
        </TabsContent>
        <TabsContent value="KeypadTab" className="flex flex-col gap-3">
          <Input aria-label="Number" inputMode="tel" value={state.number} disabled={!can({ type: "numberTyped", number: state.number })} onChange={(event) => void send({ type: "numberTyped", number: event.target.value })} />
          {state.notice.tag === "InvalidNumber" && <Alert variant="warn">Check the number</Alert>}
          <div role="group" aria-label="Keypad" className="grid grid-cols-3 gap-2">
            {keys.map((key) => {
              const pressed = { type: "numberTyped", number: (state.number + key).slice(0, 40) } as const;
              return <Button key={key} variant="secondary" size="lg" disabled={!can(pressed)} onClick={() => void send(pressed)}>{key}</Button>;
            })}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" aria-label="Call" disabled={!can(dial(state.number))} loading={busy} onClick={() => void send(dial(state.number))}><Call /></Button>
            <Button variant="ghost" size="icon" aria-label="Erase" disabled={state.number === "" || !can({ type: "numberTyped", number: state.number.slice(0, -1) })} onClick={() => void send({ type: "numberTyped", number: state.number.slice(0, -1) })}><Delete /></Button>
          </div>
        </TabsContent>
        {state.voicemailReady && (
          <TabsContent value="VoicemailTab">
            <Voicemails runtime={runtime} onCallBack={(number) => void send({ type: "keypadAsked", number })} />
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}

function RecentRow({ row, onCall }: { row: Recent; onCall: (() => void) | undefined }) {
  const Kind = kinds[row.kind];
  return (
    <ListRow
      leading={<Kind className={row.kind === "MissedCall" ? "text-destructive" : undefined} aria-label={row.kind === "MissedCall" ? "Missed" : row.kind === "OutboundCall" ? "Outgoing" : "Incoming"} />}
      title={row.title || row.number}
      detail={when(row.date)}
      trailing={onCall && <Button variant="ghost" size="icon" aria-label={`Call ${row.title || row.number}`} onClick={onCall}><Call /></Button>}
    />
  );
}

const transcripts = { TranscriptRunning: "Transcribing on this phone", TranscriptFailed: "No words were heard", TranscriptUnavailable: "This phone cannot transcribe voicemail yet" } as const;

/** The Voicemail tab: the carrier's voicemail, one open at a time with its audio, transcript and a confirmed delete. */
function Voicemails({ runtime, onCallBack }: { runtime: PhoneProps["runtime"]; onCallBack: (number: string) => void }) {
  const { state, can, send } = useVoicemail(runtime);
  if (!state) return null;
  const { opened } = state;
  const open = state.rows.find((row) => row.id === opened.openId);
  const deleting = state.deletion.outcome === "Sent";
  return (
    <div className="flex flex-col gap-3">
      {state.list.status === "Loading" && <Spinner label="Reading voicemail" />}
      {state.deleteFailed && <Banner variant="destructive">{state.writeBlocked ? "Alpha cannot tell whether the voicemail was deleted. Refresh before changing voicemail again." : "The voicemail was not deleted"}</Banner>}
      {state.writeBlocked && can({ type: "refresh", explicit: true }) && <Button variant="outline" onClick={() => void send({ type: "refresh", explicit: true })}>Refresh</Button>}
      {state.rows.length === 0 && state.list.status === "Loaded" && <EmptyState title="No voicemail" />}
      <ListGroup aria-label="Voicemail">
        {state.rows.map((row: VoicemailRow) => (
          <ListRow key={row.id} aria-label={row.title || row.number || "Unknown caller"} title={row.title || row.number || "Unknown caller"} detail={`${when(row.date)} · ${row.seconds}s`} selected={row.id === opened.openId}
            trailing={row.fresh ? <span className="size-2 rounded-full bg-primary" aria-label="New" /> : undefined}
            disabled={!can({ type: "voicemailOpened", voicemail: row.id })} onClick={() => void send({ type: "voicemailOpened", voicemail: row.id })} />
        ))}
      </ListGroup>
      {open && (
        <section aria-label="Open voicemail" className="flex flex-col gap-2">
          {opened.audio === "AudioFetching" && <Spinner label="Getting the audio" />}
          {opened.audio === "AudioFailed" && can({ type: "audioAsked" }) && <Button variant="outline" onClick={() => void send({ type: "audioAsked" })}>Get the audio again</Button>}
          {opened.source !== "" && (
            <audio
              src={opened.source}
              ref={(element) => {
                if (!element) return;
                if (opened.playback === "Playing" && element.paused) void element.play()?.catch(() => void send({ type: "paused" }));
                else if (opened.playback !== "Playing" && !element.paused) element.pause();
              }}
              onEnded={() => void send({ type: "playbackEnded" })}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {can({ type: "played" }) && <Button onClick={() => void send({ type: "played" })}>Play</Button>}
            {can({ type: "paused" }) && <Button variant="secondary" onClick={() => void send({ type: "paused" })}>Pause</Button>}
            {can({ type: "transcriptAsked" }) && <Button variant="outline" onClick={() => void send({ type: "transcriptAsked" })}>Transcribe</Button>}
            {open.number !== "" && <Button variant="outline" onClick={() => onCallBack(open.number)}>Call back</Button>}
            {can({ type: "deleteAsked" }) && <Button variant="destructive" onClick={() => void send({ type: "deleteAsked" })}>Delete</Button>}
          </div>
          {state.inCall && <Alert variant="warn">Voicemail does not play during a call</Alert>}
          {opened.transcript === "TranscriptDone" ? <p>{opened.words}</p> : opened.transcript !== "TranscriptNone" && <p className="text-muted-foreground">{transcripts[opened.transcript]}</p>}
          <ConfirmDialog open={opened.confirming} title="Delete this voicemail?" confirmLabel="Delete" destructive loading={deleting}
            onConfirm={() => void send({ type: "deleteStarted" })} onCancel={() => void (can({ type: "deleteDeclined" }) && send({ type: "deleteDeclined" }))} />
        </section>
      )}
    </div>
  );
}
