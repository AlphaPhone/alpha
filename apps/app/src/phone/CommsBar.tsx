// spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"; spec/app/phone/comms.md, "Story: Never lose End"
import { Button, Input, Mark } from "@repo/ui";
import { Effect, Exit, type ManagedRuntime } from "effect";
import { ArrowUp, Mic, PhoneOff } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { Machine as ShellMachine, canGoBack } from "../../gen/app__shell.effect.vibe";
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
import { CommsPrompts, commsHeld } from "./comms.vibe";

/** The services for the targets in the communications dock. */
export type CommsServices = CommsMachine | BarMachine | ShellMachine | PhoneMachine | Dialer | CommsPrompts;
type DockRuntime = ManagedRuntime.ManagedRuntime<CommsServices, unknown>;
const holdMovement = 10;

interface QueryFilter {
  value: string;
  onChange: (query: string) => void;
  maxLength?: number;
}

export interface CommsBarProps {
  runtime: DockRuntime;
  /** A visible list's own search, kept by the area while the sheet is closed. */
  filter?: QueryFilter;
  /** What the owner can write or do while the sheet is closed. */
  closed?: ReactNode | ((ask: (query: string) => void, talk: (() => void) | undefined) => ReactNode);
  /** The person this view is about. */
  person?: { label: string; initials: string };
}

/** The sheet's detent is owned by the shell, and also controls which composer can take focus. */
export function useCommsDock(runtime: ManagedRuntime.ManagedRuntime<ShellMachine, unknown>) {
  const { state } = useShell(runtime);
  return {
    open: state?.assistant === "Sheet" || state?.assistant === "Full",
    close: () => {
      void runtime.runPromiseExit(Effect.gen(function* () {
        const shell = yield* ShellMachine;
        for (let step = 0; step < 2; step += 1) {
          const current = yield* shell.get();
          if (current.assistant === "Bar" || !canGoBack(current)) break;
          yield* Effect.exit(shell.send({ type: "goBack" }));
        }
      }));
    },
  };
}

/**
 * The owner side of the dock. While the sheet is open, Ask Alpha supplies the only composer.
 * @model spec/app/phone/comms.md
 */
