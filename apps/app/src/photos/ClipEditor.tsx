// spec/app/photos/viewer.md, "Story: Edit a photo or trim a video"
import { Crop, Pause, Play, RotateCw } from "lucide-react";
import { useRef, type PointerEvent } from "react";
import { Button, cn, focusRing } from "@repo/ui";
import type { Edit } from "../../gen/app__photos__viewer.ts";

interface Props {
  readonly duration: number;
  readonly edit: Edit;
  readonly position: number;
  readonly playing: boolean;
  readonly onPreview?: () => void;
  readonly onTrim?: (start: number, end: number) => void;
  readonly onRotate?: () => void;
  readonly onCrop?: () => void;
  readonly onRetry?: () => void;
  readonly status?: string;
}

const handles = ["start", "end"] as const;
type Handle = typeof handles[number];

function clock(tenths: number): string {
  const minutes = Math.floor(tenths / 600);
  const seconds = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}

/** Trim, preview, rotate and center crop the exact clip on screen. */
export function ClipEditor({ duration, edit, position, playing, onPreview, onTrim, onRotate, onCrop, onRetry, status }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const percent = (tenths: number) => `${tenths / Math.max(duration, 1) * 100}%`;
  function trim(handle: Handle, value: number) {
    const start = handle === "start" ? Math.min(edit.end - 1, Math.max(0, value)) : edit.start;
    const end = handle === "end" ? Math.max(edit.start + 1, Math.min(duration, value)) : edit.end;
    if (start !== edit.start || end !== edit.end) onTrim?.(start, end);
  }
  function drag(handle: Handle, event: PointerEvent<HTMLDivElement>) {
    const frame = timelineRef.current?.getBoundingClientRect();
    if (!frame || frame.width === 0 || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    trim(handle, Math.round((event.clientX - frame.left) / frame.width * duration));
  }
  const tool = "h-16 min-w-24 flex-col gap-2 rounded-md text-label font-normal [@media(max-height:480px)]:h-11 [@media(max-height:480px)]:flex-row";
  return (
    <div className="max-h-[55%] shrink-0 overflow-y-auto bg-foreground/[0.066667] px-6 pt-2 pb-[max(--spacing(5),var(--alpha-native-inset-bottom,0px))] [@media(max-height:480px)]:pt-1">
      <div className="mb-2 flex justify-center">
        <Button variant="ghost" size="icon" className="size-11" aria-label={playing ? "Pause preview" : "Preview trim"} disabled={onPreview === undefined} onClick={onPreview}>
          {playing ? <Pause /> : <Play />}
        </Button>
      </div>
      <div ref={timelineRef} role="group" aria-label="Trim video" className="relative mx-4 h-14 touch-none">
        <div aria-hidden className="absolute inset-x-0 inset-y-2 overflow-hidden rounded-box bg-foreground/[0.285714]">
          <div className="absolute inset-y-0 border-y-3 border-foreground bg-foreground/40" style={{ left: percent(edit.start), width: percent(edit.end - edit.start) }} />
          <div className="absolute inset-y-0 w-0.5 bg-background/[0.888889]" style={{ left: percent(position) }} />
        </div>
        {handles.map((handle) => {
          const start = handle === "start";
          const value = edit[handle];
          return <div key={handle} role="slider" tabIndex={onTrim === undefined ? -1 : 0} aria-label={start ? "Start seconds" : "End seconds"}
            aria-valuenow={value / 10} aria-valuemin={start ? 0 : (edit.start + 1) / 10} aria-valuemax={start ? (edit.end - 1) / 10 : duration / 10}
            aria-valuetext={`${(value / 10).toFixed(1)} seconds`} aria-disabled={onTrim === undefined || undefined}
            className={cn(focusRing, "absolute top-0 z-10 flex h-14 w-11 -translate-x-1/2 touch-none cursor-ew-resize items-center justify-center rounded-md")}
            style={{ left: percent(value) }}
            onPointerDown={(event) => {
              if (onTrim === undefined || event.button !== 0) return;
              event.currentTarget.focus({ preventScroll: true });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => drag(handle, event)} onPointerUp={(event) => drag(handle, event)}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 10 : 1;
              const next = event.key === "Home" ? 0 : event.key === "End" ? duration
                : event.key === "ArrowRight" || event.key === "ArrowUp" ? value + step
                  : event.key === "ArrowLeft" || event.key === "ArrowDown" ? value - step : undefined;
              if (next === undefined) return;
              event.preventDefault();
              trim(handle, next);
            }}><span aria-hidden className="grid h-11 w-3 place-content-center rounded-box bg-foreground"><span className="h-3.5 w-0.5 bg-background/[0.933333]" /></span></div>;
        })}
      </div>
      <div className="mt-1 mb-5 flex justify-between text-label leading-normal text-foreground/[0.857143] tabular-nums [@media(max-height:480px)]:mb-1">
        <span>{clock(edit.start)}</span><span>{((edit.end - edit.start) / 10).toFixed(1)}s</span><span>{clock(edit.end)}</span>
      </div>
      <div className="flex justify-center gap-6 [@media(max-height:480px)]:gap-3">
        <Button variant="ghost" aria-label="Rotate video" className={tool} disabled={onRotate === undefined} onClick={onRotate}><RotateCw />Rotate</Button>
        <Button variant="ghost" aria-label="Crop video" aria-pressed={edit.cropped} className={cn(tool, edit.cropped && "bg-foreground/[0.142857]")} disabled={onCrop === undefined} onClick={onCrop}><Crop />Center crop</Button>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-foreground/[0.857143]">{status}</p>}
      {onRetry && <Button className="mt-2" variant="secondary" onClick={onRetry}>Retry preview</Button>}
    </div>
  );
}
