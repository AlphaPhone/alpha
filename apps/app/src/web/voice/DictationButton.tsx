// spec/voice/dictation.md, "Story: Dictate into the draft I am writing"; spec/voice/dictation.md, "Story: Keep my recording when transcription fails"; spec/voice/capture.md, "Open app settings is offered only on the phone, for a refused permission, while nothing records"
import { Mic, RotateCw, Square, Trash2, X } from "lucide-react";
import { canDiscard, canRetry, type Dictation } from "../../../gen/voice__dictation.ts";
import type { Route } from "../../../gen/voice__route.ts";
import { Button, Spinner } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { dictationFailureText } from "./messages.ts";

export interface DictationButtonProps {
  /** The dictation when it is open for this draft; undefined when it is closed or belongs to another draft. */
  dictation: Dictation | undefined;
  /** The route the dictation uses now. */
  route: Route;
  /** Whether Alpha runs on the phone, where app settings can allow the microphone. */
  native: boolean;
  /** The recording's level bars while it records. */
  levels: readonly number[];
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  onOpenSettings: () => void;
}

/**
 * The microphone beside a draft: record, Stop to insert the words into the draft, never send; a kept recording can be transcribed again or discarded.
 * @model spec/voice/dictation.md
 */
export function DictationButton({ dictation, route, native, levels, onStart, onStop, onRetry, onDiscard, onCancel, onOpenSettings }: DictationButtonProps) {
  const stage = dictation?.stage ?? "Closed";
  const failure = dictation === undefined ? undefined : dictationFailureText(dictation.failure, route, native);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {(stage === "Closed" || stage === "Ready") && (
          <Button variant="ghost" size="icon" aria-label="Dictate" onClick={onStart}>
            <Mic aria-hidden />
          </Button>
        )}
        {stage === "Starting" && <Spinner label="Starting the microphone" />}
        {stage === "Recording" && (
          <>
            <Button size="icon" aria-label="Stop and insert" onClick={onStop}>
              <Square aria-hidden />
            </Button>
            <span role="img" aria-label="Recording" className="flex h-12 flex-1 items-center gap-px">
              {levels.map((height, index) => (
                <span key={index} className={cn("w-0.5 rounded-full bg-primary")} style={{ height: `${height}px` }} />
              ))}
            </span>
            <Button variant="ghost" size="icon" aria-label="Cancel dictation" onClick={onCancel}>
              <X aria-hidden />
            </Button>
          </>
        )}
        {stage === "Transcribing" && <Spinner label="Transcribing" />}
        {stage === "Recorded" && dictation !== undefined && (
          <>
            <Button variant="secondary" size="sm" disabled={!canRetry(dictation, route === "Device" ? "OnPhone" : "OverNetwork") && !canRetry(dictation, "OverNetwork")} onClick={onRetry}>
              <RotateCw aria-hidden />
              Transcribe again
            </Button>
            <Button variant="ghost" size="icon" aria-label="Discard recording" disabled={!canDiscard(dictation)} onClick={onDiscard}>
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </div>
      {failure && (
        <p role="status" className="text-muted-foreground">
          {failure}
        </p>
      )}
      {native && dictation?.failure === "MicrophoneDenied" && stage === "Ready" && (
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          Open app settings
        </Button>
      )}
    </div>
  );
}
