// spec/app/camera/index.md, "Story: Open the camera"; spec/app/camera/index.md, "Story: Frame the shot"; spec/app/camera/index.md, "Story: Take photos and videos"; spec/app/camera/index.md, "Story: Let Alpha take a photo"
import { Button, cn, focusRing, Spinner } from "@repo/ui";
import { CameraOff, ChevronLeft, Clock as ClockIcon, FileScan, Flashlight, FlashlightOff, Grid3x3, MicOff, Sparkles, SwitchCamera, Video, Zap, ZapOff } from "lucide-react";
import { useCallback, useRef, useState, type PointerEvent } from "react";
import type { Camera as Visit, Event, Mode, Said } from "../../gen/app__camera.ts";
import { chosenLens, ready, recording } from "../../gen/app__camera.ts";
import { useMachine } from "../../gen/app__camera.react.ts";
import type { Clock, Film } from "../../gen/app__camera__recording.ts";
import { nearLimit, remaining, timer } from "../../gen/app__camera__recording.ts";
import { allows } from "../../gen/kit__permission.ts";
import { CameraPort, type LensFacts, type Point } from "../platform/camera.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { Scan } from "../files/Scan.tsx";
import type { cameraScan } from "../files/scan.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { approveCapture, CameraAssets, focus, shutter, type camera } from "./camera.vibe";
import { Effect, type Layer } from "effect";

type Runtime = Layer.Success<typeof camera> | Layer.Success<typeof cameraScan> | Resident;
type Can = (event: Event) => boolean;
type Fire = (event: Event) => void;

const stops = [[5, ".5"], [10, "1"], [20, "2"], [50, "5"], [100, "10"]] as const;
const notices = { Quiet: "", NotTaken: "Photo not taken", NothingRecorded: "Nothing recorded", NotSaved: "Save unconfirmed" } satisfies Record<Said, string>;

const read = ({ minutes, seconds }: Clock) => `${minutes}:${seconds.toString().padStart(2, "0")}`;

/** The recording's elapsed time, and the time left once a limit is a minute away. */
const timed = (film: Film) => nearLimit(film) ? `${read(timer(film))} · ${read(remaining(film))} left` : read(timer(film));

function Viewfinder({ state, native, zoom, focusAt, bind }: {
  state: Visit;
  native: boolean;
  zoom: (tenths: number) => void;
  focusAt: (point: Point) => void;
  bind: (video: HTMLVideoElement | null) => (() => void) | undefined;
}) {
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; zoom: number } | undefined>(undefined);
  const pinchedRef = useRef(false);
  const [target, setTarget] = useState<Point | undefined>(undefined);
  const input = (event: PointerEvent<HTMLButtonElement>) => ({ x: event.clientX, y: event.clientY });
  function spread() {
    const [a, b] = pointersRef.current.values();
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  function down(event: PointerEvent<HTMLButtonElement>) {
    const held = pointersRef.current;
    if (held.size === 0) pinchedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    held.set(event.pointerId, input(event));
    if (held.size === 2) {
      pinchRef.current = { distance: spread(), zoom: state.zoom };
      pinchedRef.current = true;
    }
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, input(event));
    const start = pinchRef.current;
    if (start && start.distance > 0 && pointersRef.current.size === 2) zoom(Math.round(start.zoom * spread() / start.distance));
  }
  function up(event: PointerEvent<HTMLButtonElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = undefined;
  }
  return (
    <button
      type="button"
      aria-label="Viewfinder. Tap to focus or pinch to zoom"
      className={cn("relative min-h-36 w-full flex-1 touch-none overflow-hidden", !native && "bg-background", focusRing)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={(event) => {
        if (pinchedRef.current || !ready(state)) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = event.detail === 0 ? box.left + box.width / 2 : event.clientX;
        const y = event.detail === 0 ? box.top + box.height / 2 : event.clientY;
        const page = event.currentTarget.ownerDocument.documentElement;
        const point = {
          x: Math.max(0, Math.min(1, (x - box.left) / box.width)),
          y: Math.max(0, Math.min(1, (y - box.top) / box.height)),
          viewportX: Math.max(0, Math.min(1, x / page.clientWidth)),
          viewportY: Math.max(0, Math.min(1, y / page.clientHeight)),
        };
        setTarget(point);
        focusAt(point);
      }}
    >
      <video
        ref={bind}
        autoPlay
        muted
        playsInline
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 size-full object-cover", state.lens === "Front" && "-scale-x-100", native && "invisible")}
      />
      {state.focus > 0 && target !== undefined && (
        <span
          key={state.focus}
          role="status"
          aria-label={state.confirmed === state.focus ? "Camera focus applied" : "Focus target"}
          className={cn("pointer-events-none absolute z-10 size-10 -translate-1/2 rounded-sm border-2 shadow-sm", state.confirmed === state.focus ? "border-ok" : "border-warn")}
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
        />
      )}
      {state.grid && ready(state) && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, cell) => <span key={cell} className={cn(cell % 3 > 0 && "border-l border-foreground/40", cell >= 3 && "border-t border-foreground/40")} />)}
        </span>
      )}
      {state.countdown > 0 && <span role="timer" aria-label={`Photo in ${state.countdown} seconds`} className="pointer-events-none absolute inset-0 grid place-items-center text-4xl font-light tabular-nums">{state.countdown}</span>}
      {state.shot !== 0 && <span aria-hidden className="pointer-events-none absolute inset-0 animate-pulse bg-foreground/20 motion-reduce:animate-none" />}
    </button>
  );
}

