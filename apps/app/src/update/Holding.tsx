// spec/app/update/page.md, "Story: Open Alpha while an update is pending"; spec/app/update/page.md, "\"Updating Alpha…\" shows while a page holds or an update is pending, and \"Continue update\" only while it is paused and Android allows"
import { Button, Dialog, DialogContent, DialogTitle } from "@repo/ui";
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
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={kept}
        onInteractOutside={kept}
        // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- design.md, "Dark": the theme class keeps this panel white in both themes, as develop draws it
        className="light inset-0 top-0 grid max-w-none translate-y-0 content-center justify-items-center gap-4 rounded-none bg-background p-6 text-md text-foreground shadow-none motion-safe:animate-none"
      >
        <DialogTitle className="text-md font-normal">Updating Alpha…</DialogTitle>
        {can(tap) && <Button className="h-auto min-h-11 rounded-panel py-2 text-md font-normal" onClick={() => void send(tap)}>Continue update</Button>}
      </DialogContent>
    </Dialog>
  );
}
