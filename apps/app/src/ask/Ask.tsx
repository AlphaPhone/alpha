// spec/app/ask/index.md, "Story: Talk to my agent"
import { Alert, Button, Input, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useState } from "react";
import type { Machine } from "../../gen/app__ask.effect.vibe";
import { useMachine } from "../../gen/app__ask.react.ts";

export interface AskProps {
  /** Provides the conversation machine, `asking` of ask.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

const unfinished = {
  Refused: "The reply stopped",
  Unknown: "Alpha cannot tell whether the agent finished its reply",
} as const;

/**
 * Ask Alpha: what was said, the reply as the agent writes it, Stop exactly while a reply can be stopped and Send
 * exactly when the rules take what is typed.
 * @model spec/app/ask/index.md
 */
export function Ask({ runtime }: AskProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const [draft, setDraft] = useState("");
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Ask Alpha</Alert>;
  if (!state) return null;
  const say = { type: "say", text: draft.trim() } as const;
  const { outcome } = state.turn;
  return (
    <section aria-label="Ask Alpha" className="mt-auto flex flex-col gap-3 p-4">
      {state.opening.outcome === "Sent" && <Spinner label="Reaching your agent" />}
      {state.conversation === "" && can({ type: "begin" }) && (
        <>
          <Alert variant="warn">Your agent did not answer</Alert>
          <Button variant="outline" onClick={() => void send({ type: "begin" })}>Try again</Button>
        </>
      )}
      <ol aria-label="Conversation" className="flex flex-col gap-2">
        {state.lines.map((line, at) => (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- A conversation only grows at its end.
          <li key={at} className={line.mine ? "self-end rounded-md bg-primary px-3 py-2 text-primary-foreground" : "self-start rounded-md bg-muted px-3 py-2"}>{line.text}</li>
        ))}
        {state.reply !== "" && <li aria-label="Reply so far" className="self-start rounded-md bg-muted px-3 py-2">{state.reply}</li>}
      </ol>
      {(outcome === "Refused" || outcome === "Unknown") && <Alert variant="warn">{unfinished[outcome]}</Alert>}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!can(say)) return;
          void send(say);
          setDraft("");
        }}
      >
        <Input aria-label="Ask Alpha" placeholder="Ask Alpha" value={draft} onChange={(event) => setDraft(event.target.value)} />
        {can({ type: "stopReply" }) && <Button type="button" variant="outline" onClick={() => void send({ type: "stopReply" })}>Stop</Button>}
        {can(say) && <Button type="submit">Send</Button>}
      </form>
    </section>
  );
}
