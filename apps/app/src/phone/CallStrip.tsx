// spec/app/phone/call.md, "Story: See my live call over every view"
import { Button, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Phone, PhoneOff } from "lucide-react";
import type { BarWords, Machine as BarMachine } from "../../gen/app__phone__call.effect.vibe";
import { barDrawn, barWords, shownCall } from "../../gen/app__phone__call.ts";
import { useMachine } from "../../gen/app__phone__call.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { endPlace } from "../../gen/app__phone__comms.ts";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { isCommsView } from "../shell/views.tsx";

export interface CallStripProps {
  /** Provides the resident call strip. */
  runtime: ManagedRuntime.ManagedRuntime<BarMachine | ShellMachine | CommsMachine, unknown>;
  /** At the top of the communications stage instead of over another view. */
  stage?: boolean;
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
export function CallStrip({ runtime, stage = false }: CallStripProps) {
  const { state, can, send } = useMachine(runtime);
  const shell = useShell(runtime).state;
  const comms = useComms(runtime).state;
  if (!state || !shell || stage !== isCommsView(shell.trail.at(-1)) || (stage && shell.assistant === "Full")) return null;
  const phase = barDrawn(state);
  if (phase === "NoBar") return null;
  const call = shownCall(state.calls);
  const words = said(barWords(state));
  const ended = phase === "EndedBar";
  const back = { type: "returnAsked", callId: call.id } as const;
  const end = { type: "endAsked", callId: call.id } as const;
  const ending = !stage || (comms !== undefined && endPlace(comms) === "EndInCard");
  const foreground = ended ? "text-background" : "text-alpha-foreground";
  return (
    <div role="region" aria-label="Ongoing call" className={cn(
      "mx-auto flex h-13 max-w-[26.5rem] shrink-0 items-center gap-1 rounded-full px-0.5 shadow-md",
      stage ? "w-[calc(100%_-_1.5rem)]" : "fixed inset-x-3 top-[max(3rem,calc(env(safe-area-inset-top)_+_0.75rem))] z-50",
      ended ? "bg-muted-foreground" : "bg-call", foreground,
    )}>
      <Button variant="ghost" className={cn("min-w-0 flex-1 justify-start px-3 text-left hover:bg-transparent disabled:opacity-100", foreground)}
        disabled={ended || !can(back)} onClick={() => void send(back)}>
        <Phone aria-hidden className="size-4.5" /><span className="truncate tabular-nums">{words}</span>
      </Button>
      <span className="sr-only" role="status">{words}</span>
      {ending && (ended ? <span aria-hidden className="size-12 shrink-0" /> :
        <Button variant="destructive" size="icon" className="size-12" aria-label="End call" disabled={!can(end)} onClick={() => void send(end)}><PhoneOff /></Button>)}
    </div>
  );
}
