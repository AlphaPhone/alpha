// spec/app/phone/index.md, "Home shows the missed-calls card while there are missed calls not yet seen"; spec/app/messages/index.md, "The phone reports how many conversations are unread, for the list and Home"; spec/app/phone/voicemail.md, "The phone reports how many voicemails are unheard, for Home and the tab"
import { Card, CardTitle } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as MessagesMachine } from "../../gen/app__messages.effect.vibe";
import { useMachine as useMessages } from "../../gen/app__messages.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { canOpenMissed, canOpenVoicemail, missedCard } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as VoicemailMachine } from "../../gen/app__phone__voicemail.effect.vibe";
import { useMachine as useVoicemail } from "../../gen/app__phone__voicemail.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import type { Conversations } from "../messages/messages.vibe";
import type { Telephony } from "../platform/telephony.vibe";
import { openCalls, openUnread } from "./reports.vibe";

export interface HomeCardsProps {
  /** Provides Phone's, Voicemail's and Messages' resident machines, the shell, and what the unread card asks of the phone. */
  runtime: ManagedRuntime.ManagedRuntime<PhoneMachine | VoicemailMachine | MessagesMachine | ShellMachine | Conversations | Telephony, unknown>;
}

const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Home's Messages and Phone cards: unread conversations, and missed calls or else unheard voicemail; a tap opens where they wait. */
export function HomeCards({ runtime }: HomeCardsProps) {
  const phone = usePhone(runtime).state;
  const voicemail = useVoicemail(runtime).state;
  const messages = useMessages(runtime).state;
  if (!phone || !voicemail || !messages) return null;
  const calls = missedCard(phone) ? canOpenMissed(phone) : canOpenVoicemail(phone, voicemail.unheard);
  const unread = counted(messages.unread, "unread conversation", "unread conversations");
  const waiting = missedCard(phone) ? counted(phone.missed, "missed call", "missed calls") : counted(voicemail.unheard, "unheard voicemail", "unheard voicemails");
  return (
    <>
      {messages.unread > 0 && (
        <Card asChild className="min-w-64 snap-start">
          <button type="button" className="text-left" aria-label={`Messages: ${unread}`} onClick={() => void runtime.runPromise(openUnread())}>
            <CardTitle>Messages</CardTitle>
            <span className="text-sm text-muted-foreground">{unread}</span>
          </button>
        </Card>
      )}
      {calls && (
        <Card asChild className="min-w-64 snap-start">
          <button type="button" className="text-left" aria-label={`Phone: ${waiting}`} onClick={() => void runtime.runPromise(openCalls())}>
            <CardTitle>Phone</CardTitle>
            <span className="text-sm text-muted-foreground">{waiting}</span>
          </button>
        </Card>
      )}
    </>
  );
}
