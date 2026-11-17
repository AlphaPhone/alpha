// spec/app/sample/index.md, "Story: See and dismiss reminders"
import { Alert, Button, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__sample.effect.vibe";
import { useMachine } from "../../gen/app__sample.react.ts";
import { untimed } from "../runtime/reactor.vibe";

export interface RemindersProps {
  /** Provides the reminders machine, `reminders` of sample.vibe, which is resident. */
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

const outcomes = {
  Refused: "The agent kept",
  Unknown: "Alpha cannot tell whether the agent deleted",
} as const;

/** The reminders the agent keeps, each one dismissable, with Undo offered and focused exactly while a dismissal is held. */
export function Reminders({ runtime }: RemindersProps) {
  const { state, cause, can, send } = useMachine(runtime);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not read its reminders</Alert>;
  if (!state) return null;
  const undo = { type: "undoDismiss", now: untimed } as const;
  const { outcome } = state.deletion.attempt;
  return (
    <section aria-label="Reminders" className="flex flex-col gap-3 p-4">
      {state.list.status === "Loading" && <Spinner label="Reading reminders" />}
      {state.list.status === "Failed" && <Alert variant="destructive">The agent did not answer</Alert>}
      {(outcome === "Refused" || outcome === "Unknown") && <Alert variant="warn">{`${outcomes[outcome]} “${state.deletion.title}”`}</Alert>}
      <ul className="flex flex-col gap-2">
        {state.titles.map((title) => {
          const dismiss = { type: "dismiss", title, now: untimed } as const;
          return (
            <li key={title} className="flex items-center justify-between gap-2">
              <span>{title}</span>
              {can(dismiss) && <Button variant="ghost" aria-label={`Dismiss ${title}`} onClick={() => void send(dismiss)}>Dismiss</Button>}
            </li>
          );
        })}
      </ul>
      {can(undo) && <Button key={state.undo.until} variant="outline" autoFocus onClick={() => void send(undo)}>{`Undo dismissing “${state.hidden}”`}</Button>}
      {can({ type: "refresh" }) && <Button variant="outline" onClick={() => void send({ type: "refresh" })}>Refresh</Button>}
    </section>
  );
}
