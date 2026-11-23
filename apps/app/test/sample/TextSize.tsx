// spec/app/sample/size.md, "Story: Read Alpha at my size"
import { Alert, Button } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__sample__size.effect.vibe";
import { useMachine } from "../../gen/app__sample__size.react.ts";
import { useTimed } from "../../src/runtime/react.ts";
import { untimed } from "../../src/runtime/reactor.vibe";
import type { Time } from "../../src/runtime/time.vibe";

export interface TextSizeProps {
  /** Provides the text size machine, `size` of size.vibe, and Alpha's time, at which `can` is asked. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Time, unknown>;
}

const sizes = [75, 100, 115, 130, 150];

/** The sizes the owner may choose now, each offered exactly when the rules take it from the owner. */
export function TextSize({ runtime }: TextSizeProps) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state) return null;
  return (
    <section aria-label="Text size" className="flex flex-wrap gap-2 p-4">
      {state.unkept && <Alert variant="warn">The phone did not keep that size</Alert>}
      {sizes.map((percent) => {
        const choose = { type: "choose", percent, at: untimed } as const;
        return can(choose, "Owner") && <Button key={percent} variant="outline" onClick={() => void send(choose, "Owner")}>{`Text at ${percent}%`}</Button>;
      })}
    </section>
  );
}
