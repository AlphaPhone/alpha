// spec/app/notes/recording.md, "Story: Record a voice note"; spec/app/notes/recording.md, "Story: Discard a recording"
import { Alert, AppHeader, Button, cn, Dialog, DialogContent, DialogDescription, DialogTitle, dockClearance, Spinner } from "@repo/ui";
import { AudioLines, Pause, Play } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMachine as useMic } from "../../gen/app__notes__microphone.react.ts";
import { useMachine } from "../../gen/app__notes__recording.react.ts";
import type { Event } from "../../gen/app__notes__recording.ts";
import { useMachine as useVoice } from "../../gen/app__notes__voice.react.ts";
import { NoteDevice } from "../platform/noteDevice.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { RecordingDisplay, control } from "./recording.vibe";

function elapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function Recording({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: Alpha["runtime"] }) {
  const recording = useMachine(runtime);
  const mic = useMic(runtime);
  const voice = useVoice(runtime);
  const device = runtime.runSync(NoteDevice);
  const display = runtime.runSync(RecordingDisplay);
  const { seconds, peak } = useSyncExternalStore(display.subscribe, display.snapshot, display.snapshot);
  const state = recording.state;
  if (state === undefined) return null;
  const send = (event: Event) => void recording.send(event, "Owner");
  const can = (event: Event) => recording.can(event, "Owner");
  const run = (action: "pause" | "resume" | "stop") => void runtime.runPromise(control(action));
  const room = {
    allowed: mic.state?.mic.grant === "Granted",
    free: device.available,
    front: true,
    silent: voice.state?.play.status !== "Loading",
  } as const;
  const resume = { type: "resume", take: state.take, room } as const;
  const levelPercent = Math.round(Math.max(0, Math.min(1, Number.isFinite(peak) ? peak : 0)) * 100);
  return (
    <section aria-label="Voice recording" className="flex min-h-0 flex-1 flex-col" data-alpha-subview="notes-recording">
      <AppHeader title="Voice recording" leading={<AppBack alpha={alpha} />}>
        {can({ type: "stop", take: state.take }) && <Button variant="ghost" onClick={() => run("stop")}>Done</Button>}
      </AppHeader>
      <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 pt-10", dockClearance)}>
        <AudioLines className="size-12 text-primary" aria-hidden />
        <p className="font-display text-figure tabular-nums" aria-label="Recording duration">{elapsed(seconds)}</p>
        {state.kept > 0 && <p className="text-sm text-muted-foreground">{state.kept} {state.kept === 1 ? "segment" : "segments"} saved</p>}
        {state.phase === "Recording" && <div className="flex flex-col items-center gap-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden className="size-2.5 rounded-full bg-record motion-safe:animate-blink" />
            Recording
          </p>
          <div role="progressbar" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelPercent}
            className="h-2 w-32 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-[width] duration-fast ease-standard motion-reduce:transition-none" style={{ width: `${levelPercent}%` }} />
          </div>
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
          <DialogDescription>You’ll lose the recorded audio.</DialogDescription>
          <div className="flex justify-end gap-2">
            {can({ type: "cancelDiscard" }) && <Button variant="secondary" onClick={() => send({ type: "cancelDiscard" })}>Cancel</Button>}
            {can({ type: "confirmDiscard" }) && <Button variant="destructive" onClick={() => send({ type: "confirmDiscard" })}>Discard</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
