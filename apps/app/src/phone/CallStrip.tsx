// spec/app/phone/call.md, "Story: See my live call over every view"
import { Button, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Phone } from "lucide-react";
import type { BarWords, Machine as BarMachine } from "../../gen/app__phone__call.effect.vibe";
import { barDrawn, barWords, shownCall } from "../../gen/app__phone__call.ts";
import { useMachine } from "../../gen/app__phone__call.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { endPlace } from "../../gen/app__phone__comms.ts";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { isCommsView } from "../shell/views.tsx";
import { hangupButton } from "./icons.ts";

export interface CallStripProps {
  /** Provides the resident call strip. */
  runtime: ManagedRuntime.ManagedRuntime<BarMachine | ShellMachine | CommsMachine, unknown>;
  /** At the top of the communications stage instead of over another view. */
  stage?: boolean;
}

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return minutes < 60 ? `${minutes}:${remainder}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${remainder}`;
}

function said(words: BarWords): string {
  switch (words.tag) {
    case "OnCallFor": return `On call · ${clock(words.seconds)}`;
    case "Incoming": return "Incoming call";
    case "Calling": return "Calling…";
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
  if (!state || !shell) return null;
  const communications = isCommsView(shell.trail.at(-1));
  if (communications && shell.assistant === "Full") return null;
  const open = shell.assistant === "Sheet";
  const atStage = communications && (open || comms?.emergency === true);
  if (stage !== atStage) return null;
  const phase = barDrawn(state);
  if (phase === "NoBar") return null;
  const call = shownCall(state.calls);
  const words = said(barWords(state));
  const ended = phase === "EndedBar";
  const back = { type: "returnAsked", callId: call.id } as const;
  const end = { type: "endAsked", callId: call.id } as const;
  const ending = !stage || (comms !== undefined && endPlace(comms) === "EndInCard");
  return (
    <div role="region" aria-label="Ongoing call" data-alpha-call-strip={stage ? "stage" : "over"} className={cn(
      "mx-auto flex h-13 shrink-0 items-center gap-1 rounded-full px-0.5 text-alpha-foreground shadow-bar dark:shadow-bar-dark",
      stage ? "w-[calc(100%_-_1.5rem)]" : "absolute inset-x-3 top-[calc(var(--alpha-call-inset-top)_+_0.375rem)] z-50",
      stage && open && "max-w-[26.5rem]",
      stage && !open && "mt-[calc(var(--alpha-call-inset-top)_+_0.375rem)] mb-1.5",
      ended ? "bg-call-ended" : "bg-call",
    )}>
      <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2.5 px-3 text-left text-base font-semibold text-alpha-foreground hover:bg-transparent hover:text-alpha-foreground disabled:opacity-100"
        aria-label={ended ? words : `Return to call, ${words}`} disabled={ended || !can(back)} onClick={() => void send(back)}>
        <Phone aria-hidden className="size-4.5" /><span className="truncate tabular-nums">{words}</span>
      </Button>
      <span className="sr-only" role="status">{ended ? words : ""}</span>
      {ending && (ended ? <span aria-hidden className="size-12 shrink-0" /> :
        <Button size="icon" className={cn("size-12", hangupButton)} aria-label="End call" disabled={!can(end)} onClick={() => void send(end)}><Phone aria-hidden className="size-5 rotate-135" /></Button>)}
    </div>
  );
}
