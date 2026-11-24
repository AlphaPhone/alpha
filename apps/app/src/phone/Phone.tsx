// spec/app/phone/index.md, "Story: See my recent calls"; spec/app/phone/index.md, "Story: Give Alpha the call log"; spec/app/phone/index.md, "Story: Type a number"; spec/app/phone/index.md, "Story: Call a number"; spec/app/phone/voicemail.md, "Story: Listen to a voicemail"; spec/app/phone/voicemail.md, "Story: Delete a voicemail"
import type { TelephonyCallLogEntry } from "@elizaos/os/bridges/phone";
import { Alert, Banner, Button, Chip, ConfirmDialog, EmptyState, ListGroup, ListRow, SearchField, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Delete, Phone as Call, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";
import { useState } from "react";
import type { Machine as PhoneMachine, Tab } from "../../gen/app__phone.effect.vibe";
import { dialable, historyFailed, logNeeded, noCalls, noMatchingCalls } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as VoicemailMachine } from "../../gen/app__phone__voicemail.effect.vibe";
import { useMachine as useVoicemail } from "../../gen/app__phone__voicemail.react.ts";
import { Dialer } from "./phone.vibe";
import { Voicemails } from "./voicemail.vibe";
import { judge, when } from "./words.ts";
import { CommsBar, type CommsServices } from "./CommsBar.tsx";

export interface PhoneProps {
  /** Provides Phone's and Voicemail's machines, both resident, and what they count. */
  runtime: ManagedRuntime.ManagedRuntime<PhoneMachine | VoicemailMachine | Dialer | Voicemails | CommsServices, unknown>;
}

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const missed = new Set(["missed", "rejected", "blocked"]);

/**
 * Phone: Recents, the Keypad and Voicemail, each control offered exactly when the rules allow it. A call is handed to
 * the phone's own dialer; Alpha never places one.
 * @model spec/app/phone/index.md
 */
