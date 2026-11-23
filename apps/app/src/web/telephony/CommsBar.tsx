// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/comms.md, "End is beside the bar when closed, in the call card when open, in the strip when full, and on the voice panel during a voice turn"; spec/telephony/drafts.md, "Each subject keeps one request to Alpha, separate from its draft slot"
import { ArrowUp, Image as ImageIcon, Mic, Phone, PhoneOff } from "lucide-react";
import type { Comms } from "../../../gen/telephony__comms.ts";
import { barField, endPlace, leftSlot } from "../../../gen/telephony__comms.ts";
import { Avatar, Button, Textarea } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { firstOf } from "./present.ts";

export interface CommsBarProps {
  /** The comms state: who the bar addresses, the sheet height, whether a call is live. */
  comms: Comms;
  /** The person on screen, for "Text Maya" and the avatar. */
  person?: string;
  /** The field's text for the target it addresses: the person's draft, the list query, or the request to Alpha. */
  value: string;
  /** The owner typed in the field. */
  onText: (text: string) => void;
  /** Send to the person, or the request to Alpha. */
  onSubmit?: () => void;
  /** Whether Send is offered now. */
  canSubmit?: boolean;
  /** The Alpha button: opens the chat addressing Alpha. */
  onAlpha: () => void;
  /** The open chat's left slot: back to the person or the call, closing the chat. */
  onBack?: () => void;
  /** Hang up the live call. */
  onEnd?: () => void;
  /** Dictate into the draft the bar shows. */
  onDictate?: () => void;
  /** Attach a picture to the conversation's draft. */
  onAttach?: () => void;
}

const PLACEHOLDER = {
  AskAlpha: () => "Ask Alpha",
  TextPerson: (person: string) => (person ? `Text ${firstOf(person)}` : "Message"),
  SearchOrAsk: () => "Search or ask",
  CallOrAsk: () => "Call or ask",
  AskDuringCall: () => "Ask during call",
  AskAbout: (person: string) => (person ? `Ask about ${firstOf(person)}` : "Ask Alpha"),
} as const;

/**
 * The one bottom bar of Phone, Messages and Contacts: the left slot holds the target the bar is not addressing, the field the one it is.
 * @model spec/telephony/comms.md
 * @design design.md
 */
export function CommsBar({ comms, person = "", value, onText, onSubmit, canSubmit = false, onAlpha, onBack, onEnd, onDictate, onAttach }: CommsBarProps) {
  const field = barField(comms);
  const slot = leftSlot(comms);
  const alpha = field === "AskAlpha";
  const placeholder = PLACEHOLDER[field](person);
  return (
    <div className="flex items-end gap-2 border-t border-border bg-background px-3 py-2">
      {slot === "AlphaButton" && (
        <button type="button" aria-label="Open Alpha" onClick={onAlpha} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary")}>
          <img src="/logo-mark.svg" alt="" className="size-full scale-[1.18] rounded-full object-cover" />
        </button>
      )}
      {slot === "AvatarSlot" && (
        <button type="button" aria-label={person ? `Back to texting ${firstOf(person)}` : "Back to the message"} onClick={onBack} className={cn(focusRing, "shrink-0 rounded-full")}>
          <Avatar name={person || "#"} />
        </button>
      )}
      {slot === "CallSlot" && (
        <Button variant="secondary" size="icon" aria-label="Back to the call" onClick={onBack}>
          <Phone aria-hidden />
        </Button>
      )}
      {!alpha && field === "TextPerson" && onAttach && (
        <Button variant="ghost" size="icon" aria-label="Attach a picture" onClick={onAttach}>
          <ImageIcon aria-hidden />
        </Button>
      )}
      <Textarea
        data-alpha-composer
        rows={1}
        value={value}
        maxLength={1600}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && canSubmit) {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        className={cn("max-h-[min(168px,28dvh)] min-h-11 flex-1 resize-none overflow-y-auto", alpha && "border-primary ring-1 ring-primary")}
      />
      {canSubmit ? (
        <Button size="icon" aria-label={alpha ? "Send to Alpha" : "Send"} onClick={onSubmit}>
          <ArrowUp aria-hidden />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" aria-label={alpha ? "Dictate a request to Alpha" : "Dictate"} onClick={onDictate} disabled={!onDictate}>
          <Mic aria-hidden />
        </Button>
      )}
      {endPlace(comms) === "EndBesideBar" && (
        <Button variant="destructive" size="icon" aria-label="End call" onClick={onEnd} className="size-11">
          <PhoneOff aria-hidden />
        </Button>
      )}
    </div>
  );
}