function Access({ state, present, native, can, fire, takeSilent }: {
  state: Visit;
  present: boolean;
  native: boolean;
  can: Can;
  fire: Fire;
  takeSilent: () => void;
}) {
  const video = state.mode === "Video";
  const noCamera = !allows(state.permission);
  const failed = state.phase === "Failed" || !present;
  const noMic = !noCamera && !failed && video && !allows(state.mic) && state.film.stage !== "Running";
  if (!state.showing || !noCamera && !failed && !noMic) return null;
  const Icon = noMic ? MicOff : CameraOff;
  const title = failed ? "Can’t start camera" : noCamera ? "Camera off" : "Mic off";
  const ask = { type: noCamera ? "askAccess" : "askMicrophone" } as const;
  const detail = !present
    ? "A camera is unavailable on this device."
    : failed
      ? "Try to start the camera again."
      : noCamera
        ? native ? "Allow camera access to see the viewfinder." : "Allow camera access in your browser."
        : "Allow the microphone, or record without sound.";
  return (
    <section role="alert" aria-label={title} className="absolute inset-x-4 top-1/4 z-20 mx-auto flex max-h-1/2 max-w-md flex-col items-center gap-2 overflow-auto rounded-tile bg-secondary p-4 text-center text-secondary-foreground">
      <Icon className="size-8" aria-hidden />
      <strong>{title}</strong>
      <p className="text-sm text-muted-foreground">{detail}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {!failed && present && can(ask) && <Button variant="outline" size="sm" onClick={() => fire(ask)}>Allow</Button>}
        {native && !failed && can({ type: "openSettings" }) && <Button variant="outline" size="sm" onClick={() => fire({ type: "openSettings" })}>Open Settings</Button>}
        {failed && can({ type: "retry" }) && <Button variant="outline" size="sm" onClick={() => fire({ type: "retry" })}>Retry</Button>}
        {noMic && can({ type: "startRecording", sound: false }) && <Button variant="outline" size="sm" aria-label="Record without sound" onClick={takeSilent}>No sound</Button>}
      </div>
    </section>
  );
}

function ZoomStops({ state, lens, zoom }: { state: Visit; lens: LensFacts | undefined; zoom: (level: number) => void }) {
  const enabled = stops.filter(([level]) => level >= (lens?.minimum ?? 10) && level <= (lens?.maximum ?? 10));
  if (!ready(state) || enabled.length < 2) return null;
  const nearest = enabled.reduce((a, b) => Math.abs(a[0] - state.zoom) < Math.abs(b[0] - state.zoom) ? a : b);
  return (
    <div role="group" aria-label="Zoom" className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex justify-center landscape:bottom-2">
      {enabled.map(([level, label]) => (
        <Button
          key={level}
          variant="ghost"
          size="icon"
          aria-label={`Zoom ${level / 10}×`}
          aria-pressed={nearest[0] === level}
          className="pointer-events-auto hover:bg-transparent active:bg-transparent"
          onClick={() => zoom(level)}
        >
          <span className={cn("grid place-items-center rounded-full", nearest[0] === level ? "size-10 bg-foreground text-sm text-background" : "size-8.5 bg-background/65 text-xs text-foreground")}>
            {label}{nearest[0] === level ? "×" : ""}
          </span>
        </Button>
      ))}
    </div>
  );
}

