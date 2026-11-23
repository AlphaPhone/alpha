// spec/camera/viewfinder.md, "Story: Take photos"; spec/camera/viewfinder.md, "Story: Record videos"; spec/camera/viewfinder.md, "Story: Recover when the camera is denied or stops"; spec/camera/focus.md, "Story: Focus where I tap"
import { Camera as CameraIcon, ChevronLeft, CameraOff, Flashlight, FlashlightOff, Grid3x3, MicOff, RefreshCcw, Timer, Zap, ZapOff } from "lucide-react";
import { useRef } from "react";
import type { Camera, Event } from "../../../gen/camera__viewfinder.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { Button } from "../components/ui/index.ts";
import { accessDetail, recordingLabel } from "../../camera/messages.vibe";
import { RECORDING } from "../../camera/bridge.vibe";

/** What the Camera screen does with the owner's controls. */
export interface CameraActions {
  /** Back to the apps. */
  back(): void;
  /** The shutter: a photo, the self-timer, or start and stop a recording. */
  shutter(): void;
  /** Video or Photo. */
  pickMode(mode: Camera["mode"]): void;
  /** Switch between the back and front cameras. */
  flip(): void;
  /** Zoom to a ratio in tenths, from a chip or a pinch. */
  zoomTo(tenths: number): void;
  /** Flash Off, Auto, On. */
  cycleFlash(): void;
  /** Self-timer Off, 3 s, 10 s. */
  cycleTimer(): void;
  /** The framing grid on or off. */
  toggleGrid(): void;
  /** Video's light on or off. */
  toggleLight(): void;
  /** Focus at a point of the viewfinder, each coordinate from 0 to 1. */
  focusAt(x: number, y: number): void;
  /** Restart a denied or stopped camera. */
  retry(): void;
  /** Open Alpha's app info in Android Settings. */
  allow(): void;
  /** Record without sound after the microphone was refused. */
  noSound(): void;
  /** Ask for the microphone again and record with sound. */
  micRetry(): void;
  /** Open the last capture in Photos. */
  openLast(): void;
  /** Dismiss the short line over Camera. */
  dismissNotice(): void;
  /** Mount the live preview into the viewfinder; the returned function unmounts it. */
  viewfinder(element: HTMLElement | null): void | (() => void);
}

/** Camera's whole screen: the visit's state, what may be done now, and the owner's controls. */
export interface CameraViewProps {
  /** The visit as the viewfinder Machine keeps it. */
  camera: Camera;
  /** The one short line over Camera, empty for none. */
  said: string;
  /** Whether a control's event is allowed now. */
  can: (event: Event) => boolean;
  /** The browser build words its access notice for the browser. */
  browser: boolean;
  /** The owner's controls. */
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
  const pinch = useRef<{ pointers: Map<number, { x: number; y: number }>; start: number; from: number; used: boolean }>({ pointers: new Map(), start: 0, from: 10, used: false });
  const spread = () => {
    const [a, b] = [...pinch.current.pointers.values()];
    return a === undefined || b === undefined ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
  };
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-foreground text-background">
      <button
        type="button"
        ref={actions.viewfinder}
        aria-label="Viewfinder. Tap to focus or pinch to zoom"
        className={cn("absolute inset-0 touch-none overflow-hidden", focusRing)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pinch.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pinch.current.pointers.size === 2) pinch.current = { ...pinch.current, start: spread(), from: camera.zoom, used: true };
        }}
        onPointerMove={(event) => {
          if (!pinch.current.pointers.has(event.pointerId)) return;
          pinch.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pinch.current.pointers.size === 2 && pinch.current.start > 0) actions.zoomTo(pinch.current.from * spread() / pinch.current.start);
        }}
        onPointerCancel={() => { pinch.current = { pointers: new Map(), start: 0, from: camera.zoom, used: false }; }}
        onPointerUp={(event) => {
          pinch.current.pointers.delete(event.pointerId);
          if (pinch.current.pointers.size < 2) pinch.current.start = 0;
        }}
        onClick={(event) => {
          if (pinch.current.used) {
            if (pinch.current.pointers.size === 0) pinch.current.used = false;
            return;
          }
          if (event.detail === 0) return actions.focusAt(0.5, 0.5);
          const box = event.currentTarget.getBoundingClientRect();
          actions.focusAt((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
        }}
      >
        {camera.grid && camera.phase === "PreviewReady" && (
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
        {can({ type: "toggleGrid" }) && <Button variant="ghost" size="icon" aria-label="Framing grid" aria-pressed={camera.grid} onClick={actions.toggleGrid}><Grid3x3 /></Button>}
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
            <button type="button" aria-label="Open last capture in Photos" onClick={actions.openLast} className={cn("size-12 overflow-hidden rounded-md", focusRing)}>
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
