// spec/telephony/phone.md, "Dial hands one number at a time to Telecom, and only from the showing it started in"; spec/telephony/phone.md, "A number handed to Phone fills the keypad once it is idle, and never dials"
import { Delete, Phone as PhoneIcon } from "lucide-react";
import type { Phone } from "../../../gen/telephony__phone.ts";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { displayNumber, phoneNoticeText } from "./present.ts";

const KEYS: readonly [string, string][] = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];

export interface KeypadProps {
  /** Phone's state: the number, the notice and whether a read or a dial is busy. */
  phone: Phone;
  /** A contact whose number contains the typed digits, offered to call. */
  match?: { title: string; number: string };
  /** A key press; `+` comes from holding 0. */
  onPress: (key: string) => void;
  /** Take the last character off. */
  onErase: () => void;
  /** Call the number given. */
  onDial: (number: string) => void;
}

/**
 * The keypad: the number, its notice, the twelve keys and Call. Locked while a read or a dial is busy; only Call dials.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function Keypad({ phone, match, onPress, onErase, onDial }: KeypadProps) {
  const busy = phone.reading || phone.dialing;
  const notice = phoneNoticeText(phone.notice);
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-4">
      <output aria-label="Number" className="min-h-10 font-sans text-3xl tabular-nums">{displayNumber(phone.number)}</output>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {match && (
        <button type="button" disabled={busy} onClick={() => onDial(match.number)} aria-label={`Call ${match.title}`} className={cn(focusRing, "rounded-md px-3 py-1 text-sm text-primary")}>
          {match.title} · {displayNumber(match.number)}
        </button>
      )}
      <div role="group" aria-label="Keypad" className="grid grid-cols-3 gap-3">
        {KEYS.map(([key, letters]) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            aria-label={key}
            onClick={() => onPress(key)}
            onContextMenu={(event) => {
              if (key !== "0") return;
              event.preventDefault();
              onPress("+");
            }}
            className={cn(focusRing, "flex size-18 flex-col items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-50")}
          >
            <span className="text-2xl">{key}</span>
            {letters && <span className="font-mono text-xs uppercase text-muted-foreground">{letters}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <Button size="lg" aria-label="Call" disabled={busy || phone.number === ""} loading={phone.dialing} onClick={() => onDial(phone.number)} className="size-16 rounded-full bg-ok text-primary-foreground">
          <PhoneIcon aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Delete" disabled={busy || phone.number === ""} onClick={onErase}>
          <Delete aria-hidden />
        </Button>
      </div>
    </div>
  );
}
