// spec/app/phone/index.md, "Story: See my recent calls"; spec/app/phone/index.md, "Story: Give Alpha the call log"; spec/app/phone/index.md, "Story: Type a number"; spec/app/phone/index.md, "Story: Call a number"; spec/app/phone/voicemail.md, "Story: Listen to a voicemail"; spec/app/phone/voicemail.md, "Story: Delete a voicemail"
import type { TelephonyCallLogEntry } from "@elizaos/os/bridges/phone";
import { Alert, Button, Chip, Input, Spinner, Tabs, TabsContent, cn, focusRing } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { ArrowDownLeft, ArrowUpRight, Delete, Phone as Call } from "lucide-react";
import { memo, useCallback, useRef } from "react";
import { Machine as PhoneMachine, type Tab } from "../../gen/app__phone.effect.vibe";
import { dialable, historyFailed, logNeeded, noCalls, noMatchingCalls } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as VoicemailMachine } from "../../gen/app__phone__voicemail.effect.vibe";
import { useMachine as useVoicemail } from "../../gen/app__phone__voicemail.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";
import { Dialer, type Dialing, keypadDigits } from "./phone.vibe";
import { Player, Voicemails } from "./voicemail.vibe";
import { callerTitle, displayNumber, judge, shortWhen } from "./words.ts";
import { CommsBar, type CommsServices } from "./CommsBar.tsx";
import { CallAvatar } from "./CallAvatar.tsx";
import { PhoneTabs } from "./PhoneTabs.tsx";
import { VoicemailTab } from "./VoicemailTab.tsx";

export interface PhoneProps {
  runtime: ManagedRuntime.ManagedRuntime<PhoneMachine | VoicemailMachine | Dialer | Voicemails | Player | CommsServices | Time, unknown>;
  alpha: Alpha;
}

const keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]] as const;
const missed = new Set(["missed", "rejected", "blocked"]);
const contacts = { type: "openView", view: "Contacts" } as const;

const RecentRow = memo(function RecentRow({ row, now, enabled, call, first }: {
  row: TelephonyCallLogEntry;
  now: number;
  enabled: boolean;
  call: (number: string) => void;
  first: boolean;
}) {
  const title = callerTitle(row.number, row.cachedName);
  const took = missed.has(row.type);
  const outgoing = row.type === "outgoing";
  const Icon = outgoing ? ArrowUpRight : ArrowDownLeft;
  const direction = took ? "missed" : outgoing ? "outgoing" : "incoming";
  const date = shortWhen(row.date, now);
  const label = `${row.number ? "Call " : ""}${title}`;
  return (
    <button type="button" disabled={!enabled} aria-label={label} aria-description={`${direction} ${date}`} data-alpha-stage-last={first || undefined}
      className={cn(focusRing, "flex min-h-16 w-full items-center gap-3 px-5 py-2 text-left disabled:cursor-default")}
      onClick={() => call(row.number)}>
      <CallAvatar name={title} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate font-semibold", took && "text-destructive")}>{title}</span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground"><Icon aria-hidden className="size-3.5" />{date}</span>
      </span>
    </button>
  );
});

