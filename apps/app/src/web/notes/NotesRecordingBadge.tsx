// spec/notes/recorder.md, "Another owner or leaving Notes detaches the view and keeps the recording"
import { Mic } from "lucide-react";
import { Button } from "../components/ui/index.ts";
import { recordingClock } from "../../notes/recorder.vibe";

export type NotesRecordingBadgeProps = {
  /** Whether the recording is paused rather than recording. */
  paused: boolean;
  /** How long the recording has run. */
  durationMs: number;
  /** Return to the recording in Notes. */
  onOpen: () => void;
};

/**
 * The recording's clock above every screen; one tap returns to it.
 * @model spec/notes/recorder.md
 */
export function NotesRecordingBadge({ paused, durationMs, onOpen }: NotesRecordingBadgeProps) {
  const clock = recordingClock(durationMs);
  return (
    <Button size="sm" variant="secondary" className="m-2 font-mono text-xs uppercase tabular-nums" aria-label={`Voice note ${paused ? "paused" : "recording"}, ${clock}`} onClick={onOpen}>
      <Mic aria-hidden className={paused ? undefined : "text-destructive"} />{clock}
    </Button>
  );
}
