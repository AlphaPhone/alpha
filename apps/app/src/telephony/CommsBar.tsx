// spec/app/telephony/comms.md, "Story: Address the person or Alpha from one bar"; spec/app/telephony/comms.md, "Story: Never lose End"
import { Button } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { PhoneOff, Sparkles } from "lucide-react";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as BarMachine } from "../../gen/app__telephony__callBar.effect.vibe";
import { shownCall } from "../../gen/app__telephony__callBar.ts";
import { useMachine as useBar } from "../../gen/app__telephony__callBar.react.ts";
import type { Machine as CommsMachine } from "../../gen/app__telephony__comms.effect.vibe";
import { endPlace, leftSlot } from "../../gen/app__telephony__comms.ts";
import { useMachine as useComms } from "../../gen/app__telephony__comms.react.ts";

/** What the comms bar reads: the resident comms stage, call bar and shell. */
export type CommsServices = CommsMachine | BarMachine | ShellMachine;

export interface CommsBarProps {
  runtime: ManagedRuntime.ManagedRuntime<CommsServices, unknown>;
}

/**
 * The bottom of Phone, Messages and Contacts: Alpha one tap away while the person is addressed, and End beside the bar,
 * red and right-most, while a call is live and the conversation with Alpha is closed.
 * @model spec/app/telephony/comms.md
 */
export function CommsBar({ runtime }: CommsBarProps) {
  const comms = useComms(runtime);
  const bar = useBar(runtime);
  const shell = useShell(runtime);
  if (!comms.state || !bar.state) return null;
  const raise = { type: "raise", detent: "Sheet" } as const;
  const opened = { type: "alphaOpened" } as const;
  const end = { type: "endAsked", callId: shownCall(bar.state.calls).id } as const;
  const alpha = leftSlot(comms.state) === "AlphaButton" && comms.can(opened, "Owner") && shell.can(raise);
  const ending = endPlace(comms.state) === "EndBesideBar" && bar.can(end);
  if (!alpha && !ending) return null;
  return (
    <div className="flex items-center gap-2">
      {alpha && <Button variant="secondary" size="icon" aria-label="Ask Alpha" onClick={() => { void comms.send(opened, "Owner"); void shell.send(raise); }}><Sparkles /></Button>}
      <span className="flex-1" />
      {ending && <Button variant="destructive" size="icon" aria-label="End" onClick={() => void bar.send(end)}><PhoneOff /></Button>}
    </div>
  );
}
