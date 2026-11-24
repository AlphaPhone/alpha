// spec/app/update/page.md, "Story: Open Alpha while an update is pending"; spec/app/update/page.md, "Updating Alpha… shows while a page holds or an update is pending, and Continue update only while it is paused and Android allows"
import { Button, Dialog, DialogContent, DialogTitle, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as PageMachine } from "../../gen/app__update__page.effect.vibe";
import { dialogShown } from "../../gen/app__update__page.ts";
import { useMachine } from "../../gen/app__update__page.react.ts";

export interface UpdateHoldingProps {
  /** Provides the resident page machine. */
  runtime: ManagedRuntime.ManagedRuntime<PageMachine, unknown>;
}

const tap = { type: "tapContinue" } as const;
const kept = (event: Event) => event.preventDefault();

/**
 * Over everything while an update is pending or the page holds for one: "Updating Alpha…", which nothing dismisses,
 * and Continue update where Android paused the update and allows it.
 * @model spec/app/update/page.md
 */
export function UpdateHolding({ runtime }: UpdateHoldingProps) {
  const { state, can, send } = useMachine(runtime);
  if (!state || !dialogShown(state)) return null;
  return (
    <Dialog open>
      <DialogContent aria-describedby={undefined} onEscapeKeyDown={kept} onInteractOutside={kept} className="items-center">
        <DialogTitle className="inline-flex items-center gap-2"><Spinner size="sm" aria-hidden />Updating Alpha…</DialogTitle>
        {can(tap) && <Button onClick={() => void send(tap)}>Continue update</Button>}
      </DialogContent>
    </Dialog>
  );
}
