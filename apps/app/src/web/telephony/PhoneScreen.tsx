// spec/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/telephony/phone.md, "Story: Call a number myself"; spec/telephony/phone.md, "Story: Move between Recents, Keypad, Voicemail and Contacts"; spec/telephony/phone.md, "Story: Find a call from the bar"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { ArrowDownLeft, ArrowUpRight, PhoneMissed, RotateCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMachine as usePhoneMachine } from "../../../gen/telephony__phone.react.ts";
import { initial as phoneInitial, type Phone, type PhoneTab, type Recent } from "../../../gen/telephony__phone.ts";
import { useMachine as useVoicemailMachine } from "../../../gen/telephony__voicemail.react.ts";
import { initial as voicemailInitial } from "../../../gen/telephony__voicemail.ts";
import { PhoneView } from "../../telephony/phone.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Avatar, Button, EmptyState, ListRow } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { openApp } from "./open.ts";
import { CommsBar } from "./CommsBar.tsx";
import { Keypad } from "./Keypad.tsx";
import { isAskSentence, matchesCallQuery, queryOf, shortWhen, who } from "./present.ts";
import { ListAsk } from "../../telephony/list-ask.vibe";
import { runtime, type TelephonyRuntime } from "./runtime.ts";
import { useComms } from "./useComms.ts";
import { VoicemailPanel } from "./VoicemailPanel.tsx";

export interface RecentsListProps {
  /** Phone's state: its rows, access and query. */
  phone: Phone;
  /** The time the rows are placed against. */
  now: number;
  /** Call a recent row's number. */
  onCall: (number: string) => void;
  /** The owner's Allow and Refresh. */
  onAllow: () => void;
  onRefresh: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
}

const ARROW = { InboundCall: ArrowDownLeft, OutboundCall: ArrowUpRight, MissedCall: PhoneMissed } as const;
const CALL_WORD = { InboundCall: "incoming", OutboundCall: "outgoing", MissedCall: "missed" } as const;

