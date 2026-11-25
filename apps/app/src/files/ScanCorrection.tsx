// spec/app/files/correction.md, "Story: Correct a page's edges"
import { Alert, Button, Dialog, DialogContent, DialogTitle, cn, focusRing } from "@repo/ui";
import type { ScanCorner, ScanCorners } from "@elizaos/plugin-files/documents/scan-correction";
import type { Layer } from "effect";
import { RotateCw } from "lucide-react";
import { useState, type PointerEvent } from "react";
import { useMachine } from "../../gen/app__files__correction.react.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { ScanAssets, setScanOutline, type scan } from "./scan.vibe";

type Runtime = Layer.Success<typeof scan> | Resident;
const names = ["Top left", "Top right", "Bottom right", "Bottom left"];
const moves: Readonly<Record<string, readonly [number, number]>> = { ArrowUp: [0, -.01], ArrowDown: [0, .01], ArrowLeft: [-.01, 0], ArrowRight: [.01, 0] };
const moved = (values: ScanCorners, point: number, next: ScanCorner): ScanCorners =>
  [point === 0 ? next : values[0], point === 1 ? next : values[1], point === 2 ? next : values[2], point === 3 ? next : values[3]];
const limited = (value: number) => Math.max(0, Math.min(1, value));

/** The currently reviewed document crop, manipulable by touch or arrow keys. @model spec/app/files/correction.md */
export function ScanCorrection({ runtime }: Pick<Shown<Runtime>, "runtime">) {
  const { state, can, send } = useMachine(runtime);
  const [drag, setDrag] = useState<{ image: number; point: number; corner: ScanCorner } | undefined>();
  if (!state?.image) return null;
  const image = state.image;
  const page = runtime.runSync(ScanAssets.use((assets) => assets.read(image)));
  if (!page) return null;
  const draft = runtime.runSync(ScanAssets.use((assets) => assets.outline(image)));
  const corners = drag?.image === image ? moved(draft.corners, drag.point, drag.corner) : draft.corners;
  const apply = (next: typeof draft) => void runtime.runPromiseExit(setScanOutline(image, next));
  const place = (event: PointerEvent<HTMLButtonElement>): ScanCorner | undefined => {
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!box?.width || !box.height) return undefined;
    return { x: limited((event.clientX - box.left) / box.width), y: limited((event.clientY - box.top) / box.height) };
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) void send({ type: "cancel" }, "Owner"); }}>
      <DialogContent aria-describedby={undefined} closeLabel="Cancel correction" className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>Correct page</DialogTitle>
        <div className="relative mx-auto w-full max-w-md" style={{ width: `min(100%, ${55 * page.width / page.height}dvh)` }}>
          <img src={page.uri} alt="Page to correct" className="max-h-[55dvh] w-full object-contain" draggable={false} />
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full fill-primary/15 stroke-primary" aria-hidden>
              <polygon points={corners.map(({ x, y }) => `${x * 100},${y * 100}`).join(" ")} vectorEffect="non-scaling-stroke" />
            </svg>
            {corners.map(({ x, y }, point) => (
              <button
                key={names[point]}
                type="button"
                aria-label={`${names[point]} corner`}
                className={cn("absolute flex size-11 -translate-1/2 touch-none items-center justify-center", focusRing)}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  setDrag({ image, point, corner: { x, y } });
                }}
                onPointerMove={(event) => {
                  const corner = place(event);
                  if (drag?.image === image && drag.point === point && corner) setDrag({ image, point, corner });
                }}
                onPointerCancel={() => setDrag(undefined)}
                onPointerUp={(event) => {
                  const corner = place(event);
                  setDrag(undefined);
                  if (corner) apply({ ...draft, corners: moved(draft.corners, point, corner) });
                }}
                onKeyDown={(event) => {
                  const xy = moves[event.key];
                  if (xy) {
                    event.preventDefault();
                    apply({ ...draft, corners: moved(draft.corners, point, { x: limited(x + xy[0]), y: limited(y + xy[1]) }) });
                  }
                }}
              ><span className="size-3 rounded-full border border-primary-foreground bg-primary" /></button>
            ))}
          </div>
        </div>
        {state.failed && <Alert variant="destructive">Keep the corners in order and select a larger area.</Alert>}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={() => apply({ ...draft, turns: (draft.turns + 1) % 4 })}><RotateCw />Rotate {draft.turns * 90}°</Button>
          <Button size="sm" disabled={!can({ type: "useCorrection" }, "Owner") || drag !== undefined} onClick={() => void send({ type: "useCorrection" }, "Owner")}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
