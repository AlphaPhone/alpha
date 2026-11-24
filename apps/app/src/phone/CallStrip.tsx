// spec/app/phone/call.md, "Story: See my live call over every view"
import { Button, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { PhoneOff } from "lucide-react";
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
  if (phase === "EndedBar") return <div role="status" className={cn("flex h-12 shrink-0 items-center justify-center bg-muted text-muted-foreground", !stage && "fixed inset-x-0 top-0 z-50")}>{words}</div>;
  const back = { type: "returnAsked", callId: call.id } as const;
  const end = { type: "endAsked", callId: call.id } as const;
  const ending = !stage || (comms !== undefined && endPlace(comms) === "EndInCard");
  return (
    <div role="region" aria-label="Ongoing call" className={cn("flex h-12 shrink-0 items-center gap-2 px-4", stage ? "border-b border-border bg-background" : "fixed inset-x-0 top-0 z-50 bg-primary text-primary-foreground")}>
      <button type="button" className="flex-1 text-left font-semibold" disabled={!can(back)} onClick={() => void send(back)}>{words}</button>
      {ending && <Button variant="destructive" size="icon" aria-label="End call" disabled={!can(end)} onClick={() => void send(end)}><PhoneOff /></Button>}
    </div>
  );
}
