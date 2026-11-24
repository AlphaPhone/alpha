// spec/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/telephony/phone.md, "Story: Call a number myself"; spec/telephony/phone.md, "Story: Move between Recents, Keypad, Voicemail and Contacts"; spec/telephony/phone.md, "Story: Find a call from the bar"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import type { Ref } from "react";
import type { Phone, PhoneTab } from "../../../gen/telephony__phone.ts";
import type { Voicemail } from "../../../gen/telephony__voicemail.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { CommsBar } from "./CommsBar.tsx";
import { Keypad } from "./Keypad.tsx";
import { isAskSentence, queryOf } from "./present.ts";
import { RecentsList } from "./RecentsList.tsx";
import { RestoredProposal } from "./RestoredProposal.tsx";
import type { StageViewProps } from "./stage.ts";
import { VoicemailPanel, type VoicemailPanelProps } from "./VoicemailPanel.tsx";

const TABS: { tab: PhoneTab | "contacts"; label: string }[] = [
  { tab: "RecentsTab", label: "Recents" }, { tab: "KeypadTab", label: "Keypad" }, { tab: "VoicemailTab", label: "Voicemail" }, { tab: "contacts", label: "Contacts" },
];

export interface PhoneScreenViewProps extends StageViewProps {
  /** Where the container starts and ends Phone's visit. */
  ref?: Ref<HTMLElement>;
  /** Phone's state: the tab, Recents, the keypad field and the list query. */
  phone: Phone;
  /** The voicemail tab's state. */
  voicemail: Voicemail;
  /** The time the rows are placed against. */
  now: number;
  /** Alpha's line answering the list sentence, shown while its filter holds. */
  answer: string;
  /** The open voicemail's audio as a playable URL, while it is ready. */
  audioUrl?: string;
  /** The owner chose Recents, Keypad or Voicemail. */
  onTab: (tab: PhoneTab) => void;
  /** The Contacts tab: opens Contacts from Phone. */
  onContacts: () => void;
  /** The owner typed in the list query. */
  onQuery: (typed: string) => void;
  /** Enter on a list sentence: Alpha's filter answers, or the question goes to Alpha. */
  onAsk: (text: string) => void;
  /** Call a number from a recent row or the keypad. */
  onCall: (number: string) => void;
  /** Allow call history, and Refresh after a failed read. */
  onAllow: () => void;
  onRefresh: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
  /** A keypad press, and taking the last character off. */
  onPress: (key: string) => void;
  onErase: () => void;
  /** Open or close a voicemail, play it, and its audio stopping or failing. */
  onOpenVoicemail: VoicemailPanelProps["onOpen"];
  onPlay: VoicemailPanelProps["onPlay"];
  onStopped: VoicemailPanelProps["onStopped"];
  onRetryAudio: VoicemailPanelProps["onRetry"];
  /** Call or text a voicemail's caller back. */
  onCallBack: (number: string) => void;
  onMessage: (number: string) => void;
  /** Ask, cancel or confirm a voicemail's delete. */
  onDeleteAsked: () => void;
  onDeleteDeclined: () => void;
  onDeleteConfirmed: () => void;
}

/**
 * Phone's Recents, Keypad and Voicemail tabs, Contacts beside them, and the one bar, as the state gives them.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function PhoneScreenView({
  ref, phone, voicemail, now, answer, audioUrl, comms, request, card,
  onTab, onContacts, onQuery, onAsk, onCall, onAllow, onRefresh, onClearQuery, onPress, onErase,
  onOpenVoicemail, onPlay, onStopped, onRetryAudio, onCallBack, onMessage, onDeleteAsked, onDeleteDeclined, onDeleteConfirmed,
  onRequest, onSubmitRequest, onAlpha, onEndCall, onCloseChat, onDecline,
}: PhoneScreenViewProps) {
  const query = queryOf(phone.listQuery);
  const digits = phone.number.replace(/\D/g, "");
  const known = digits.length >= 3 ? phone.recents.find((r) => r.title && r.number.replace(/\D/g, "").includes(digits)) : undefined;
  const chatOpen = comms.height !== "SheetClosed";
  return (
    <section ref={ref} aria-label="Phone" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4">
        <h1 className="flex-1 font-display text-2xl">Phone</h1>
      </header>
      <nav role="group" aria-label="Phone" className="flex gap-1 px-4 py-2">
        {TABS.filter(({ tab }) => tab !== "VoicemailTab" || phone.voicemailReady).map(({ tab, label }) => (
          <button
            key={tab}
            type="button"
            aria-pressed={phone.tab === tab}
            onClick={() => tab === "contacts" ? onContacts() : onTab(tab)}
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
          <RecentsList phone={phone} now={now} onCall={onCall} onAllow={onAllow} onRefresh={onRefresh} onClearQuery={onClearQuery} />
        )}
        {phone.tab === "KeypadTab" && (
          <Keypad
            phone={phone}
            match={known ? { title: known.title, number: known.number } : undefined}
            onPress={onPress}
            onErase={onErase}
            onDial={onCall}
          />
        )}
        {phone.tab === "VoicemailTab" && (
          <VoicemailPanel
            voicemail={voicemail}
            now={now}
            audioUrl={audioUrl}
            onOpen={onOpenVoicemail}
            onPlay={onPlay}
            onStopped={onStopped}
            onRetry={onRetryAudio}
            onCallBack={onCallBack}
            onMessage={onMessage}
            onDeleteAsked={onDeleteAsked}
            onDeleteDeclined={onDeleteDeclined}
            onDeleteConfirmed={onDeleteConfirmed}
          />
        )}
      </div>
      <RestoredProposal card={card} onDismiss={onDecline} />
      <CommsBar
        comms={comms}
        value={chatOpen ? request : query.chip ? "" : query.text}
        onText={(text) => chatOpen ? onRequest(text) : onQuery(text)}
        canSubmit={chatOpen ? request.trim() !== "" : isAskSentence(query.text)}
        onSubmit={() => {
          if (chatOpen) onSubmitRequest();
          else onAsk(query.text);
        }}
        onAlpha={onAlpha}
        onEnd={onEndCall}
        onBack={onCloseChat}
      />
    </section>
  );
}
