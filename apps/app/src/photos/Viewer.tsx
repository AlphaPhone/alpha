import { Album, ChevronLeft, ChevronRight, Crop, Ellipsis, Heart, Info, Mail, Pause, Pencil, Play, RotateCcw, Share2, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { Effect, type ManagedRuntime } from "effect";
import { useCallback, useRef, type PointerEvent } from "react";
import { Button, Menu, MenuContent, MenuItem, MenuTrigger, Sheet, SheetContent } from "@repo/ui";
import { useMachine } from "../../gen/app__photos__viewer.react.ts";
import type { Event, Look } from "../../gen/app__photos__viewer.ts";
import type { Machine } from "../../gen/app__photos__viewer.effect.vibe";
import type { Row } from "./catalog.vibe";
import { OpenedPhoto } from "./viewer.vibe";
import { Time } from "../runtime/time.vibe";

const filters: readonly Look[] = ["Original", "Vivid", "Warm", "Cool", "Mono", "Fade", "Noir"];
const messages = {
  NoRefusal: "", Animated: "This photo is animated.", TooLarge: "This item is too large to edit.", TooLong: "This video is too long to edit.",
  NoRoom: "There is not enough storage to edit this video.", NoEditor: "This item cannot be edited here.",
};
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const formatTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

interface Props {
  readonly runtime: ManagedRuntime.ManagedRuntime<Machine | OpenedPhoto | Time, unknown>;
  readonly before?: number;
  readonly after?: number;
  readonly row?: Row;
  readonly inTrash: boolean;
  readonly onAddToAlbum?: () => void;
  readonly onRecover?: () => void;
  readonly onDelete?: () => void;
}

/** The photo or video shown at full size, with its metadata, owner actions and preview. */
export function MediaViewer({ runtime, before, after, row, inTrash, onAddToAlbum, onRecover, onDelete }: Props) {
  const { state, can, send } = useMachine(runtime);
  const video = useRef<HTMLVideoElement>(null);
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    if (element === null) return;
    video.current = element;
    return () => { element.pause(); video.current = null; };
  }, []);
  const point = useRef<{ readonly x: number; readonly y: number } | undefined>(undefined);
  const pointers = useRef(new Map<number, { readonly x: number; readonly y: number }>());
  const pinch = useRef<{ readonly level: number; readonly distance: number } | undefined>(undefined);
  if (!state || state.open === 0) return null;
  const current = runtime.runSync(Effect.flatMap(OpenedPhoto, (opened) => opened.current()));
  const preview = runtime.runSync(Effect.flatMap(OpenedPhoto, (opened) => opened.preview()));
  const showing = state.read.status === "Loaded" && current.photo === state.open && !state.gone;
  const item = row?.item;
  const name = item?.name ?? (state.kind === "Clip" ? "Video" : "Photo");
  const timestamp = current.item?.takenAt ?? current.item?.date ?? (row?.kind === "browser" ? row.item.created : undefined);
  const now = runtime.runSync(Effect.flatMap(Time, (time) => time.latest()));
  const date = timestamp === undefined ? undefined : new Date(timestamp);
  const day = date === undefined ? name : date.toDateString() === new Date(now).toDateString() ? "Today" : formatDate.format(date);
  function action(event: Event) {
    if (!can(event, "Owner")) return;
    if (event.type === "startEdit" || event.type === "cancelEdit" || event.type === "trim" || event.type === "save") video.current?.pause();
    void send(event, "Owner");
  }
  const allows = (event: Event) => can(event, "Owner");
  function seek(position: number) {
    const event = { type: "seek", position } satisfies Event;
    if (!allows(event)) return;
    if (video.current) video.current.currentTime = position / 10;
    action(event);
  }
  function toggle() {
    if (allows({ type: "pause" })) {
      video.current?.pause();
      action({ type: "pause" });
    } else if (video.current && state && allows({ type: "play" })) {
      video.current.currentTime = state.position / 10;
      const playing = video.current.play();
      void send({ type: "play" }, "Owner");
      void playing.catch(() => send({ type: "pause" }, "Owner"));
    }
  }
  function played() {
    const clip = video.current;
    if (clip === null || !state?.playing) return;
    const end = state.editing ? state.edit.end : state.duration;
    const position = Math.min(end, Math.max(0, Math.round(clip.currentTime * 10)));
    if (position >= end) clip.pause();
    if (position !== state.position && can({ type: "played", position }, "Phone")) void send({ type: "played", position }, "Phone");
  }
  function pointerDown(event: PointerEvent<HTMLElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) point.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2 && state) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) pinch.current = { level: state.zoom, distance: Math.hypot(a.x - b.x, a.y - b.y) };
      point.current = undefined;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [a, b] = [...pointers.current.values()];
    if (!a || !b || !pinch.current || pinch.current.distance <= 0) return;
    const level = Math.max(1, Math.min(8, Math.round(pinch.current.level * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance)));
    if (state?.zoom !== level) action({ type: "zoomTo", level });
  }
  function pointerEnd(event: PointerEvent<HTMLElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) pinch.current = undefined;
    const from = point.current;
    point.current = undefined;
    if (!from || state?.zoom !== 1 || event.type === "pointercancel") return;
    const x = event.clientX - from.x;
    if (Math.abs(x) <= Math.abs(event.clientY - from.y) || Math.abs(x) < 48) return;
    const neighbour = x < 0 ? after : before;
    if (neighbour !== undefined) action({ type: "swipe", neighbour });
  }
  const close = () => action(state.editing ? { type: "cancelEdit" } : { type: "close" });
  const photosMenu = [
    !inTrash && state.kind === "Still" && allows({ type: "askAlpha" }) && { label: "Ask Alpha", icon: <Sparkles />, select: () => action({ type: "askAlpha" }) },
    onAddToAlbum && { label: "Add to album", icon: <Album />, select: onAddToAlbum },
    !inTrash && state.kind === "Still" && allows({ type: "email" }) && { label: "Email", icon: <Mail />, select: () => action({ type: "email" }) },
    !inTrash && allows({ type: "share" }) && { label: "Share", icon: <Share2 />, select: () => action({ type: "share" }) },
    !inTrash && allows({ type: "trashOpen", neighbour: after ?? before ?? 0 }) && { label: "Delete", icon: <Trash2 />, select: () => action({ type: "trashOpen", neighbour: after ?? before ?? 0 }) },
    onRecover && { label: "Recover", icon: <Undo2 />, select: onRecover },
    onDelete && { label: "Delete this item forever", icon: <Trash2 />, select: onDelete },
  ].filter((item) => item !== undefined && item !== false);
  const control = (label: string, event: Event, icon: React.ReactNode) => allows(event) && (
    <Button variant="ghost" size="icon" aria-label={label} onClick={() => action(event)}>{icon}</Button>
  );
  const edited = preview !== undefined && preview.revision === state.preview.revision && state.editing && !state.unavailable ? preview : undefined;
  return (
    <div aria-label={name} data-alpha-subview={state.editing ? "photos-editor" : "photos-viewer"} className="dark absolute inset-0 z-50 flex min-h-0 flex-col bg-background text-foreground">
      <header data-host-chrome="" className="flex min-h-14 shrink-0 items-center gap-2 px-2">
        <Button variant="ghost" size="icon" aria-label={state.editing ? "Cancel edit" : "Back to photos"} onClick={close}>{state.editing ? <X /> : <ChevronLeft />}</Button>
        {state.editing ? <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{state.kind === "Clip" ? "Edit video" : "Edit photo"}</h1> : <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{day}</h1>
          {date && <time className="block truncate text-caption text-muted-foreground" dateTime={date.toISOString()}>{formatTime.format(date)}</time>}
        </div>}
        {!state.editing && showing && photosMenu.length > 0 && <Menu>
          <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Photo actions"><Ellipsis /></Button></MenuTrigger>
          <MenuContent>{photosMenu.map(({ label, icon, select }) => <MenuItem key={label} onSelect={select}>{icon}{label}</MenuItem>)}</MenuContent>
        </Menu>}
        {state.editing && <Button disabled={!allows({ type: "save" })} onClick={() => action({ type: "save" })}>{state.replace ? "Replace" : "Save copy"}</Button>}
        {control("Check saved copy", { type: "checkCopy" }, <Info />)}
      </header>
      <div className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
        role="group" aria-label="Photo viewer" tabIndex={0}
        onKeyDown={(event) => {
          const neighbour = event.key === "ArrowLeft" ? before : event.key === "ArrowRight" ? after : undefined;
          if (neighbour !== undefined) { event.preventDefault(); action({ type: "swipe", neighbour }); }
        }}
        onDoubleClick={() => action({ type: "zoomTo", level: state.zoom > 1 ? 1 : 2 })}>
        {showing && (state.kind === "Clip"
          ? <video ref={attachVideo} key={state.open} src={current.uri} poster={current.item?.image} playsInline preload="metadata" onTimeUpdate={played} onEnded={played}
              className="size-full object-contain" style={state.editing ? { transform: `rotate(${state.edit.turns * 90}deg) scale(${state.edit.cropped ? 1.25 : 1})` } : undefined} />
          : <img src={edited?.image ?? current.uri} alt={name} decoding="async" className="size-full object-contain" style={{ transform: `scale(${state.zoom})` }} />)}
        {state.gone && <p role="status">This item is no longer available.</p>}
        {state.read.status === "Loading" && <span role="status" aria-label="Loading photo">…</span>}
        {allows({ type: "reload" }) && <Button variant="secondary" onClick={() => action({ type: "reload" })}>Try again</Button>}
      </div>
      {showing && state.kind === "Clip" && <div className="flex items-center gap-2 px-3">
        <Button variant="ghost" size="icon" disabled={!allows({ type: "pause" }) && !allows({ type: "play" })} aria-label={state.playing ? "Pause video" : "Play video"} onClick={toggle}>{state.playing ? <Pause /> : <Play />}</Button>
        <input type="range" className="flex-1 accent-primary" aria-label="Video position" min={state.editing ? state.edit.start : 0} max={state.editing ? state.edit.end : state.duration} value={state.position} onChange={(event) => seek(event.currentTarget.valueAsNumber)} />
      </div>}
      {state.refusal !== "NoRefusal" && <p role="status" className="px-4 py-2 text-center text-sm">{messages[state.refusal]}</p>}
      {state.save.outcome === "Unknown" && <p role="status" className="px-4 py-2 text-center text-sm">{state.lookup.status === "Loaded" ? state.found ? "Saved copy found" : "No saved copy found" : "Save unconfirmed"}</p>}
      {state.editing && <div aria-label="Photo edit tools" className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center justify-around gap-1">
          {control("Rotate", { type: "rotate" }, <RotateCcw />)}
          {control("Crop", { type: "crop" }, <Crop />)}
          {preview?.canReplace && allows({ type: "chooseReplace", replace: !state.replace }) && <Button variant="ghost" aria-pressed={state.replace} onClick={() => action({ type: "chooseReplace", replace: !state.replace })}>Replace original</Button>}
          {allows({ type: "retryPreview" }) && <Button variant="secondary" onClick={() => action({ type: "retryPreview" })}>Retry preview</Button>}
        </div>
        {state.kind === "Still" ? <div className="flex gap-1 overflow-x-auto">
          {filters.map((look) => <Button key={look} variant={state.edit.look === look ? "secondary" : "ghost"} size="sm" aria-pressed={state.edit.look === look} disabled={state.edit.look !== look && !allows({ type: "restyle", look })} onClick={() => action({ type: "restyle", look })}>{look}</Button>)}
        </div> : <>
          <label className="flex gap-2 text-sm">Start<input type="range" className="flex-1 accent-primary" min={0} max={Math.max(0, state.edit.end - 1)} value={state.edit.start}
            onChange={(event) => action({ type: "trim", start: event.currentTarget.valueAsNumber, end: state.edit.end })} /></label>
          <label className="flex gap-2 text-sm">End<input type="range" className="flex-1 accent-primary" min={state.edit.start + 1} max={state.duration} value={state.edit.end}
            onChange={(event) => action({ type: "trim", start: state.edit.start, end: event.currentTarget.valueAsNumber })} /></label>
        </>}
      </div>}
      {!state.editing && showing && <div role="toolbar" aria-label="Photo controls" className="relative flex shrink-0 justify-around gap-0.5 px-4 pt-2 pb-8">
        {before !== undefined && <Button className="sr-only focus:not-sr-only" variant="ghost" size="icon" aria-label="Previous photo" onClick={() => action({ type: "swipe", neighbour: before })}><ChevronLeft /></Button>}
        {!inTrash && control(state.favourite ? "Remove from favorites" : "Favorite", { type: "toggleFavourite" }, <Heart className={state.favourite ? "fill-current" : undefined} />)}
        {!inTrash && control("Edit", { type: "startEdit" }, <Pencil />)}
        {control("Info", { type: "toggleInfo" }, <Info />)}
        {after !== undefined && <Button className="sr-only focus:not-sr-only" variant="ghost" size="icon" aria-label="Next photo" onClick={() => action({ type: "swipe", neighbour: after })}><ChevronRight /></Button>}
      </div>}
      <Sheet open={state.info} onOpenChange={(open) => { if (!open) action({ type: "toggleInfo" }); }}>
        <SheetContent title={name}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {date && <><dt>Taken</dt><dd>{formatDate.format(date)} {formatTime.format(date)}</dd></>}
            {item !== undefined && <><dt>Dimensions</dt><dd>{item.width} × {item.height}</dd></>}
            {item !== undefined && <><dt>Size</dt><dd>{Math.round((item.size) / 1024)} KB</dd></>}
          </dl>
        </SheetContent>
      </Sheet>
    </div>
  );
}
