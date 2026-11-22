// spec/camera/viewfinder.md, "Story: Keep the viewfinder only while Camera is in front"; spec/camera/scan.md, "Story: Ask Alpha to scan what Camera sees"; spec/camera/media.md, "Story: Ask Alpha about what Camera sees"
import { Effect } from "effect";
import { useMachine as useViewfinder } from "../../../gen/camera__viewfinder.react.ts";
import { useMachine as useNotices } from "../../../gen/camera__notices.react.ts";
import { initial } from "../../../gen/camera__viewfinder.ts";
import { attachViewfinder } from "../../camera/browserCamera.ts";
import { CameraHandoffs } from "../../camera/handoffs.vibe";
import { MediaReview } from "../../camera/mediaReview.vibe";
import { Scanner } from "../../camera/scanner.vibe";
import { Viewfinder } from "../../camera/viewfinder.vibe";
import { Build } from "../../platform/build.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { CameraView } from "./CameraView.tsx";
import { ScanReview } from "./ScanReview.tsx";
import { cameraRuntime, run } from "./runtime.ts";

const browser = cameraRuntime.runSync(Effect.map(Effect.service(Build), (build) => build.info.variant === "browser"));
const camera = (use: (v: Viewfinder.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Viewfinder), use));

/** Mount the viewfinder for this visit, and follow the page's visibility and the volume keys while it is shown. */
function mountViewfinder(element: HTMLElement | null): void | (() => void) {
  if (element === null) return;
  attachViewfinder(element);
  camera((v) => v.enter());
  const visibility = () => camera((v) => (document.hidden ? v.sync() : v.resumed()));
  const volume = () => camera((v) => v.volumeKey());
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("alpha:volume-shutter", volume);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("alpha:volume-shutter", volume);
    attachViewfinder(null);
    camera((v) => v.leave());
  };
}

/**
 * The Camera app.
 * @model spec/camera/viewfinder.md
 */
export function CameraScreen({ onClose }: ScreenProps) {
  const { state = initial, can } = useViewfinder(cameraRuntime);
  const { state: notices, send: sendNotice } = useNotices(cameraRuntime);
  return (
    <>
      <CameraView
        camera={state}
        said={notices?.said ?? ""}
        can={can}
        browser={browser}
        actions={{
          back: onClose,
          shutter: () => camera((v) => v.shutter()),
          pickMode: (mode) => camera((v) => v.pickMode(mode)),
          flip: () => camera((v) => v.flip()),
          zoomTo: (tenths) => camera((v) => v.zoomTo(tenths)),
          cycleFlash: () => camera((v) => v.cycleFlash()),
          cycleTimer: () => camera((v) => v.cycleTimer()),
          toggleGrid: () => camera((v) => v.toggleGrid()),
          toggleLight: () => camera((v) => v.toggleLight()),
          focusAt: (x, y) => camera((v) => v.focusAt(x, y)),
          retry: () => camera((v) => v.retry()),
          allow: () => camera((v) => v.allow()),
          noSound: () => camera((v) => v.answerMicNotice(false)),
          micRetry: () => camera((v) => v.answerMicNotice(true)),
          openLast: () => run(Effect.flatMap(Effect.service(CameraHandoffs), (h) => h.open("photos", state.lastId))),
          chooseImage: () => run(Effect.flatMap(Effect.service(Scanner), (s) => s.chooseImage())),
          scan: () => run(Effect.flatMap(Effect.service(Scanner), (s) => s.scanFrame())),
          askAlpha: () => run(Effect.flatMap(Effect.service(MediaReview), (m) => m.askAboutFrame(""))),
          dismissNotice: () => void sendNotice({ type: "dismiss" }),
          viewfinder: mountViewfinder,
        }}
      />
      <ScanReview />
    </>
  );
}

