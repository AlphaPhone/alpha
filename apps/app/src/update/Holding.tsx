// spec/app/update/page.md, "Story: Open Alpha while an update is pending"; spec/app/update/page.md, "Story: Carry on after the update"
import { Alert, Button, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as PageMachine } from "../../gen/app__update__page.effect.vibe";
import { dialogShown, noticeText } from "../../gen/app__update__page.ts";
import { useMachine } from "../../gen/app__update__page.react.ts";

export interface UpdateHoldingProps {
  /** Provides the resident page machine. */
  runtime: ManagedRuntime.ManagedRuntime<PageMachine, unknown>;
}

const tap = { type: "tapContinue" } as const;

/**
 * Over everything while an update is pending or the page holds for one: "Updating Alpha…", and Continue update
 * where Android paused it and allows it; after a manual update this page refused, the reason, once.
 * @model spec/app/update/page.md
 */
export function UpdateHolding({ runtime }: UpdateHoldingProps) {
  const { state, can, send } = useMachine(runtime);
  if (!state) return null;
  if (!dialogShown(state)) {
    const notice = noticeText(state);
    return notice === "" ? null : <div className="fixed inset-x-4 bottom-24"><Alert variant="warn">{notice}</Alert></div>;
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Updating Alpha" className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background/90">
      <span role="status" className="inline-flex items-center gap-2"><Spinner size="sm" aria-hidden />Updating Alpha…</span>
      {can(tap) && <Button onClick={() => void send(tap)}>Continue update</Button>}
    </div>
  );
}
