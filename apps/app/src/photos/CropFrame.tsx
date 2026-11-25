// spec/app/photos/viewer.md, "Cropping a photo shows its full rotated frame, and only the area applied changes the edit"
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button, cn } from "@repo/ui";
import { cropUnits, wholePhoto, type CropBounds } from "../../gen/app__photos__viewer.ts";

const aspects = [
  { key: "Free", ratio: 0 }, { key: "Square", ratio: 1 },
  { key: "4:3", ratio: 4 / 3 }, { key: "16:9", ratio: 16 / 9 },
] as const;
type Aspect = (typeof aspects)[number];

const corners = [
  { key: "nw", label: "Resize from top left", style: "top-0 left-0 -translate-1/2 cursor-nwse-resize", east: false, south: false },
  { key: "ne", label: "Resize from top right", style: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize", east: true, south: false },
  { key: "sw", label: "Resize from bottom left", style: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize", east: false, south: true },
  { key: "se", label: "Resize from bottom right", style: "right-0 bottom-0 translate-1/2 cursor-nwse-resize", east: true, south: true },
] as const;
type Corner = (typeof corners)[number];

type Source = { readonly image: string; readonly width: number; readonly height: number };
type Delta = { readonly x: number; readonly y: number };
type Draft = { readonly bounds: CropBounds; readonly aspect: Aspect };
type Gesture = {
  readonly pointer: number;
  readonly origin: Delta;
  readonly frame: DOMRect;
  readonly bounds: CropBounds;
  readonly corner?: Corner;
};

const minimum = cropUnits / 20;
const step = cropUnits / 50;
const free = aspects[0];
const clamp = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));
const percent = (value: number) => `${value / cropUnits * 100}%`;

function frameRatio(aspect: Aspect, { width, height }: Source): number {
  if (aspect.ratio === 0) return 0;
  return (height > width ? 1 / aspect.ratio : aspect.ratio) * height / width;
}

function fit(ratio: number): CropBounds {
  const width = clamp(cropUnits * ratio, 1, cropUnits);
  const height = clamp(cropUnits / ratio, 1, cropUnits);
  return { x: Math.floor((cropUnits - width) / 2), y: Math.floor((cropUnits - height) / 2), width, height };
}

function change(bounds: CropBounds, { x, y }: Delta, ratio: number, corner?: Corner): CropBounds {
  if (!corner) return { ...bounds, x: clamp(bounds.x + x, 0, cropUnits - bounds.width), y: clamp(bounds.y + y, 0, cropUnits - bounds.height) };
  const { east, south } = corner;
  const anchorX = east ? bounds.x : bounds.x + bounds.width;
  const anchorY = south ? bounds.y : bounds.y + bounds.height;
  const maxWidth = east ? cropUnits - anchorX : anchorX;
  const maxHeight = south ? cropUnits - anchorY : anchorY;
  const minWidth = Math.min(minimum, bounds.width);
  const minHeight = Math.min(minimum, bounds.height);
  let width = clamp(bounds.width + (east ? x : -x), minWidth, maxWidth);
  let height = clamp(bounds.height + (south ? y : -y), minHeight, maxHeight);
  if (ratio > 0) {
    if (Math.abs(width - bounds.width) / ratio >= Math.abs(height - bounds.height)) height = width / ratio;
    else width = height * ratio;
    const scale = Math.min(Math.max(1, minWidth / width, minHeight / height), maxWidth / width, maxHeight / height);
    width = clamp(width * scale, 1, maxWidth);
    height = clamp(height * scale, 1, maxHeight);
  }
  return { x: east ? anchorX : anchorX - width, y: south ? anchorY : anchorY - height, width, height };
}

interface Props {
  readonly source: Source;
  readonly bounds: CropBounds;
  readonly onApply: (bounds: CropBounds) => void;
}

