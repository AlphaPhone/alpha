// spec/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/telephony/phoneInfo.md, "Story: See my SIM, carrier and number on the image"; spec/telephony/phone.md, "Story: Call a number myself"; spec/telephony/phone.md, "Story: Move between Recents, Keypad, Voicemail and Contacts"; spec/telephony/phone.md, "Story: Find a call from the bar"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { useCallback, useMemo, useRef, useState } from "react";
import { useMachine as usePhoneMachine } from "../../../gen/telephony__phone.react.ts";
import { initial as phoneInitial } from "../../../gen/telephony__phone.ts";
import { useMachine as useVoicemailMachine } from "../../../gen/telephony__voicemail.react.ts";
import { initial as voicemailInitial } from "../../../gen/telephony__voicemail.ts";
import { PhoneView } from "../../telephony/phone.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { openApp } from "./open.ts";
import { PhoneInfoPanel } from "./PhoneInfoPanel.tsx";
import { PhoneScreenView } from "./PhoneScreenView.tsx";
import { act, now, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { stageView, useComms } from "./useComms.ts";

/** Phone's screen props: the shell's route and close. */
export type PhoneScreenProps = ScreenProps;

/**
 * Phone on the Alpha image: Recents, Keypad and Voicemail, Contacts beside them, and the one bar; at `info`, Settings → Phone's details.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function PhoneScreen(props: PhoneScreenProps) {
  return props.route === "info" ? <PhoneInfoPanel /> : <PhoneApp {...props} />;
}

function PhoneApp({ route }: PhoneScreenProps) {
  const { state: phone = phoneInitial, send, can } = usePhoneMachine(runtime);
  const { state: voicemail = voicemailInitial, send: sendVoicemail } = useVoicemailMachine(runtime);
  const stage = useComms();
  const urls = useRef<{ ticket: number; url: string } | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const visits = [start(PhoneView.use((v) => v.visit(route))), start(VoicemailView.use((v) => v.visit()))];
    stage.show("PhoneApp", route?.startsWith("keypad:") ? "KeypadSubject" : "RecentsSubject", "phone:recents:");
    return () => {
      for (const stop of visits) stop();
    };
  }, [route]);
  const ticket = voicemail.opened.ticket;
  const audioUrl = useMemo(() => {
    if (voicemail.opened.audio !== "AudioReady") return undefined;
    if (urls.current?.ticket === ticket) return urls.current.url;
    if (urls.current) URL.revokeObjectURL(urls.current.url);
    const wav = now(VoicemailView.use((v) => v.wav()), undefined);
    if (!wav) return undefined;
    urls.current = { ticket, url: URL.createObjectURL(new Blob([wav as BlobPart], { type: "audio/wav" })) };
    return urls.current.url;
  }, [ticket, voicemail.opened.audio]);
  const dial = (number: string) => act(PhoneView.use((v) => v.dial(number)));
  return (
    <PhoneScreenView
      ref={visit}
      {...stageView(stage)}
      phone={phone}
      voicemail={voicemail}
      now={phone.readAt || Date.now()}
      answer={answer}
      audioUrl={audioUrl}
      onTab={(tab) => can({ type: "tabChosen", tab }) && send({ type: "tabChosen", tab })}
      onContacts={() => openApp("contacts", "from:phone")}
      onQuery={(typed) => send({ type: "queryTyped", typed })}
      onAsk={(text) => stage.askList("phone", text, setAnswer)}
      onCall={dial}
      onAllow={() => act(PhoneView.use((v) => v.refresh(true)))}
      onRefresh={() => act(PhoneView.use((v) => v.refresh(false)))}
      onClearQuery={() => send({ type: "queryCleared" })}
      onPress={(key) => act(PhoneView.use((v) => v.press(key)))}
      onErase={() => act(PhoneView.use((v) => v.erase()))}
      onOpenVoicemail={(id) => act(VoicemailView.use((v) => v.open(id)))}
      onPlay={() => act(VoicemailView.use((v) => v.play()))}
      onStopped={(ended) => sendVoicemail(ended ? { type: "playbackEnded" } : { type: "paused" })}
      onRetryAudio={() => act(VoicemailView.use((v) => v.retryAudio()))}
      onCallBack={(number) => send({ type: "keypadAsked", number })}
      onMessage={(number) => openApp("messages", `compose:${number}`)}
      onDeleteAsked={() => sendVoicemail({ type: "deleteAsked" })}
      onDeleteDeclined={() => sendVoicemail({ type: "deleteDeclined" })}
      onDeleteConfirmed={() => act(VoicemailView.use((v) => v.confirmDelete()))}
    />
  );
}
