// spec/camera/videoEdit.md, "Story: Trim a video into a copy"; spec/camera/videoEdit.md, "Story: Recover a video copy that may exist"
import { Crop, RotateCw } from "lucide-react";
import type { Event as VideoEvent, VideoEditor as VideoEditorState } from "../../../gen/camera__videoEdit.ts";
import { videoClock } from "../../camera/messages.vibe";
import { Button, Sheet, SheetContent, Slider } from "../components/ui/index.ts";
import type { RunEditor } from "./PhotoEditor.tsx";

/** The video edit as its Machine keeps it, the playable source, and the editor that changes it. */
export interface VideoEditorProps {
  /** The video edit session. */
  state: VideoEditorState;
  /** Whether a video edit event is allowed now. */
  can: (event: VideoEvent) => boolean;
  /** The capability the media bridge issued for the open video, or "" before it is issued. */
  source: string;
  /** Run one of the editor's controls. */
  editor: RunEditor;
}

/**
 * The video editor: preview, trim handles, rotate and crop, and one Save copy.
 * @model spec/camera/videoEdit.md
 */
export function VideoEditor({ state, can, source, editor }: VideoEditorProps) {
  const trim = state.trim;
  return (
    <Sheet open={!state.closed} onOpenChange={(next) => { if (!next) editor((e) => e.videoEvent({ type: "closeEditor" })); }}>
      <SheetContent side="full" title="Edit video" hideTitle>
        <header className="flex items-center gap-2 px-4">
          <Button variant="ghost" onClick={() => editor((e) => e.videoEvent({ type: "closeEditor" }))}>Close</Button>
          <span className="flex-1" />
          <Button loading={state.busy && state.outcome === "NoVideoSave"} disabled={!can({ type: "commit" })} onClick={() => editor((e) => e.saveVideo())}>Save copy</Button>
        </header>
        <div className="flex flex-1 items-center justify-center bg-foreground">
          {source !== "" && (
            <video src={source} controls={false} playsInline className="max-h-full max-w-full" style={{ transform: `rotate(${trim.rotation}deg)` }}
              onLoadedData={() => editor((e) => e.videoEvent({ type: "sourceLoaded" }))} onError={() => editor((e) => e.videoEvent({ type: "sourceError" }))} />
          )}
        </div>
        <footer className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex justify-between font-mono text-xs uppercase"><span>{videoClock(trim.start / 10)}</span><span>{videoClock(trim.end / 10)}</span></div>
          <Slider aria-label="Trim" min={0} max={state.duration} step={1} value={[trim.start, trim.end]} minStepsBetweenThumbs={1} disabled={!can({ type: "trimTo", startHandle: true, position: trim.start })}
            onValueChange={([start, end]) => {
              if (start !== trim.start) editor((e) => e.videoEvent({ type: "trimTo", startHandle: true, position: start! }));
              else if (end !== trim.end) editor((e) => e.videoEvent({ type: "trimTo", startHandle: false, position: end! }));
            }} />
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="icon" aria-label="Rotate" disabled={!can({ type: "rotateVideo" })} onClick={() => editor((e) => e.videoEvent({ type: "rotateVideo" }))}><RotateCw /></Button>
            <Button variant={trim.crop ? "primary" : "secondary"} size="icon" aria-label="Crop" aria-pressed={trim.crop} disabled={!can({ type: "toggleCrop" })} onClick={() => editor((e) => e.videoEvent({ type: "toggleCrop" }))}><Crop /></Button>
          </div>
          {state.outcome === "VideoNotSaved" && <p role="status" className="text-sm text-destructive">Not saved. Reopen the editor to try again.</p>}
          {state.outcome === "VideoUnconfirmed" && (
            <div className="flex items-center gap-2">
              <p role="status" className="flex-1 text-sm text-warn">Save unconfirmed. Check Photos before trying again.</p>
              <Button variant="secondary" size="sm" onClick={() => editor((e) => e.reviewVideoCopy())}>Check Photos</Button>
            </div>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}
