// spec/camera/viewfinder.md, "Story: Take photos"; spec/camera/viewfinder.md, "Story: Record videos"; spec/camera/viewfinder.md, "Story: Recover when the camera is denied or stops"; spec/camera/focus.md, "Story: Focus where I tap"
import { Camera as CameraIcon, ChevronLeft, CameraOff, Flashlight, FlashlightOff, Grid3x3, MicOff, MoreVertical, RefreshCcw, Timer, Zap, ZapOff } from "lucide-react";
import type { Camera, Event } from "../../../gen/camera__viewfinder.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/index.ts";
import { accessDetail, recordingLabel } from "../../camera/messages.vibe";
import { RECORDING } from "../../camera/bridge.vibe";

/** What the Camera screen does with the owner's controls. */
export interface CameraActions {
  back(): void;
  shutter(): void;
  pickMode(mode: Camera["mode"]): void;
  flip(): void;
  zoomTo(tenths: number): void;
  cycleFlash(): void;
  cycleTimer(): void;
  toggleGrid(): void;
  toggleLight(): void;
  focusAt(x: number, y: number): void;
  retry(): void;
  allow(): void;
  noSound(): void;
  micRetry(): void;
  openLast(): void;
  chooseImage(): void;
  scan(): void;
  askAlpha(): void;
  dismissNotice(): void;
  viewfinder(element: HTMLElement | null): void | (() => void);
}

export interface CameraViewProps {
  /** The visit as the viewfinder Machine keeps it. */
  camera: Camera;
  /** The one short line over Camera, empty for none. */
  said: string;
  /** Whether a control's event is allowed now. */
  can: (event: Event) => boolean;
  /** The browser build words its access notice for the browser. */
  browser: boolean;
  actions: CameraActions;
}

const ZOOM_STOPS: readonly [number, string][] = [[5, ".5"], [10, "1×"], [20, "2"], [50, "5"]];

/**
 * Camera: the viewfinder, its controls, the shutter and the last capture.
 * @model spec/camera/viewfinder.md
 * @design design.md
 */
