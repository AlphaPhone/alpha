// spec/camera/edit.md, "Story: Edit a photo and keep the original"
import type { Effect } from "effect";
import { Crop, RotateCw } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Edit, Event as EditEvent, Look } from "../../../gen/camera__edit.ts";
import type { MediaEditor } from "../../camera/editor.vibe";
import { CROP_ASPECTS, LOOKS, WHOLE_PHOTO, aspectFraction, dragCrop, fitAspect, nudgeCrop, toArea, type CropAspect, type CropHandle, type CropRect } from "../../camera/imageEdit.ts";
import { Button, Dialog, DialogContent, DialogTitle, Sheet, SheetContent } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";

/** Run one of the media editor's controls. */
export type RunEditor = (use: (e: MediaEditor.Shape) => Effect.Effect<unknown>) => void;

/** The photo edit as its Machine keeps it, and the editor that changes it. */
export interface PhotoEditorProps {
  /** The edit session. */
  state: Edit;
  /** Whether an edit event is allowed now. */
  can: (event: EditEvent) => boolean;
  /** Run one of the editor's controls. */
  editor: RunEditor;
}

/**
 * The photo editor: rotate, a look, a crop over the whole rotated photo, Save copy or Replace original.
 * @model spec/camera/edit.md
 */
export function PhotoEditor({ state, can, editor }: PhotoEditorProps) {
  const [aspect, setAspect] = useState<CropAspect>("free");
  const [rect, setRect] = useState<CropRect>(WHOLE_PHOTO);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const open = state.status !== "EditClosed";
  const pending = state.status === "SavingEdit" || state.status === "EditUncertain"
  const photo = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ handle: CropHandle; start: CropRect; x: number; y: number; width: number; height: number } | null>(null);
  /** A drag of the crop area or one of its corners, measured against the fitted photo. */
  const beginDrag = (handle: CropHandle) => (event: ReactPointerEvent<HTMLElement>) => {
    const box = photo.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { handle, start: rect, x: event.clientX, y: event.clientY, width: box.width, height: box.height };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const at = drag.current;
    if (at === null) return;
    setRect(dragCrop(at.start, at.handle, (event.clientX - at.x) / at.width, (event.clientY - at.y) / at.height, aspectFraction(aspect, 1000, 1000)));
  };
  const endDrag = () => { drag.current = null; };
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) editor((e) => e.askClose()); }}>
      <SheetContent side="full" title="Edit photo" hideTitle>
        <header className="flex items-center gap-2 px-4">
          <Button variant="ghost" onClick={() => editor((e) => e.askClose())}>Cancel</Button>
          <span className="flex-1" />
          {state.canReplace && <Button variant="secondary" disabled={!can({ type: "save", mode: "ReplaceMode" })} onClick={() => setConfirmReplace(true)}>Replace original</Button>}
          <Button loading={state.status === "SavingEdit"} disabled={!can({ type: "save", mode: "CopyMode" })} onClick={() => editor((e) => e.save("CopyMode"))}>Save copy</Button>
        </header>
        <div className="relative flex flex-1 items-center justify-center bg-foreground">
          <div ref={photo} className="relative inline-flex max-h-full max-w-full">
            {state.image !== "" && <img src={state.image} alt="Photo being edited" style={{ filter: LOOKS[state.look].css }} className="max-h-full max-w-full object-contain" />}
            {state.cropping && (
              <div role="group" aria-label="Crop area" tabIndex={0} className={cn("absolute touch-none border-2 border-background", focusRing)}
                style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
                onPointerDown={beginDrag("move")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
                onKeyDown={(event) => {
                  const next = nudgeCrop(rect, event.key, event.shiftKey, aspectFraction(aspect, 1000, 1000));
                  if (next !== undefined) { event.preventDefault(); setRect(next); }
                }}>
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <span key={corner} aria-hidden onPointerDown={beginDrag(corner)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
                    className={cn("absolute size-6 touch-none rounded-full border-2 border-background bg-foreground/40",
                      corner[0] === "n" ? "-top-3" : "-bottom-3", corner[1] === "w" ? "-left-3" : "-right-3")} />
                ))}
              </div>
            )}
          </div>
          {state.status === "EditUncertain" && <span role="status" className="absolute top-4 rounded-md bg-scrim px-3 py-1 text-sm text-background">Unconfirmed</span>}
        </div>
        {state.cropping ? (
          <footer className="flex flex-wrap items-center gap-2 px-4 pb-4">
            {CROP_ASPECTS.map((choice) => (
              <Button key={choice.id} variant={aspect === choice.id ? "primary" : "secondary"} size="sm"
                onClick={() => { setAspect(choice.id); const fraction = aspectFraction(choice.id, 1000, 1000); setRect(fraction === undefined ? rect : fitAspect(fraction)); }}>{choice.label}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => { const fraction = aspectFraction(aspect, 1000, 1000); setRect(fraction === undefined ? WHOLE_PHOTO : fitAspect(fraction)); }}>Reset</Button>
            <span className="flex-1" />
            <Button variant="ghost" onClick={() => editor((e) => e.cancelCrop())}>Cancel</Button>
            <Button disabled={!can({ type: "applyCrop", area: toArea(rect) })} onClick={() => editor((e) => e.applyCrop(toArea(rect)))}>Done</Button>
          </footer>
        ) : (
          <footer className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Looks">
              {(Object.keys(LOOKS) as Look[]).map((look) => (
                <button key={look} type="button" aria-pressed={state.look === look} disabled={!can({ type: "chooseLook", look }) && state.look !== look}
                  onClick={() => editor((e) => e.look(look))} className={cn("flex flex-col items-center gap-1 font-mono text-xs uppercase", focusRing)}>
                  {state.image !== "" && <img src={state.image} alt="" style={{ filter: LOOKS[look].css }} className={cn("size-14 rounded-md object-cover", state.look === look && "ring-2 ring-primary")} />}
                  {look}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" size="icon" aria-label="Rotate" disabled={!can({ type: "rotateEdit" })} onClick={() => editor((e) => e.rotate())}><RotateCw /></Button>
              <Button variant={state.cropped ? "primary" : "secondary"} size="icon" aria-label="Crop" disabled={!can({ type: "startCrop" })} onClick={() => { setRect(WHOLE_PHOTO); editor((e) => e.startCrop()); }}><Crop /></Button>
            </div>
          </footer>
        )}
        <Dialog open={state.closeAsked} onOpenChange={(next) => { if (!next) editor((e) => e.keepEditing()); }}>
          <DialogContent>
            <DialogTitle>{pending ? "Close photo editor?" : "Discard photo changes?"}</DialogTitle>
            <p className="text-sm text-muted-foreground">{pending ? "A save may already be in progress. Closing does not undo a completed save. Photos will check its status when you return." : "Your original photo stays unchanged."}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => editor((e) => e.keepEditing())}>Keep editing</Button>
              <Button variant="destructive" onClick={() => editor((e) => e.confirmClose())}>{pending ? "Close editor" : "Discard changes"}</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmReplace} onOpenChange={setConfirmReplace}>
          <DialogContent>
            <DialogTitle>Replace original photo?</DialogTitle>
            <p className="text-sm text-muted-foreground">Replace this photo with the reviewed changes. Save copy keeps the original instead.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmReplace(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setConfirmReplace(false); editor((e) => e.save("ReplaceMode")); }}>Replace original</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
