// spec/app/phone/call.md, "Story: See my live call over every view"
import { Button } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Phone, PhoneOff } from "lucide-react";
import type { BarWords, Machine as BarMachine } from "../../gen/app__phone__call.effect.vibe";
import { barDrawn, barWords, shownCall } from "../../gen/app__phone__call.ts";
import { useMachine } from "../../gen/app__phone__call.react.ts";

export interface CallStripProps {
  /** Provides the resident call strip. */
  runtime: ManagedRuntime.ManagedRuntime<BarMachine, unknown>;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function said(words: BarWords): string {
  switch (words.tag) {
    case "OnCallFor": return `On call · ${clock(words.seconds)}`;
    case "Incoming": return "Incoming call";
    case "Calling": return "Calling";
    case "OnHold": return "On hold";
    case "OnCall": return "On call";
    case "CallEnded": return "Call ended";
    default: {
      const _exhaustive: never = words;
      return _exhaustive;
    }
  }
}

/**
 * The bar over every view while a call is live: what the call screen says, Return on the bar itself and End beside it;
 * an ended call's bar holds its place a moment and takes no taps, and a ringing call is Android's alone.
 * @model spec/app/phone/call.md
 */
export function CallStrip({ runtime }: CallStripProps) {
  const { state, can, send } = useMachine(runtime);
  if (!state) return null;
  const phase = barDrawn(state);
  if (phase === "NoBar") return null;
  const call = shownCall(state.calls);
  const words = said(barWords(state));
  const ended = phase === "EndedBar";
  const back = { type: "returnAsked", callId: call.id } as const;
  const end = { type: "endAsked", callId: call.id } as const;
  return (
    <div role="region" aria-label="Ongoing call" className={`fixed inset-x-3 top-[max(3rem,calc(env(safe-area-inset-top)_+_0.75rem))] z-50 mx-auto flex h-13 max-w-[26.5rem] items-center gap-1 rounded-full px-0.5 text-alpha-foreground shadow-md ${ended ? "bg-muted-foreground" : "bg-call"}`}>
      <Button variant="ghost" className="min-w-0 flex-1 justify-start px-3 text-left hover:bg-transparent" disabled={!can(back)} onClick={() => void send(back)}>
        <Phone aria-hidden className="size-4.5" /><span className="truncate tabular-nums">{words}</span>
      </Button>
      <span className="sr-only" role="status">{words}</span>
      {ended ? <span aria-hidden className="size-12 shrink-0" /> : <Button variant="destructive" size="icon" className="size-12" aria-label="End call" disabled={!can(end)} onClick={() => void send(end)}><PhoneOff /></Button>}
    </div>
  );
}