export function CameraView({ camera, said, can, browser, actions }: CameraViewProps) {
  const recording = camera.recording !== "RecordingIdle";
  const photo = camera.mode === "PhotoMode";
  const stops = ZOOM_STOPS.filter(([tenths]) => tenths >= camera.widest && tenths <= camera.longest);
  const notice = camera.notice;
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-foreground text-background">
      <button
        type="button"
        ref={actions.viewfinder}
        aria-label="Viewfinder. Tap to focus"
        className={cn("absolute inset-0 overflow-hidden", focusRing)}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          actions.focusAt((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
        }}
      >
        {camera.grid && (
          <span aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, at) => <span key={at} className="border border-background/40" />)}
          </span>
        )}
        {camera.capturing && <span aria-hidden className="pointer-events-none absolute inset-0 animate-pulse bg-background/20" />}
      </button>

      <header className="relative z-10 flex items-center gap-1 p-2">
        <Button variant="ghost" size="icon" aria-label="Back to apps" onClick={actions.back}><ChevronLeft /></Button>
        <span className="flex-1" />
        {recording && (
          <span role="timer" aria-label="Recording" className="flex items-center gap-2 font-mono text-sm uppercase">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            {recordingLabel(camera.elapsed, camera.recordedBytes, RECORDING)}
          </span>
        )}
        {!recording && can({ type: "flip", ok: true }) && <Button variant="ghost" size="icon" aria-label="Switch camera" onClick={actions.flip}><RefreshCcw /></Button>}
        {photo && can({ type: "cycleTimer" }) && (
          <Button variant="ghost" size="icon" aria-label={camera.timer ? `Timer ${camera.timer} seconds` : "Timer off"} aria-pressed={camera.timer > 0} onClick={actions.cycleTimer}>
            <Timer />
            {camera.timer > 0 && <span className="font-mono text-xs">{camera.timer}</span>}
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Framing grid" aria-pressed={camera.grid} onClick={actions.toggleGrid}><Grid3x3 /></Button>
        {photo && can({ type: "cycleFlash" }) && (
          <Button variant="ghost" size="icon" aria-label={camera.flash === "FlashAuto" ? "Flash auto" : camera.flash === "FlashOn" ? "Flash on" : "Flash off"} onClick={actions.cycleFlash}>
            {camera.flash === "FlashOff" ? <ZapOff /> : <Zap />}
            {camera.flash === "FlashAuto" && <span className="font-mono text-xs">A</span>}
          </Button>
        )}
        {!photo && can({ type: "toggleLight" }) && (
          <Button variant="ghost" size="icon" aria-label={camera.light ? "Light on" : "Light off"} aria-pressed={camera.light} onClick={actions.toggleLight}>
            {camera.light ? <Flashlight /> : <FlashlightOff />}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Camera tools"><MoreVertical /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={actions.chooseImage}>Choose image</DropdownMenuItem>
            <DropdownMenuItem onSelect={actions.scan} disabled={!can({ type: "reserveShutter" })}>Scan document</DropdownMenuItem>
            <DropdownMenuItem onSelect={actions.askAlpha} disabled={!can({ type: "reserveShutter" })}>Ask Alpha</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {camera.countdown > 0 && (
        <span role="timer" aria-label={`Photo in ${camera.countdown} seconds`} className="pointer-events-none relative z-10 mt-24 text-center font-serif text-8xl">
          {camera.countdown}
        </span>
      )}

      {said !== "" && (
        <button type="button" aria-label="Dismiss camera message" onClick={actions.dismissNotice} className={cn("relative z-10 mx-4 mt-4 rounded-xl bg-scrim px-4 py-3 text-left text-sm", focusRing)}>
          {said}
        </button>
      )}

      {notice !== "NoNotice" && (
        <div role="alert" aria-label={notice === "UnavailableNotice" ? "Can’t start camera" : notice === "CameraNotice" ? "Camera off" : "Mic off"}
          className="relative z-20 mx-4 mt-auto flex flex-col items-center gap-3 rounded-xl bg-card p-4 text-center text-card-foreground">
          {notice === "MicrophoneNotice" ? <MicOff aria-hidden /> : <CameraOff aria-hidden />}
          <strong>{notice === "UnavailableNotice" ? "Can’t start camera" : notice === "CameraNotice" ? "Camera off" : "Mic off"}</strong>
          <p className="text-sm text-muted-foreground">{accessDetail(notice, browser)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {!browser && notice !== "UnavailableNotice" && <Button variant="secondary" aria-label="Allow in Settings" onClick={actions.allow}>Allow</Button>}
            <Button variant="secondary" onClick={notice === "MicrophoneNotice" ? actions.micRetry : actions.retry}>Retry</Button>
            {notice === "MicrophoneNotice" && <Button variant="secondary" aria-label="Record without sound" onClick={actions.noSound}>No sound</Button>}
          </div>
        </div>
      )}

      <div className="relative z-10 mt-auto flex flex-col gap-3 pb-6">
        {stops.length > 1 && !recording && (
          <div className="flex justify-center gap-2" role="group" aria-label="Zoom">
            {stops.map(([tenths, label]) => (
              <button key={tenths} type="button" aria-label={`Zoom ${tenths / 10}×`} aria-pressed={camera.zoom === tenths} onClick={() => actions.zoomTo(tenths)}
                className={cn("min-h-11 min-w-11 rounded-full font-mono text-xs", camera.zoom === tenths ? "bg-background text-foreground" : "bg-scrim", focusRing)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {!recording && (
          <div className="flex justify-center gap-2" role="group" aria-label="Mode">
            {(["VideoMode", "PhotoMode"] as const).map((mode) => (
              <button key={mode} type="button" aria-label={`${mode === "VideoMode" ? "Video" : "Photo"} mode`} aria-pressed={camera.mode === mode}
                onClick={() => actions.pickMode(mode)} className={cn("min-h-11 px-3 font-mono text-sm uppercase", camera.mode === mode ? "text-primary" : "text-background/70", focusRing)}>
                {mode === "VideoMode" ? "Video" : "Photo"}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between px-10">
          {camera.lastImage !== "" ? (
            <button type="button" aria-label="Open last capture" onClick={actions.openLast} className={cn("size-12 overflow-hidden rounded-md", focusRing)}>
              <img src={camera.lastImage} alt="" className="size-full object-cover" />
            </button>
          ) : <span className="size-12" />}
          <button type="button" onClick={actions.shutter}
            aria-label={photo ? (camera.countdown > 0 ? "Cancel timer" : "Take photo") : recording ? "Stop recording" : "Record video"}
            className={cn("flex size-20 items-center justify-center rounded-full border-4 border-background", focusRing)}>
            <span aria-hidden className={cn("block rounded-full", photo ? "size-16 bg-background" : recording ? "size-8 rounded-md bg-destructive" : "size-16 bg-destructive")} />
          </button>
          <span className="flex size-12 items-center justify-center" aria-hidden><CameraIcon className="opacity-0" /></span>
        </div>
      </div>
    </div>
  );
}
