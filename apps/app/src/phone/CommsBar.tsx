// spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"; spec/app/phone/comms.md, "Story: Never lose End"
import { Button, Input, Mark } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowUp, PhoneOff } from "lucide-react";
import type { ReactNode } from "react";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as BarMachine } from "../../gen/app__phone__call.effect.vibe";
import { shownCall } from "../../gen/app__phone__call.ts";
import { useMachine as useBar } from "../../gen/app__phone__call.react.ts";
import type { Machine as CommsMachine } from "../../gen/app__phone__comms.effect.vibe";
import { endPlace } from "../../gen/app__phone__comms.ts";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { Dialer } from "./phone.vibe";

/** The services for the targets in the communications dock. */
export type CommsServices = CommsMachine | BarMachine | ShellMachine | PhoneMachine | Dialer;
type DockRuntime = ManagedRuntime.ManagedRuntime<CommsServices, unknown>;

export interface CommsBarProps {
  runtime: DockRuntime;
  /** What the owner can write or do while the sheet is closed. */
  closed?: ReactNode;
  /** The person this view is about. */
  person?: { label: string; initials: string };
}

/** The sheet's detent is owned by the shell, and also controls which composer can take focus. */
export function useCommsDock(runtime: ManagedRuntime.ManagedRuntime<ShellMachine, unknown>) {
  const { state, can, send } = useShell(runtime);
  return {
    open: state !== undefined && state.assistant !== "Bar",
    close: () => {
      if (state?.assistant === "Full") void send({ type: "goBack" });
      if (state?.assistant !== "Bar" && can({ type: "goBack" })) void send({ type: "goBack" });
    },
  };
}

/**
 * The owner side of the dock. While the sheet is open, Ask Alpha supplies the only composer.
 * @model spec/app/phone/comms.md
 */
export function CommsBar({ runtime, closed, person }: CommsBarProps) {
  const comms = useComms(runtime);
  const bar = useBar(runtime);
  const shell = useShell(runtime);
  if (!shell.state || shell.state.assistant !== "Bar") return null;
  const raise = { type: "raise", detent: "Sheet" } as const;
  const end = { type: "endAsked", callId: bar.state ? shownCall(bar.state.calls).id : "" } as const;
  const ending = comms.state && endPlace(comms.state) === "EndBesideBar" && bar.can(end);
  const opening = shell.can(raise);
  const open = (query = "") => {
    if (!opening) return;
    if (query !== "" && comms.state) void comms.send({ type: "requestTyped", about: comms.state.key, request: query }, "Owner");
    void shell.send(raise);
  };
  const phone = shell.state.trail.at(-1) === "Phone";
  const placeholder = ending ? "Ask during call" : phone ? "Call or ask" : person ? `Ask about ${person.label.split(" ")[0]}` : "Search or ask";
  return (
    <div data-alpha-comms-dock="" data-host-chrome="" className="sticky bottom-0 z-dock mt-auto flex shrink-0 items-end gap-2 bg-background px-3 py-2">
      <Button size="icon" aria-label="Open Alpha" className="size-11 shrink-0 bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!opening} onClick={() => open()}><Mark aria-hidden /></Button>
      {closed ?? <CommsQuery runtime={runtime} phone={phone && !ending} placeholder={placeholder} onAsk={open} />}
      {ending && <Button variant="destructive" size="icon" className="size-11 shrink-0" aria-label="End call" onClick={() => void bar.send(end)}><PhoneOff /></Button>}
    </div>
  );
}

function CommsQuery({ runtime, phone, placeholder, onAsk }: { runtime: DockRuntime; phone: boolean; placeholder: string; onAsk: (query: string) => void }) {
  const machine = usePhone(runtime);
  const query = phone ? runtime.runSync(Dialer.use((dialer) => dialer.get())).sought : undefined;
  return (
    <form className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-muted px-1" onSubmit={(event) => {
      event.preventDefault();
      const value = new FormData(event.currentTarget).get("query");
      if (typeof value === "string") onAsk(value.trim());
    }}>
      <Input name="query" data-alpha-composer="" aria-label={placeholder} placeholder={placeholder} value={query}
        onChange={phone ? (event) => {
          const sought = event.target.value;
          runtime.runSync(Dialer.use((dialer) => dialer.set({ sought, filterLabel: "" })));
          const search = { type: "search", typed: sought.trim() !== "" } as const;
          if (machine.can(search)) void machine.send(search);
        } : undefined}
        className="min-w-0 flex-1 border-0 bg-transparent shadow-none" />
      <Button size="icon" variant="ghost" type="submit" aria-label="Ask Alpha"><ArrowUp /></Button>
    </form>
  );
}