/** Phone's icon tabs, recent calls and the owner's dial keypad. Calls are accepted by Android. @model spec/app/phone/index.md */
export function Phone({ runtime, alpha }: PhoneProps) {
  const phone = usePhone(runtime);
  const shell = useShell(runtime);
  const voicemail = useVoicemail(runtime).state;
  const zeroDown = useRef<number | undefined>(undefined);
  const longZero = useRef(false);
  const dialRecent = useCallback((number: string) => {
    void runtime.runPromiseExit(Effect.flatMap(PhoneMachine, (machine) => machine.send({ type: "dialRecent", number })));
  }, [runtime]);
  if (phone.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Phone</Alert>;
  const { state, can, send } = phone;
  if (!state) return null;
  const dialer = runtime.runSync(Effect.flatMap(Dialer, (held) => held.get()));
  const now = runtime.runSync(Effect.flatMap(Time, (time) => time.latest()));
  const set = (change: Partial<Dialing>) => runtime.runSync(Effect.flatMap(Dialer, (held) => held.set(change)));
  const edit = (number: string) => {
    const digits = keypadDigits(number);
    const event = { type: "editNumber", digits: digits.length, typed: judge(digits) } as const;
    if (can(event)) {
      set({ digits });
      void send(event);
    }
  };
  const changeDigit = (key?: string) => {
    const current = runtime.runSync(Effect.flatMap(Dialer, (held) => held.get())).digits;
    const digits = key === undefined ? current.slice(0, -1) : current + key;
    const event = { type: key === undefined ? "takeBack" : "press", typed: judge(digits) } as const;
    if (can(event)) {
      set({ digits });
      void send(event);
    }
  };
  const select = (tab: string) => {
    if (tab === "Contacts") {
      if (shell.can(contacts)) void shell.send(contacts);
      return;
    }
    const event = { type: "pickTab", tab: tab as Tab } as const;
    if (can(event)) void send(event);
  };
  const clearSearch = () => {
    const event = { type: "search", typed: false } as const;
    if (can(event)) {
      set({ sought: "", filterLabel: "" });
      void send(event);
    }
  };
  const match = { type: "dialMatched", number: dialer.matchedNumber } as const;
  const waiting = state.dial.status === "Loading";
  const rows = state.rows > 0 ? dialer.rows : [];
  return (
    <section aria-label="Phone" data-alpha-phone="" className="flex min-h-0 flex-1 flex-col">
      <Tabs value={state.tab} onValueChange={select} className="min-h-0 flex-1 gap-0">
        <PhoneTabs title={state.tab} contacts={shell.can(contacts)} voicemail={state.voicemail} unheard={(voicemail?.unheard ?? 0) > 0}
          onBack={shell.can({ type: "goBack" }) ? () => void alpha.back() : undefined} />
        {state.failedDial && <p role="status" className="mx-6 mb-2 text-center text-sm text-muted-foreground">Couldn’t open the dialer</p>}
        {state.unsureDial && <p role="status" className="mx-6 mb-2 text-center text-sm text-muted-foreground">Alpha cannot tell whether the call started</p>}
        <TabsContent value="Recents" data-alpha-phone-recents="" className="min-h-0 flex-1 overflow-y-auto rounded-none">
          {state.sought && dialer.filterLabel !== "" && <div className="px-4 pb-2"><Chip onClear={clearSearch} clearLabel={`Clear filter ${dialer.filterLabel}`}>{dialer.filterLabel}</Chip></div>}
          {state.recents.status === "Loading" && rows.length === 0 && <div className="flex justify-center p-5"><Spinner label="Reading recent calls" /></div>}
          {logNeeded(state) && state.recents.status !== "Loading" && (
            <div className="flex flex-col items-center gap-3 p-5">
              <p role="status" className="text-muted-foreground">Phone needs access to your call log</p>
              {can({ type: "allow" }) ? <Button size="lg" onClick={() => void send({ type: "allow" })}>Allow</Button> : can({ type: "goToSettings" }) && <Button variant="outline" onClick={() => void send({ type: "goToSettings" })}>Open Settings</Button>}
            </div>
          )}
          {historyFailed(state) && <div className="flex flex-col items-center gap-2 p-5"><p role="status" className="text-muted-foreground">Couldn’t load</p>{can({ type: "retry" }) && <Button variant="ghost" className="underline" onClick={() => void send({ type: "retry" })}>Retry call history</Button>}</div>}
          {noCalls(state) && <p role="status" className="p-5 text-center text-muted-foreground">{noMatchingCalls(state) ? "No matching calls" : state.chip === "MissedCalls" ? "No missed calls" : "No recent calls."}</p>}
          {state.chip === "MissedCalls" && can({ type: "pickChip", chip: "AllCalls" }) && <div className="px-4 pb-2"><Chip clearLabel="Show all calls" onClear={() => void send({ type: "pickChip", chip: "AllCalls" })}>Missed</Chip></div>}
          {rows.length > 0 && <div role="group" aria-label="Recent calls">{rows.map((row, index) => <RecentRow key={row.id} row={row}
            now={now} enabled={can({ type: "dialRecent", number: row.number })} call={dialRecent} first={index === 0} />)}</div>}
          {state.chip === "AllCalls" && state.recents.status === "Loaded" && rows.length > 0 && can({ type: "pickChip", chip: "MissedCalls" }) &&
            <div className="px-4 py-2"><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void send({ type: "pickChip", chip: "MissedCalls" })}>Missed</Button></div>}
        </TabsContent>
        <TabsContent value="Keypad" data-alpha-phone-keypad="" className="min-h-0 flex-1 overflow-y-auto rounded-none">
          <div className="mx-auto flex min-h-full max-w-sm flex-col pb-2 [--dial-key:clamp(48px,16vw,78px)]">
            <div className="flex min-h-20 flex-1 flex-col items-center justify-center gap-1.5 px-6 py-1">
              <Input type="tel" inputMode="none" autoComplete="off" maxLength={40} aria-label="Phone number" data-alpha-phone-number=""
                value={dialer.digits} onChange={(event) => edit(event.currentTarget.value)} disabled={waiting}
                className="h-12 px-0 text-center text-4xl font-medium tabular-nums border-transparent bg-transparent shadow-none" />
              {state.matched && dialer.matched !== "" && (
                <Button size="icon" variant="secondary" className="w-auto max-w-full gap-2 px-3.5 text-sm" aria-label={`Call ${dialer.matched}`}
                  disabled={!can(match)} onClick={() => void send(match)}>
                  <span className="truncate">{dialer.matched}</span><span className="shrink-0 text-muted-foreground tabular-nums">{displayNumber(dialer.matchedNumber)}</span>
                </Button>
              )}
              {state.typed === "Dialable" && !state.carrier && <p role="status" className="text-center text-sm text-muted-foreground">No mobile network. Emergency calls only.</p>}
            </div>
            <div role="group" aria-label="Keypad" className="grid shrink-0 grid-cols-3 justify-items-center gap-x-3 gap-y-[calc(var(--dial-key)*.15)] px-9">
              {keys.map(([key, letters]) => (
                <Button key={key} variant="secondary" size="icon" aria-label={key}
                  className="size-(--dial-key) flex-col gap-px" disabled={waiting || !can({ type: "press", typed: judge(dialer.digits + key) })}
                  onPointerDown={key === "0" ? (event) => { zeroDown.current = event.timeStamp; longZero.current = false; } : undefined}
                  onPointerUp={key === "0" ? (event) => {
                    const began = zeroDown.current;
                    zeroDown.current = undefined;
                    if (began === undefined || event.timeStamp - began < 500 || dialer.digits !== "") return;
                    longZero.current = true;
                    changeDigit("+");
                  } : undefined}
                  onPointerCancel={key === "0" ? () => { zeroDown.current = undefined; longZero.current = false; } : undefined}
                  onContextMenu={key === "0" ? (event) => event.preventDefault() : undefined}
                  onClick={(event) => {
                    if (key === "0" && longZero.current && event.detail !== 0) { longZero.current = false; return; }
                    changeDigit(key);
                  }}>
                  <span className="text-3xl font-medium leading-none">{key}</span>
                  <span aria-hidden className="h-3 text-xs font-semibold leading-none tracking-caps text-muted-foreground">{letters}</span>
                </Button>
              ))}
            </div>
            <div className="grid shrink-0 grid-cols-3 items-center justify-items-center gap-3 px-9 pt-4">
              <Button className="col-start-2 size-(--dial-key) bg-call text-primary-foreground hover:bg-call/90 active:bg-call/80"
                size="icon" data-alpha-phone-call="" aria-label="Call" disabled={!can({ type: "dialTyped" }) || !dialable(state)}
                onClick={() => void send({ type: "dialTyped" })}><Call className="size-7.5" /></Button>
              {dialer.digits !== "" && <Button variant="ghost" size="icon" aria-label="Delete digit" className="col-start-3 size-14"
                disabled={waiting || !can({ type: "takeBack", typed: judge(dialer.digits.slice(0, -1)) })} onClick={() => changeDigit()}><Delete className="size-6.5" /></Button>}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="Voicemail" data-alpha-phone-voicemail="" className="min-h-0 flex-1 overflow-y-auto rounded-none">
          <VoicemailTab runtime={runtime} now={now} />
        </TabsContent>
      </Tabs>
      <CommsBar runtime={runtime} />
    </section>
  );
}
