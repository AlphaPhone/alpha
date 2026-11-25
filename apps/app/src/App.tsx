// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back"; spec/app/shell/gestures.md, "On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe"; spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { Alert, AppHeader, cn } from "@repo/ui";
import { type PointerEvent, useRef } from "react";
import { useMachine } from "../gen/app__shell.react.ts";
import { useMachine as useCanvas } from "../gen/app__shell__keyboard.react.ts";
import { useMachine as useLayers } from "../gen/app__shell__layers.react.ts";
import { assistantInert, pageInert, takesBack } from "../gen/app__shell__layers.ts";
import { swipe } from "../gen/app__shell__gestures.ts";
import { useMachine as usePage } from "../gen/app__update__page.react.ts";
import { editorsMounted } from "../gen/app__update__page.ts";
import type { Alpha } from "./runtime/area.tsx";
import { AppBack } from "./shell/AppBack.tsx";
import { home } from "./shell/shell.vibe";
import { isCommsView, viewHasHeader, views } from "./shell/views.tsx";

export interface AppProps {
  /** Alpha as boot.tsx opened it: the root runtime, and every screen at its place. */
  alpha: Alpha;
}

/**
 * Alpha: Home, or the app on top of the trail under its title, with Back offered exactly when the rules allow it, and
 * over them Ask Alpha, whatever covers the screen, and the notices. Each screen is its area's, drawn at its place.
 * @model spec/app/shell/index.md
 */
export function App({ alpha }: AppProps) {
  const { state, cause, can } = useMachine(alpha.runtime);
  const layers = useLayers(alpha.runtime).state;
  const page = usePage(alpha.runtime).state;
  const launcher = useCanvas(alpha.runtime).state?.launcher ?? false;
  const startedRef = useRef<{ x: number; y: number } | undefined>(undefined);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const swiped = (event: PointerEvent<HTMLElement>) => {
    const from = startedRef.current;
    startedRef.current = undefined;
    const page = event.currentTarget.getBoundingClientRect();
    const went = from ? swipe(launcher, false, page.width, page.height, from.x, from.y, event.clientX - from.x, event.clientY - from.y) : "NoSwipe";
    if (went === "SwipeBack") void alpha.back();
    else if (went === "SwipeHome") void alpha.runtime.runPromise(home());
  };
  const inert = layers !== undefined && pageInert(layers);
  const showing = state.trail.at(-1);
  const comms = isCommsView(showing);
  const strip = comms && state.assistant === "Full";
  const back = can({ type: "goBack" });
  return (
    <main
      data-alpha-launcher={launcher ? "" : undefined}
      ref={(page) => { if (page) page.ownerDocument.documentElement.dataset.alphaCanGoBack = String(back || (layers !== undefined && takesBack(layers))); }}
      onPointerDown={(event) => { startedRef.current = { x: event.clientX - event.currentTarget.getBoundingClientRect().left, y: event.clientY }; }}
      onPointerUp={swiped}
      className={cn("relative mx-auto flex w-full flex-col bg-background has-[[data-alpha-camera-native]]:bg-transparent font-sans text-base text-foreground sm:pointer-fine:max-w-103", comms ? "h-dvh overflow-hidden" : "min-h-dvh")}
    >
      <div className={cn("relative flex min-h-0 flex-1 flex-col", comms && "overflow-auto overscroll-contain", strip && "overflow-hidden")} data-alpha-comms-stage={comms ? "" : undefined} inert={inert || strip}>
        {comms && alpha.slot("phone/stage")}
        {page === undefined || !editorsMounted(page) ? null : showing === undefined
          ? alpha.slot("home")
          : (
            <div key={showing} className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise">
              {!viewHasHeader(showing) && <AppHeader
                title={views[showing].label}
                leading={back && <AppBack alpha={alpha} />}
              />}
              {alpha.slot(`view:${showing}`)}
            </div>
          )}
      </div>
      <div className={comms ? "shrink-0" : undefined} inert={layers !== undefined && assistantInert(layers)}>{alpha.slot("assistant")}</div>
      {alpha.slot("overlay")}
      {alpha.slot("notice")}
    </main>
  );
}
