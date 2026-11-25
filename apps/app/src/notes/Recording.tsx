// spec/app/notes/recording.md, "Story: Record a voice note"; spec/app/notes/recording.md, "Story: Discard a recording"
import { Alert, AppHeader, Button, Dialog, DialogContent, DialogTitle, Spinner } from "@repo/ui";
import { AudioLines, ChevronLeft, Pause, Play } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__notes__recording.react.ts";
import type { Event } from "../../gen/app__notes__recording.ts";
import type { Alpha } from "../runtime/area.tsx";
import { RecordingDisplay, control } from "./recording.vibe";

function elapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Recording({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: Alpha["runtime"] }) {
  const recording = useMachine(runtime);
  const display = runtime.runSync(RecordingDisplay);
  const { seconds, peak } = useSyncExternalStore(display.subscribe, display.snapshot, display.snapshot);
  const state = recording.state;
  if (state === undefined) return null;
  const send = (event: Event) => void recording.send(event, "Owner");
  const can = (event: Event) => recording.can(event, "Owner");
  const run = (action: "pause" | "resume" | "stop") => void runtime.runPromise(control(action));
  const resume = { type: "resume", take: state.take, room: { allowed: true, free: true, front: true, silent: true } } as const;
  return (
    <section aria-label="Voice recording" className="flex min-h-0 flex-1 flex-col" data-alpha-subview="notes-recording">
      <AppHeader title="" leading={<Button variant="ghost" size="icon" aria-label="Back to apps" onClick={() => void alpha.back()}><ChevronLeft /></Button>}>
        {can({ type: "stop", take: state.take }) && <Button variant="ghost" onClick={() => run("stop")}>Done</Button>}
      </AppHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 pt-10">
        <AudioLines className="size-12 text-primary" aria-hidden />
        <p className="font-display text-figure tabular-nums" aria-label="Recording duration">{elapsed(seconds)}</p>
        {state.kept > 0 && <p className="text-sm text-muted-foreground">{state.kept} {state.kept === 1 ? "segment" : "segments"} saved</p>}
        {state.phase === "Recording" && <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Recording</p>
          <meter aria-label="Microphone level" min={0} max={1} value={peak} className="w-32" />
        </div>}
        {state.phase === "Paused" && <p className="text-sm text-muted-foreground">{state.recovered ? "Recovered recording" : "Paused"}</p>}
        {state.calling && <Alert variant="warn">Recording paused for a phone call</Alert>}
        {state.phase === "Stopping" && <Spinner label="Finishing your recording" />}
        {state.phase === "Keeping" && state.keeping.outcome !== "Unknown" && <Spinner label="Saving your voice note" />}
        {state.phase === "Failed" && <Alert variant="warn">{state.damaged ? "Only part of this recording could be recovered" : "Recording stopped. The saved audio is still here."}</Alert>}
        <div className="flex flex-wrap justify-center gap-3">
          {can({ type: "pause", take: state.take }) && <Button variant="secondary" onClick={() => run("pause")}><Pause /> Pause</Button>}
          {can(resume) && <Button variant="secondary" onClick={() => run("resume")}><Play /> Resume</Button>}
          {can({ type: "keepPartial" }) && <Button onClick={() => send({ type: "keepPartial" })}>Save recording</Button>}
          {can({ type: "lookUp" }) && <Button variant="secondary" onClick={() => send({ type: "lookUp" })}>Check again</Button>}
          {can({ type: "askDiscard" }) && <Button variant="ghost" onClick={() => send({ type: "askDiscard" })}>Discard</Button>}
        </div>
      </div>
      <Dialog open={state.ask === "AskDiscard"} onOpenChange={(open) => { if (!open && can({ type: "cancelDiscard" })) send({ type: "cancelDiscard" }); }}>
        <DialogContent>
          <DialogTitle>Discard this recording?</DialogTitle>
          <p className="text-sm text-muted-foreground">You’ll lose the recorded audio.</p>
          <div className="flex justify-end gap-2">
            {can({ type: "cancelDiscard" }) && <Button variant="secondary" onClick={() => send({ type: "cancelDiscard" })}>Cancel</Button>}
            {can({ type: "confirmDiscard" }) && <Button variant="destructive" onClick={() => send({ type: "confirmDiscard" })}>Discard</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
