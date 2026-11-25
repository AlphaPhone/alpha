// spec/app/notes/previous.md, "Story: Look at the notes from before"
import { Alert, AppHeader, Button, EmptyState, NoteRow, Spinner } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import type { Event } from "../../gen/app__notes__previous.ts";
import { useMachine } from "../../gen/app__notes__previous.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { EarlierNotes } from "./previous.vibe";

export function Previous({ runtime }: { readonly runtime: Alpha["runtime"] }) {
  const machine = useMachine(runtime);
  const state = machine.state;
  if (!state?.showing) return null;
  const send = (event: Event) => void machine.send(event, "Owner");
  const can = (event: Event) => machine.can(event, "Owner");
  const get = (id: number) => runtime.runSync(EarlierNotes.use((notes) => notes.get(id)));
  const opened = state.old > 0 ? get(state.old) : undefined;
  const back = opened === undefined ? { type: "backToNotes" } as const : { type: "closeOld" } as const;
  const rows = (values: typeof state.olds) => values.map(({ id, kind }) => {
    const note = get(id);
    if (note === undefined) return null;
    const open = { type: "openOld", id } as const;
    return <NoteRow key={id} title={note.title || "Untitled"} date="" preview={note.body || note.details.join("\n")} voice={kind === "Voice"}
      onClick={can(open) ? () => send(open) : undefined} />;
  });
  return (
    <section aria-label="Notes on this phone" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title={opened === undefined ? "On this phone" : opened.title || "Untitled"} leading={can(back) && <Button size="icon" variant="ghost"
        aria-label={opened === undefined ? "Return to Notes" : "Back to previous notes"} onClick={() => send(back)}><ArrowLeft /></Button>} />
      <div className="flex flex-col gap-3 px-4 pb-12">
        {state.read.status === "Loading" && <Spinner className="self-center" label="Reading previous notes" />}
        {state.read.status === "Failed" && <Alert variant="warn">The notes from this phone couldn't be read.
          {can({ type: "retry" }) && <Button className="ml-2" size="sm" onClick={() => send({ type: "retry" })}>Try again</Button>}
        </Alert>}
        {opened ? <article className="mx-auto w-full max-w-180 whitespace-pre-wrap px-2 py-4">
          <p>{opened.body}</p>
          {opened.details.map((part, index) => <p key={index}>{part}</p>)}
        </article> : <>
          {state.read.status === "Loaded" && state.olds.length === 0 && state.binned.length === 0 && <EmptyState title="No previous notes" />}
          {rows(state.olds)}
          {state.binned.length > 0 && <h2 className="px-2 pt-3 text-sm font-semibold text-muted-foreground">Recently deleted</h2>}
          {rows(state.binned)}
        </>}
      </div>
    </section>
  );
}