/** Move or resize a crop over the whole rotated image. The preview changes only after applying it. */
export function CropFrame({ source, bounds, onApply }: Props) {
  const [draft, setDraft] = useState<Draft>({ bounds, aspect: free });
  const imageRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | undefined>(undefined);
  const frameFocus = useCallback((node: HTMLDivElement | null) => { node?.focus({ preventScroll: true }); }, []);
  const ratio = frameRatio(draft.aspect, source);
  const imageRatio = source.width / source.height;
  const rect = draft.bounds;

  function begin(event: PointerEvent<HTMLElement>, corner?: Corner) {
    if (event.button !== 0 || gestureRef.current) return;
    const frame = imageRef.current?.getBoundingClientRect();
    if (!frame || frame.width < 1 || frame.height < 1) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { pointer: event.pointerId, origin: { x: event.clientX, y: event.clientY }, frame, bounds: rect, corner };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const held = gestureRef.current;
    if (!held || held.pointer !== event.pointerId) return;
    const delta = {
      x: (event.clientX - held.origin.x) / held.frame.width * cropUnits,
      y: (event.clientY - held.origin.y) / held.frame.height * cropUnits,
    };
    setDraft({ ...draft, bounds: change(held.bounds, delta, ratio, held.corner) });
  }
  function end(event: PointerEvent<HTMLElement>) {
    if (gestureRef.current?.pointer === event.pointerId) gestureRef.current = undefined;
  }
  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const directions: Record<string, Delta> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const delta = directions[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    setDraft({ ...draft, bounds: change(rect, delta, ratio, event.shiftKey ? corners[3] : undefined) });
  }
  function choose(aspect: Aspect) {
    gestureRef.current = undefined;
    const wanted = frameRatio(aspect, source);
    setDraft({ aspect, bounds: wanted === 0 ? rect : fit(wanted) });
  }
  return <>
    <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 [container-type:size]">
      <div ref={imageRef} className="relative touch-none overflow-hidden" style={{ width: `min(100cqw, calc(100cqh * ${imageRatio}))`, aspectRatio: imageRatio }}>
        <img src={source.image} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" />
        <div ref={frameFocus} tabIndex={0} role="group" aria-label="Crop area" aria-describedby="alpha-photos-crop-keys"
          className="absolute cursor-move border-2 border-foreground shadow-[0_0_0_200vmax] shadow-background/65 focus-visible:outline-focus"
          style={{ left: percent(rect.x), top: percent(rect.y), width: percent(rect.width), height: percent(rect.height) }}
          onPointerDown={(event) => begin(event)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={nudge}>
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 h-1/3 border-y border-foreground/40" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-1/3 border-x border-foreground/40" />
          {corners.map((corner) => <button key={corner.key} type="button" aria-label={corner.label} tabIndex={-1}
            className={cn("absolute grid size-10 place-items-center", corner.style)} onPointerDown={(event) => begin(event, corner)}>
            <span className="pointer-events-none size-3 rounded-full border-2 border-background bg-foreground" />
          </button>)}
        </div>
      </div>
    </div>
    <p className="sr-only" id="alpha-photos-crop-keys">Use the arrow keys to move the crop. Hold Shift to resize it.</p>
    <div className="flex shrink-0 flex-col gap-3 px-4 py-4">
      <div role="group" aria-label="Crop aspect" className="flex flex-wrap justify-center gap-2">
        {aspects.map((aspect) => <Button key={aspect.key} size="sm" variant={draft.aspect === aspect ? "primary" : "secondary"}
          aria-label={`${aspect.key} crop`} aria-pressed={draft.aspect === aspect} onClick={() => choose(aspect)}>{aspect.key}</Button>)}
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={() => { gestureRef.current = undefined; setDraft({ bounds: wholePhoto, aspect: free }); }}>Reset crop</Button>
        <Button onClick={() => onApply(rect)}>Apply crop</Button>
      </div>
    </div>
  </>;
}