export function Phone({ runtime }: PhoneProps) {
  const phone = usePhone(runtime);
  const [query, setQuery] = useState("");
  if (phone.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Phone</Alert>;
  const { state, can, send } = phone;
  if (!state) return null;
  const dialer = runtime.runSync(Dialer.use((held) => held.get()));
  const set = (change: Parameters<Dialer["set"]>[0]) => runtime.runSync(Dialer.use((held) => held.set(change)));
  const search = (typed: string) => {
    setQuery(typed);
    set({ sought: typed });
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (can(event)) void send(event);
  };
  const press = (key: string) => {
    const digits = dialer.digits + key;
    const event = { type: "press", typed: judge(digits) } as const;
    if (!can(event)) return;
    set({ digits });
    void send(event);
  };
  const takeBack = () => {
    const digits = dialer.digits.slice(0, -1);
    const event = { type: "takeBack", typed: judge(digits) } as const;
    if (!can(event)) return;
    set({ digits });
    void send(event);
  };
  const dialRecent = (row: TelephonyCallLogEntry) => void send({ type: "dialRecent", number: row.number });
  const rows = state.rows > 0 ? dialer.rows : [];
  return (
    <section aria-label="Phone" className="flex flex-col gap-4 p-4">
      <Tabs value={state.tab} onValueChange={(tab) => void (can({ type: "pickTab", tab: tab as Tab }) && send({ type: "pickTab", tab: tab as Tab }))}>
        <TabsList aria-label="Phone">
          <TabsTrigger value="Recents">Recents</TabsTrigger>
          <TabsTrigger value="Keypad">Keypad</TabsTrigger>
          <TabsTrigger value="Voicemail">Voicemail</TabsTrigger>
        </TabsList>
        {state.failedDial && <Banner variant="destructive">Couldn't open the dialer</Banner>}
        <TabsContent value="Recents" className="flex flex-col gap-3">
          <SearchField aria-label="Call or ask" placeholder="Call or ask" value={query} onValueChange={search} />
          {state.sought && <Chip onClear={() => search("")} clearLabel="Clear the search">{query}</Chip>}
          <div className="flex gap-2" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "AllCalls" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "AllCalls" }) && state.chip !== "AllCalls"} onClick={() => void send({ type: "pickChip", chip: "AllCalls" })}>All</Button>
            <Button size="sm" variant={state.chip === "MissedCalls" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "MissedCalls" }) && state.chip !== "MissedCalls"} onClick={() => void send({ type: "pickChip", chip: "MissedCalls" })}>Missed</Button>
          </div>
          {state.recents.status === "Loading" && rows.length === 0 && <Spinner label="Reading recent calls" />}
          {logNeeded(state) && (
            <Banner variant="warn" action={can({ type: "allow" }) ? <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button> : can({ type: "goToSettings" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "goToSettings" })}>Open Settings</Button>}>
              Phone needs access to your call log
            </Banner>
          )}
          {historyFailed(state) && <Banner variant="destructive" action={can({ type: "retry" }) && <Button variant="outline" size="sm" onClick={() => void send({ type: "retry" })}>Retry call history</Button>}>Recent calls could not be read</Banner>}
          {noCalls(state) && <EmptyState title={noMatchingCalls(state) ? "No matching calls" : state.chip === "MissedCalls" ? "No missed calls" : "No recent calls"} />}
          {rows.length > 0 && (
            <ListGroup aria-label="Recent calls">
              {rows.map((row) => (
                <RecentRow key={row.id} row={row} onCall={can({ type: "dialRecent", number: row.number }) ? () => dialRecent(row) : undefined} />
              ))}
            </ListGroup>
          )}
        </TabsContent>
        <TabsContent value="Keypad" className="flex flex-col gap-3">
          <output aria-label="Number" className="min-h-10 text-center text-2xl tabular-nums">{dialer.digits}</output>
          {state.matched && dialer.matched !== "" && <p className="text-center text-muted-foreground">{dialer.matched}</p>}
          {state.typed === "Dialable" && !state.carrier && <Alert variant="warn">No mobile network: only an emergency number can be called</Alert>}
          <div role="group" aria-label="Keypad" className="grid grid-cols-3 gap-2">
            {keys.map((key) => (
              <Button key={key} variant="secondary" size="lg" disabled={!can({ type: "press", typed: judge(dialer.digits + key) })} onClick={() => press(key)}>{key}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" aria-label="Call" disabled={!can({ type: "dialTyped" }) || !dialable(state)} onClick={() => void send({ type: "dialTyped" })}><Call /></Button>
            <Button variant="ghost" size="icon" aria-label="Erase" disabled={!can({ type: "takeBack", typed: judge(dialer.digits.slice(0, -1)) })} onClick={takeBack}><Delete /></Button>
          </div>
        </TabsContent>
        <TabsContent value="Voicemail">
          <VoicemailTab runtime={runtime} />
        </TabsContent>
      </Tabs>
      <CommsBar runtime={runtime} />
    </section>
  );
}

function RecentRow({ row, onCall }: { row: TelephonyCallLogEntry; onCall: (() => void) | undefined }) {
  const Kind = missed.has(row.type) ? PhoneMissed : row.type === "outgoing" ? PhoneOutgoing : PhoneIncoming;
  const title = row.cachedName ?? row.number;
  return (
    <ListRow
      leading={<Kind className={missed.has(row.type) ? "text-destructive" : undefined} aria-label={missed.has(row.type) ? "Missed" : row.type === "outgoing" ? "Outgoing" : "Incoming"} />}
      title={title}
      detail={when(row.date)}
      trailing={onCall && <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={onCall}><Call /></Button>}
    />
  );
}

/** The Voicemail tab: the carrier's voicemail, one open at a time with its audio, transcript and a confirmed delete. */
function VoicemailTab({ runtime }: PhoneProps) {
  const { state, can, send } = useVoicemail(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone) return null;
  const held = runtime.runSync(Voicemails.use((store) => store.get()));
  const rows = state.items > 0 ? held.rows : [];
  const open = state.open ? held.rows.find((row) => row.id === held.open) : undefined;
  const live = phone.telecom === "OrdinaryCall" || phone.telecom === "MaybeEmergencyCall";
  return (
    <div className="flex flex-col gap-3">
      {state.list.status === "Loading" && rows.length === 0 && <Spinner label="Reading voicemail" />}
      {state.list.status === "Failed" && <Banner variant="destructive">Voicemail could not be read</Banner>}
      {state.removal.outcome === "Unknown" && <Banner variant="warn">Alpha cannot tell whether the voicemail was deleted</Banner>}
      {state.removal.outcome === "Refused" && state.open && <Banner variant="destructive">The voicemail was not deleted</Banner>}
      {state.list.status === "Loaded" && state.items === 0 && <EmptyState title="No voicemail" />}
      <ListGroup aria-label="Voicemail">
        {rows.map((row) => {
          const title = row.cachedName ?? (row.number || "Unknown caller");
          const opening = { type: "open", carrierText: row.carrierTranscript !== null } as const;
          return (
            <ListRow key={row.id} aria-label={title} title={title} detail={`${when(row.date)} · ${row.durationSeconds}s`} selected={row.id === held.open && state.open}
              trailing={row.heard ? undefined : <span className="size-2 rounded-full bg-primary" aria-label="Unheard" />}
              disabled={!can(opening)} onClick={() => {
                runtime.runSync(Voicemails.use((store) => store.set({ open: row.id, audio: "", transcript: "" })));
                void send(opening);
              }} />
          );
        })}
      </ListGroup>
      {open && (
        <section aria-label="Open voicemail" className="flex flex-col gap-2">
          {state.audio.status === "Loading" && <Spinner label="Getting the audio" />}
          {can({ type: "retryAudio" }) && <Button variant="outline" onClick={() => void send({ type: "retryAudio" })}>Get the audio again</Button>}
          <div className="flex flex-wrap gap-2">
            {can({ type: "play", live }) && <Button onClick={() => void send({ type: "play", live })}>Play</Button>}
            {can({ type: "pause" }) && <Button variant="secondary" onClick={() => void send({ type: "pause" })}>Pause</Button>}
            {can({ type: "reach", how: "CallBack" }) && <Button variant="outline" onClick={() => void send({ type: "reach", how: "CallBack" })}>Call back</Button>}
            {can({ type: "reach", how: "Message" }) && <Button variant="outline" onClick={() => void send({ type: "reach", how: "Message" })}>Message</Button>}
            {can({ type: "askDelete" }) && <Button variant="destructive" onClick={() => void send({ type: "askDelete" })}>Delete</Button>}
            {can({ type: "close" }) && <Button variant="ghost" onClick={() => void send({ type: "close" })}>Close</Button>}
          </div>
          {live && <Alert variant="warn">Voicemail does not play during a call</Alert>}
          {state.carrierText && open.carrierTranscript !== null && <p>{open.carrierTranscript}</p>}
          {state.transcript.status === "Loading" && <p className="text-muted-foreground">Transcribing on this phone</p>}
          {state.transcript.status === "Loaded" && held.transcript !== "" && <p>{held.transcript}</p>}
          {state.transcript.status === "Failed" && <p className="text-muted-foreground">No words were heard</p>}
          {state.noRecognizer && <p className="text-muted-foreground">No transcript is available on this phone</p>}
          <ConfirmDialog open={state.confirming} title="Delete this voicemail?" confirmLabel="Delete" destructive
            onConfirm={() => void (can({ type: "confirmDelete" }) && send({ type: "confirmDelete" }))} onCancel={() => void (can({ type: "keep" }) && send({ type: "keep" }))} />
        </section>
      )}
    </div>
  );
}
