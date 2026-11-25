// spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"; spec/app/phone/comms.md, "Story: Never lose End"
import { Button, Input, Mark } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowUp, Mic, PhoneOff } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { CommsPrompts } from "./comms.vibe";

/** The services for the targets in the communications dock. */
export type CommsServices = CommsMachine | BarMachine | ShellMachine | PhoneMachine | Dialer | CommsPrompts;
type DockRuntime = ManagedRuntime.ManagedRuntime<CommsServices, unknown>;
const talkHoldMs = 500;
const holdMovement = 10;

export interface CommsBarProps {
  runtime: DockRuntime;
  /** What the owner can write or do while the sheet is closed. */
  closed?: ReactNode | ((ask: (query: string) => void) => ReactNode);
  /** The person this view is about. */
  person?: { label: string; initials: string };
}

/** The sheet's detent is owned by the shell, and also controls which composer can take focus. */
export function useCommsDock(runtime: ManagedRuntime.ManagedRuntime<ShellMachine, unknown>) {
  const { state, can, send } = useShell(runtime);
  return {
    open: state?.assistant === "Sheet" || state?.assistant === "Full",
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
  const hold = useRef<{ id: number; x: number; y: number; timer: number }>(undefined);
  const skipTap = useRef(false);
  const release = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = undefined;
  };
  useEffect(() => () => { if (hold.current) window.clearTimeout(hold.current.timer); }, []);
  if (!shell.state || shell.state.assistant === "Sheet" || shell.state.assistant === "Full") return null;
  const raise = { type: "raise", detent: "Sheet" } as const;
  const end = { type: "endAsked", callId: bar.state ? shownCall(bar.state.calls).id : "" } as const;
  const ending = comms.state && endPlace(comms.state) === "EndBesideBar" && bar.can(end);
  const opening = shell.can(raise);
  const open = async (query = "") => {
    if (!opening) return;
    const about = comms.state?.key;
    const text = query.trim();
    if (text !== "" && about !== undefined) await comms.send({ type: "requestTyped", about, request: text }, "Owner");
    await shell.send(raise);
    if (text !== "" && about !== undefined) await runtime.runPromise(CommsPrompts.use((prompts) => prompts.submit({ about, text })));
  };
  const view = shell.state.trail.at(-1);
  const talk = () => {
    const about = comms.state?.key;
    if (!opening || !about || (view !== "Phone" && view !== "Messages" && view !== "Contacts")) return;
    void runtime.runPromise(CommsPrompts.use((prompts) => prompts.talk({ about, view })));
  };
  const phone = view === "Phone";
  const placeholder = ending ? "Ask during call" : phone ? "Call or ask" : person ? `Ask about ${person.label.split(" ")[0]}` : "Search or ask";
  return (
    <div data-alpha-comms-dock="" data-host-chrome="" className="sticky bottom-0 z-dock mx-[3.9%] mt-auto mb-[max(clamp(1.5rem,6.8vw,1.75rem),calc(env(safe-area-inset-bottom)_+_0.75rem))] flex min-h-[clamp(4rem,18vw,4.625rem)] shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1.5 shadow-lg">
      <Button size="icon" aria-label="Open Alpha" className="size-11 shrink-0 touch-none overflow-hidden bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!opening}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          release();
          skipTap.current = false;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          hold.current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: window.setTimeout(() => {
            skipTap.current = true;
            talk();
          }, talkHoldMs) };
        }}
        onPointerMove={(event) => {
          const from = hold.current;
          if (!from || from.id !== event.pointerId || Math.hypot(event.clientX - from.x, event.clientY - from.y) <= holdMovement) return;
          skipTap.current = true;
          release();
        }}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.detail === 0 || !skipTap.current) void open();
          skipTap.current = false;
        }}><Mark className="size-[118%]" aria-hidden /></Button>
      {typeof closed === "function" ? closed((query) => void open(query)) : closed ?? <CommsQuery runtime={runtime} phone={phone && !ending} placeholder={placeholder} onAsk={(query) => void open(query)} onTalk={ending ? undefined : talk} />}
      {ending && <Button variant="destructive" size="icon" className="size-11 shrink-0" aria-label="End call" onClick={() => void bar.send(end)}><PhoneOff /></Button>}
    </div>
  );
}

function CommsQuery({ runtime, phone, placeholder, onAsk, onTalk }: { runtime: DockRuntime; phone: boolean; placeholder: string; onAsk: (query: string) => void; onTalk: (() => void) | undefined }) {
  const machine = usePhone(runtime);
  const filtering = phone && machine.can({ type: "search", typed: true });
  const [draft, setDraft] = useState("");
  const query = filtering ? runtime.runSync(Dialer.use((dialer) => dialer.get())).sought : draft;
  return (
    <form className="flex min-w-0 flex-1 items-center gap-1 px-1" onSubmit={(event) => {
      event.preventDefault();
      const value = new FormData(event.currentTarget).get("query");
      if (typeof value === "string") onAsk(value.trim());
    }}>
      <Input key={filtering ? "search" : "ask"} name="query" data-alpha-composer="" aria-label={placeholder} placeholder={placeholder} value={query}
        onChange={filtering ? (event) => {
          const sought = event.target.value;
          runtime.runSync(Dialer.use((dialer) => dialer.set({ sought, filterLabel: "" })));
          const search = { type: "search", typed: sought.trim() !== "" } as const;
          if (machine.can(search)) void machine.send(search);
        } : (event) => setDraft(event.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent shadow-none" />
      {query.trim() === "" && onTalk
        ? <Button size="icon" variant="ghost" type="button" aria-label="Talk" onClick={onTalk}><Mic /></Button>
        : <Button size="icon" variant="ghost" type="submit" aria-label="Ask Alpha"><ArrowUp /></Button>}
    </form>
  );
}