/** Camera’s live viewfinder, framing controls, shutter, last capture and capture approval. @model spec/app/camera/index.md */
export function Camera({ runtime, alpha }: Shown<Runtime>) {
  const { state, can: permits, send } = useTimed(runtime, useMachine);
  const shell = useShell(alpha.runtime);
  const bind = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    void runtime.runPromiseExit(Effect.flatMap(CameraAssets, (assets) => assets.bind(video)));
    return () => { void runtime.runPromiseExit(Effect.flatMap(CameraAssets, (assets) => assets.bind(null))); };
  }, [runtime]);
  if (!state) return null;

  const port = runtime.runSync(CameraPort);
  const lens = runtime.runSync(Effect.flatMap(CameraAssets, (assets) => assets.lens(state.preview)));
  const last = state.last === 0 ? undefined : runtime.runSync(Effect.flatMap(CameraAssets, (assets) => assets.read(state.last)));
  const can: Can = (event) => permits(event, "Owner");
  const fire: Fire = (event) => { if (can(event)) void send(event, "Owner"); };
  const video = state.mode === "Video";
  const inProgress = recording(state);
  const active = ready(state);
  const native = port.nativePreview && state.phase === "Ready";
  const currentZoom = (level: number) => {
    const low = Math.max(5, lens?.minimum ?? 10);
    const high = Math.min(100, lens?.maximum ?? 10);
    const next = Math.min(high, Math.max(low, level));
    if (next !== state.zoom) fire({ type: "zoomTo", level: next });
  };
  const click = () => void runtime.runPromiseExit(shutter());
  const photoShutter = can({ type: "shutter" }) || can({ type: "cancelDelay" });
  const flashLabel = !video ? (state.flashAuto ? "Flash auto" : state.flash ? "Flash on" : "Flash off") : state.flash ? "Light on" : "Light off";
  const Flash = video ? (state.flash ? Flashlight : FlashlightOff) : state.flash || state.flashAuto ? Zap : ZapOff;
  const videoShutter = can({ type: "stopRecording", now: untimed }) || can({ type: "startRecording", sound: true });

  return (
    <section
      aria-label="Camera"
      data-alpha-camera-root=""
      data-alpha-camera-native={native ? "" : undefined}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- design.md, "Dark": Camera keeps a dark viewfinder and controls in both themes, as in develop
      className={cn("dark relative isolate grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden text-foreground landscape:grid-cols-[minmax(0,1fr)_8.25rem]", !native && "bg-background")}
    >
      <header className="z-10 flex min-h-13 items-center justify-end gap-1 overflow-x-auto bg-background px-2 landscape:col-span-2">
        {shell.can({ type: "goBack" }) && <Button variant="ghost" size="icon" aria-label="Back to apps" onClick={() => void alpha.back()}><ChevronLeft /></Button>}
        <span className="flex-1" />
        {inProgress && <span role="timer" aria-label="Recording" className="flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-sm font-semibold tabular-nums"><span aria-hidden className="size-2 rounded-full bg-record" />{timed(state.film)}</span>}
        {can({ type: "flip" }) && <Button variant="ghost" size="icon" aria-label="Switch camera" onClick={() => fire({ type: "flip" })}><SwitchCamera /></Button>}
        {can({ type: "cycleDelay" }) && (
          <Button variant="ghost" size="icon" className="relative" aria-label={state.delay === 0 ? "Timer off" : `Timer ${state.delay} seconds`} aria-pressed={state.delay !== 0} onClick={() => fire({ type: "cycleDelay" })}>
            <ClockIcon />
            {state.delay > 0 && <span aria-hidden className="absolute bottom-1 right-0 text-xs leading-none">{state.delay}</span>}
          </Button>
        )}
        {lens !== undefined && lens.aspects.length > 1 && can({ type: "toggleRatio" }) && (
          <Button variant="ghost" size="icon" className="w-auto min-w-11 px-2 text-sm tabular-nums" aria-label={`Aspect ratio ${state.wide ? "16:9" : "4:3"}`} onClick={() => fire({ type: "toggleRatio" })}>
            {state.wide ? "16:9" : "4:3"}
          </Button>
        )}
        {can({ type: "toggleGrid" }) && <Button variant="ghost" size="icon" aria-label="Framing grid" aria-pressed={state.grid} onClick={() => fire({ type: "toggleGrid" })}><Grid3x3 /></Button>}
        {lens?.flash && can({ type: "toggleFlash" }) && (
          <Button variant="ghost" size="icon" className="relative" aria-label={flashLabel} aria-pressed={state.flash || state.flashAuto} onClick={() => fire({ type: "toggleFlash" })}>
            <Flash />
            {state.flashAuto && <span aria-hidden className="absolute bottom-1 right-1 text-xs leading-none">A</span>}
          </Button>
        )}
        {can({ type: "scanDocument" }) && <Button variant="ghost" size="icon" aria-label="Scan document" onClick={() => fire({ type: "scanDocument" })}><FileScan /></Button>}
      </header>

      <div className="relative flex min-h-36 flex-col">
        <Viewfinder
          state={state}
          native={native}
          bind={bind}
          zoom={currentZoom}
          focusAt={(point) => void runtime.runPromiseExit(focus(point))}
        />
        <ZoomStops state={state} lens={lens} zoom={currentZoom} />
        {state.phase === "Starting" && <span className="pointer-events-none absolute inset-0 grid place-items-center"><Spinner aria-label="Starting camera" /></span>}
        <Access state={state} present={port.present} native={port.nativePreview} can={can} fire={fire} takeSilent={() => fire({ type: "startRecording", sound: false })} />
        {state.said !== "Quiet" && <button type="button" aria-label="Dismiss camera message" className={cn("absolute inset-x-4 top-3 z-10 rounded-tile bg-background/80 px-4 py-3 text-left text-sm", focusRing)} onClick={() => fire({ type: "dismiss" })}>{notices[state.said]}</button>}
        {active && state.agent.stage === "Asked" && (
          <section aria-label="Camera request" className="absolute inset-x-4 bottom-16 z-20 mx-auto flex max-w-md flex-col gap-3 rounded-tile bg-secondary p-4 text-secondary-foreground">
            <strong>Take a photo for Alpha?</strong>
            {state.requestedLens !== "AsShown" && <span className="text-sm text-muted-foreground">{chosenLens(state) === "Front" ? "Front camera requested" : "Back camera requested"}</span>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => fire({ type: "agentDecline" })}>Decline</Button>
              <Button size="sm" disabled={!can({ type: "agentApprove" })} onClick={() => void runtime.runPromiseExit(approveCapture())}>Take photo</Button>
            </div>
          </section>
        )}
      </div>

      <footer className="z-10 flex flex-col justify-center gap-4 bg-background pb-4 landscape:row-start-2 landscape:gap-2 landscape:pb-0">
        {!inProgress && (
          <div role="group" aria-label="Camera mode" className="flex min-h-11 justify-center gap-2 overflow-x-auto landscape:flex-wrap landscape:gap-0">
            {(["Video", "Photo"] satisfies Mode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={`${mode} mode`}
                aria-pressed={state.mode === mode}
                className={cn("flex min-h-11 shrink-0 flex-col items-center justify-center gap-1.25 px-3.5 text-sm font-semibold", state.mode === mode ? "text-foreground" : "text-foreground/60", focusRing)}
                onClick={() => fire({ type: "setMode", mode })}
              >
                {mode}<span aria-hidden className={cn("size-1 rounded-full bg-foreground", state.mode !== mode && "invisible")} />
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center justify-items-center px-11 landscape:grid-cols-1 landscape:gap-2 landscape:px-3">
          {last && can({ type: "openLast" }) ? (
            <button type="button" aria-label={last.mime.startsWith("video/") ? "Open last video" : "Open last photo"} onClick={() => fire({ type: "openLast" })} className={cn("size-13 justify-self-start overflow-hidden rounded-drawer-icon border border-foreground/70 landscape:justify-self-center", focusRing)}>
              {last.mime.startsWith("video/") && !last.thumbnail ? <Video aria-hidden className="m-auto size-5" /> : <img src={last.thumbnail ?? last.source} alt="" className="size-full object-cover" />}
            </button>
          ) : <span />}
          <button
            type="button"
            aria-label={!video ? (state.countdown > 0 ? "Cancel timer" : "Take photo") : state.film.stage === "Running" ? "Stop recording" : "Record video"}
            aria-busy={state.shot !== 0 || state.film.stage === "Opening" || state.film.stage === "Stopping"}
            disabled={!active || (video ? !videoShutter : !photoShutter)}
            onClick={click}
            className={cn("flex size-20 items-center justify-center rounded-full border-4 border-foreground disabled:opacity-60", focusRing)}
          >
            <span aria-hidden className={cn("transition-all duration-fast motion-reduce:transition-none", inProgress ? "size-7.5 rounded-lg bg-record" : cn("size-15.5 rounded-full", video ? "bg-record" : "bg-foreground"))} />
          </button>
          <span />
        </div>
      </footer>
      <Scan runtime={runtime} alpha={alpha} />
    </section>
  );
}