/**
 * Recents: newest first, missed calls red, each row one Call; access, failure and an Alpha filter chip in place of rows.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function RecentsList({ phone, now, onCall, onAllow, onRefresh, onClearQuery }: RecentsListProps) {
  const query = queryOf(phone.listQuery);
  const rows = phone.recents.filter((row) => matchesCallQuery({ title: row.title, number: row.number }, query.text));
  const busy = phone.reading || phone.dialing;
  return (
    <div className="flex flex-col">
      {query.chip && (
        <div className="px-4 py-2">
          <Button variant="secondary" size="sm" aria-label={`Clear filter ${query.chip}`} onClick={onClearQuery}>{query.chip}<X aria-hidden /></Button>
        </div>
      )}
      {phone.access === "LogNeeded" && (
        <EmptyState title="Allow call history"><Button onClick={onAllow} disabled={busy}>Allow</Button></EmptyState>
      )}
      {phone.notice.tag === "ReadFailed" && (
        <EmptyState title="Couldn’t load"><Button variant="secondary" onClick={onRefresh} aria-label="Refresh"><RotateCw aria-hidden /></Button></EmptyState>
      )}
      {phone.access === "LogAbsent" && <EmptyState title="No recents" />}
      {phone.access === "LogGranted" && !phone.reading && phone.recents.length === 0 && <EmptyState title="No recent calls" />}
      <ul className="divide-y divide-border">
        {rows.map((row: Recent) => {
          const name = who(row.title, row.number);
          const Arrow = ARROW[row.kind];
          return (
            <li key={row.id}>
              <ListRow
                title={<span className={cn(row.kind === "MissedCall" && "text-destructive")}>{name}</span>}
                leading={<Avatar name={name} />}
                detail={<Arrow aria-hidden className={cn("size-4", row.kind === "MissedCall" && "text-destructive")} />}
                trailing={<span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{shortWhen(row.date, now)}</span>}
                disabled={busy || !row.number}
                aria-label={`${row.number ? "Call " : ""}${name}, ${CALL_WORD[row.kind]} ${shortWhen(row.date, now)}`}
                onClick={() => row.number && onCall(row.number)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TABS: { tab: PhoneTab | "contacts"; label: string }[] = [
  { tab: "RecentsTab", label: "Recents" }, { tab: "KeypadTab", label: "Keypad" }, { tab: "VoicemailTab", label: "Voicemail" }, { tab: "contacts", label: "Contacts" },
];

export interface PhoneScreenProps extends ScreenProps {
  /** The runtime the screen runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * Phone on the Alpha image: Recents, Keypad and Voicemail, Contacts beside them, and the one bar.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function PhoneScreen({ route, runtime: on = runtime }: PhoneScreenProps) {
  const { state: phone = phoneInitial, send, can } = usePhoneMachine(on);
  const { state: voicemail = voicemailInitial, send: sendVoicemail } = useVoicemailMachine(on);
  const stage = useComms(on);
  const urls = useRef<{ ticket: number; url: string } | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    let visits = [on.runFork(PhoneView.use((v) => v.visit(route))), on.runFork(VoicemailView.use((v) => v.visit()))];
    stage.show("PhoneApp", route?.startsWith("keypad:") ? "KeypadSubject" : "RecentsSubject", "phone:recents:");
    const visibility = () => {
      for (const visit of visits) visit.interruptUnsafe();
      visits = document.hidden ? [] : [on.runFork(PhoneView.use((v) => v.visit())), on.runFork(VoicemailView.use((v) => v.visit()))];
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      for (const visit of visits) visit.interruptUnsafe();
    };
  }, [on, route]);
  const ticket = voicemail.opened.ticket;
  const audioUrl = useMemo(() => {
    if (voicemail.opened.audio !== "AudioReady") return undefined;
    if (urls.current?.ticket === ticket) return urls.current.url;
    if (urls.current) URL.revokeObjectURL(urls.current.url);
    const wav = on.runSync(VoicemailView.use((v) => v.wav()));
    if (!wav) return undefined;
    urls.current = { ticket, url: URL.createObjectURL(new Blob([wav as BlobPart], { type: "audio/wav" })) };
    return urls.current.url;
  }, [on, ticket, voicemail.opened.audio]);
  const now = phone.readAt || Date.now();
  const query = queryOf(phone.listQuery);
  const digits = phone.number.replace(/\D/g, "");
  const known = digits.length >= 3 ? phone.recents.find((r) => r.title && r.number.replace(/\D/g, "").includes(digits)) : undefined;
  const dial = (number: string) => on.runFork(PhoneView.use((v) => v.dial(number)));
  const chatOpen = stage.comms.height !== "SheetClosed";
  return (
    <section aria-label="Phone" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4">
        <h1 className="flex-1 font-serif text-2xl">Phone</h1>
      </header>
      <nav role="group" aria-label="Phone" className="flex gap-1 px-4 py-2">
        {TABS.filter(({ tab }) => tab !== "VoicemailTab" || phone.voicemailReady).map(({ tab, label }) => (
          <button
            key={tab}
            type="button"
            aria-pressed={phone.tab === tab}
            onClick={() => tab === "contacts" ? openApp("contacts", "from:phone") : can({ type: "tabChosen", tab }) && send({ type: "tabChosen", tab })}
            className={cn(focusRing, "relative rounded-md px-3 py-1 text-sm aria-pressed:bg-secondary")}
          >
            {label}
            {tab === "VoicemailTab" && voicemail.rows.some((r) => r.fresh) && <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>
      {answer && phone.listQuery.tag === "AlphaQuery" && <p role="status" className="px-4 text-sm text-muted-foreground">{answer}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {phone.tab === "RecentsTab" && (
          <RecentsList
            phone={phone}
            now={now}
            onCall={dial}
            onAllow={() => on.runFork(PhoneView.use((v) => v.refresh(true)))}
            onRefresh={() => on.runFork(PhoneView.use((v) => v.refresh(false)))}
            onClearQuery={() => send({ type: "queryCleared" })}
          />
        )}
        {phone.tab === "KeypadTab" && (
          <Keypad
            phone={phone}
            match={known ? { title: known.title, number: known.number } : undefined}
            onPress={(key) => on.runFork(PhoneView.use((v) => v.press(key)))}
            onErase={() => on.runFork(PhoneView.use((v) => v.erase()))}
            onDial={dial}
          />
        )}
        {phone.tab === "VoicemailTab" && (
          <VoicemailPanel
            voicemail={voicemail}
            now={now}
            audioUrl={audioUrl}
            onOpen={(id) => on.runFork(VoicemailView.use((v) => v.open(id)))}
            onPlay={() => on.runFork(VoicemailView.use((v) => v.play()))}
            onStopped={(ended) => sendVoicemail(ended ? { type: "playbackEnded" } : { type: "paused" })}
            onRetry={() => on.runFork(VoicemailView.use((v) => v.retryAudio()))}
            onCallBack={(number) => send({ type: "keypadAsked", number })}
            onMessage={(number) => openApp("messages", `compose:${number}`)}
            onDeleteAsked={() => sendVoicemail({ type: "deleteAsked" })}
            onDeleteDeclined={() => sendVoicemail({ type: "deleteDeclined" })}
            onDeleteConfirmed={() => on.runFork(VoicemailView.use((v) => v.confirmDelete()))}
          />
        )}
      </div>
      <CommsBar
        comms={stage.comms}
        value={chatOpen ? stage.request : query.chip ? "" : query.text}
        onText={(text) => chatOpen ? stage.setRequest(text) : send({ type: "queryTyped", typed: text })}
        canSubmit={chatOpen ? stage.request.trim() !== "" : isAskSentence(query.text)}
        onSubmit={() => {
          if (chatOpen) stage.submitRequest();
          else {
            const asked = query.text;
            send({ type: "queryTyped", typed: "" });
            void on.runPromise(ListAsk.use((l) => l.ask("phone", asked))).then((line) => (line === null ? stage.ask(asked) : setAnswer(line)));
          }
        }}
        onAlpha={stage.openAlpha}
        onBack={stage.closeChat}
      />
    </section>
  );
}
