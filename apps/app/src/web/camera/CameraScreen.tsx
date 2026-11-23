// spec/camera/viewfinder.md, "Story: Keep the viewfinder only while Camera is in front"; spec/camera/scanDialogs.md, "Story: Review the text I scanned before anything is saved"; spec/camera/scanDialogs.md, "Story: Make a searchable PDF of the pages I reviewed"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine as useViewfinder } from "../../../gen/camera__viewfinder.react.ts";
import { useMachine as useNotices } from "../../../gen/camera__notices.react.ts";
import { useMachine as useDialogs } from "../../../gen/camera__scanDialogs.react.ts";
import { useMachine as useScan } from "../../../gen/camera__scan.react.ts";
import { initial } from "../../../gen/camera__viewfinder.ts";
import { attachViewfinder } from "../../camera/browserCamera.ts";
import { CameraHandoffs } from "../../camera/ports.vibe";
import { Scanner } from "../../camera/scanner.vibe";
import { Viewfinder } from "../../camera/viewfinder.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { CameraView } from "./CameraView.tsx";
import { ScanReview } from "./ScanReview.tsx";
import { act, buildInfo, readNow, runtime } from "../shell/services.ts";

const camera = (use: (v: Viewfinder.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Viewfinder), use));
const scanner = (use: (s: Scanner.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Scanner), use));

/** Mount the viewfinder for this visit, and hear the volume keys while it is shown; the foreground itself reaches the viewfinder through its service. */
function mountViewfinder(element: HTMLElement | null): void | (() => void) {
  if (element === null) return;
  attachViewfinder(element);
  camera((v) => v.enter());
  const volume = () => camera((v) => v.volumeKey());
  window.addEventListener("alpha:volume-shutter", volume);
  return () => {
    window.removeEventListener("alpha:volume-shutter", volume);
    attachViewfinder(null);
    camera((v) => v.leave());
  };
}

/** The Camera app's screen props: the shell's route and close. */
export type CameraScreenProps = ScreenProps;

/**
 * The Camera app.
 * @model spec/camera/viewfinder.md
 */
export function CameraScreen({ onClose }: CameraScreenProps) {
  const { state = initial, can } = useViewfinder(runtime);
  const { state: notices, send: sendNotice } = useNotices(runtime);
  const { state: dialogs, can: canDialog } = useDialogs(runtime);
  const { state: scan, can: canScan } = useScan(runtime);
  const [browser] = useState(() => buildInfo().variant === "browser");
  const searchLines = dialogs?.searchable.ready === true ? readNow(Effect.flatMap(Effect.service(Scanner), (s) => s.searchablePages())) : [];
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
          openLast: () => act(Effect.flatMap(Effect.service(CameraHandoffs), (h) => h.open("photos", state.lastId === "" ? undefined : `item:${state.lastId}`))),
          dismissNotice: () => void sendNotice({ type: "dismiss" }),
          viewfinder: mountViewfinder,
        }}
      />
      {dialogs !== undefined && scan !== undefined && (
        <ScanReview dialogs={dialogs} scan={scan} can={canDialog} canScan={canScan} searchLines={searchLines} scanner={scanner} />
      )}
    </>
  );
}