export function CommsBar({ runtime, closed, filter, person }: CommsBarProps) {
  const comms = useComms(runtime);
  const bar = useBar(runtime);
  const shell = useShell(runtime);
  const holdRef = useRef<{ id: number; x: number; y: number; cancel: () => void }>(undefined);
  const skipTapRef = useRef(false);
  const release = useCallback(() => {
    holdRef.current?.cancel();
    holdRef.current = undefined;
  }, []);
  const holdButton = useCallback((node: HTMLButtonElement | null) => {
    if (node) return release;
  }, [release]);
  if (!shell.state || shell.state.assistant === "Sheet" || shell.state.assistant === "Full") return null;
  const raise = { type: "raise", detent: "Sheet" } as const;
  const end = { type: "endAsked", callId: bar.state ? shownCall(bar.state.calls).id : "" } as const;
  const ending = comms.state && endPlace(comms.state) === "EndBesideBar" && bar.can(end);
  const opening = shell.can(raise);
  const open = async (query = "") => {
    if (!opening) return;
    const about = comms.state?.key;
    const text = query.trim();
    const request = about !== undefined ? ({ type: "requestTyped", about, request: text } as const) : undefined;
    if (text !== "" && request !== undefined && comms.can(request, "Owner")) await comms.send(request, "Owner");
    const raised = await shell.send(raise);
    if (Exit.isSuccess(raised) && text !== "" && about !== undefined) {
      await runtime.runPromise(Effect.flatMap(CommsPrompts, (prompts) => prompts.submit({ about, text })));
    }
  };
  const view = shell.state.trail.at(-1);
  const talk = () => {
    const about = comms.state?.key;
    if (ending || !opening || !about || (view !== "Phone" && view !== "Messages" && view !== "Contacts")) return;
    void runtime.runPromise(Effect.flatMap(CommsPrompts, (prompts) => prompts.talk({ about, view })));
  };
  const phone = view === "Phone";
  const placeholder = ending ? "Ask during call" : phone ? "Call or ask" : person ? `Ask about ${person.label.split(" ")[0]}` : "Search or ask";
  return (
    <div data-alpha-comms-dock="" data-host-chrome="" className="sticky bottom-0 z-dock mx-[3.9%] mt-auto mb-[max(clamp(1.5rem,6.8vw,1.75rem),calc(var(--alpha-safe-bottom)_+_0.75rem))] flex min-h-[clamp(4rem,18vw,4.625rem)] shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1.5 shadow-lg">
      <Button ref={holdButton} size="icon" aria-label="Open Alpha" className="size-11 shrink-0 touch-none overflow-hidden bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!opening}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          release();
          skipTapRef.current = false;
          if (ending) return;
          const id = event.pointerId;
          event.currentTarget.setPointerCapture?.(id);
          const fiber = runtime.runFork(commsHeld(() => {
            if (holdRef.current?.id !== id || ending) return;
            skipTapRef.current = true;
            talk();
          }));
          holdRef.current = { id, x: event.clientX, y: event.clientY, cancel: () => fiber.interruptUnsafe() };
        }}
        onPointerMove={(event) => {
          const from = holdRef.current;
          if (!from || from.id !== event.pointerId || Math.hypot(event.clientX - from.x, event.clientY - from.y) <= holdMovement) return;
          skipTapRef.current = true;
          release();
        }}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.detail === 0 || !skipTapRef.current) void open();
          skipTapRef.current = false;
        }}><Mark className="size-[118%]" aria-hidden /></Button>
      {typeof closed === "function" ? closed((query) => void open(query), ending ? undefined : talk) : closed ?? <CommsQuery runtime={runtime} phone={phone && !ending} filter={ending ? undefined : filter} placeholder={placeholder} onAsk={(query) => void open(query)} onTalk={ending ? undefined : talk} />}
      {ending && <Button variant="destructive" size="icon" className="size-11 shrink-0" aria-label="End call" onClick={() => void bar.send(end)}><PhoneOff /></Button>}
    </div>
  );
}

function CommsQuery({ runtime, phone, filter, placeholder, onAsk, onTalk }: { runtime: DockRuntime; phone: boolean; filter?: QueryFilter | undefined; placeholder: string; onAsk: (query: string) => void; onTalk: (() => void) | undefined }) {
  const machine = usePhone(runtime);
  const [draft, setDraft] = useState("");
  const phoneFilter: QueryFilter | undefined = phone && machine.can({ type: "search", typed: true }) ? {
    value: runtime.runSync(Effect.flatMap(Dialer, (dialer) => dialer.get())).sought,
    onChange: (sought) => {
      runtime.runSync(Effect.flatMap(Dialer, (dialer) => dialer.set({ sought, filterLabel: "" })));
      const search = { type: "search", typed: sought.trim() !== "" } as const;
      if (machine.can(search)) void machine.send(search);
    },
  } : undefined;
  const owned = filter ?? phoneFilter;
  const query = owned?.value ?? draft;
  return (
    <form className="flex min-w-0 flex-1 items-center gap-1 px-1" onSubmit={(event) => {
      event.preventDefault();
      const value = new FormData(event.currentTarget).get("query");
      if (typeof value === "string") onAsk(value.trim());
    }}>
      <Input key={owned ? "search" : "ask"} name="query" data-alpha-composer="" aria-label={placeholder} placeholder={placeholder}
        value={query} maxLength={owned?.maxLength} onChange={(event) => (owned?.onChange ?? setDraft)(event.currentTarget.value)}
        className="min-w-0 flex-1 border-0 bg-transparent shadow-none" />
      {query.trim() === "" && onTalk
        ? <Button size="icon" variant="ghost" type="button" aria-label="Talk" onClick={onTalk}><Mic /></Button>
        : <Button size="icon" variant="ghost" type="submit" aria-label="Ask Alpha"><ArrowUp /></Button>}
    </form>
  );
}
