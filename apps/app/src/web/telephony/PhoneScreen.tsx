// spec/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/telephony/phoneInfo.md, "Story: See my SIM, carrier and number on the image"; spec/telephony/phone.md, "Story: Call a number myself"; spec/telephony/phone.md, "Story: Move between Recents, Keypad, Voicemail and Contacts"; spec/telephony/phone.md, "Story: Find a call from the bar"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { useCallback, useMemo, useRef, useState } from "react";
import { useMachine as usePhoneMachine } from "../../../gen/telephony__phone.react.ts";
import { initial as phoneInitial, type PhoneTab } from "../../../gen/telephony__phone.ts";
import { useMachine as useVoicemailMachine } from "../../../gen/telephony__voicemail.react.ts";
import { initial as voicemailInitial } from "../../../gen/telephony__voicemail.ts";
import { PhoneView } from "../../telephony/phone.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { openApp } from "./open.ts";
import { PhoneInfoPanel } from "./PhoneInfoPanel.tsx";
import { CommsBar } from "./CommsBar.tsx";
import { RestoredProposal } from "./RestoredProposal.tsx";
import { Keypad } from "./Keypad.tsx";
import { isAskSentence, queryOf } from "./present.ts";
import { RecentsList } from "./RecentsList.tsx";
import { ListAsk } from "../../telephony/list-ask.vibe";
import { runtime, type TelephonyRuntime } from "./runtime.ts";
import { useComms } from "./useComms.ts";
import { VoicemailPanel } from "./VoicemailPanel.tsx";

const TABS: { tab: PhoneTab | "contacts"; label: string }[] = [
  { tab: "RecentsTab", label: "Recents" }, { tab: "KeypadTab", label: "Keypad" }, { tab: "VoicemailTab", label: "Voicemail" }, { tab: "contacts", label: "Contacts" },
];

export interface PhoneScreenProps extends ScreenProps {
  /** The runtime the screen runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * Phone on the Alpha image: Recents, Keypad and Voicemail, Contacts beside them, and the one bar; at `info`, Settings → Phone's details.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function PhoneScreen(props: PhoneScreenProps) {
  return props.route === "info" ? <PhoneInfoPanel runtime={props.runtime ?? runtime} /> : <PhoneApp {...props} />;
}

function PhoneApp({ route, runtime: on = runtime }: PhoneScreenProps) {
  const { state: phone = phoneInitial, send, can } = usePhoneMachine(on);
  const { state: voicemail = voicemailInitial, send: sendVoicemail } = useVoicemailMachine(on);
  const stage = useComms(on);
  const urls = useRef<{ ticket: number; url: string } | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const visits = [on.runFork(PhoneView.use((v) => v.visit(route))), on.runFork(VoicemailView.use((v) => v.visit()))];
    stage.show("PhoneApp", route?.startsWith("keypad:") ? "KeypadSubject" : "RecentsSubject", "phone:recents:");
    return () => {
      for (const running of visits) running.interruptUnsafe();
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
    <section ref={visit} aria-label="Phone" className="flex h-full flex-col bg-background text-foreground">
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
      <RestoredProposal card={stage.card} onDismiss={stage.decline} />
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
