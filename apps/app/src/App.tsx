// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/index.md, "On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises"; spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back"; spec/app/shell/gestures.md, "On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe"; spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { Alert, AppHeader, cn } from "@repo/ui";
import { type PointerEvent, useCallback, useRef, useSyncExternalStore } from "react";
import { useMachine } from "../gen/app__shell.react.ts";
import { askAlphaDrawn } from "../gen/app__shell.ts";
import { useMachine as useCanvas } from "../gen/app__shell__keyboard.react.ts";
import { useMachine as useLayers } from "../gen/app__shell__layers.react.ts";
import { assistantInert, pageInert, takesBack } from "../gen/app__shell__layers.ts";
import { barHeight, edge, swipe } from "../gen/app__shell__gestures.ts";
import { useMachine as usePage } from "../gen/app__update__page.react.ts";
import { editorsMounted } from "../gen/app__update__page.ts";
import type { Alpha } from "./runtime/area.tsx";
import { AppBack } from "./shell/AppBack.tsx";
import { measureChrome, watchChrome } from "./shell/chrome.vibe";
import { home } from "./shell/shell.vibe";
import { isCommsView, viewHasHeader, views } from "./shell/views.tsx";

export interface AppProps {
  /** Alpha as boot.tsx opened it: the root runtime, and every screen at its place. */
  alpha: Alpha;
}

type StartedSwipe = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  across: number;
  down: number;
  owner: string;
};

function primaryPointer() {
  return typeof window === "undefined" ? undefined : window.matchMedia?.("(pointer: coarse)");
}

function watchPrimaryPointer(changed: () => void) {
  const media = primaryPointer();
  media?.addEventListener("change", changed);
  return () => media?.removeEventListener("change", changed);
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
  const canvas = useCanvas(alpha.runtime).state;
  const launcher = canvas?.launcher ?? false;
  const coarsePointer = useSyncExternalStore(watchPrimaryPointer, () => primaryPointer()?.matches ?? false, () => false);
  const startedRef = useRef<StartedSwipe | undefined>(undefined);
  const frame = useCallback((node: HTMLElement | null) => {
    if (node) return watchChrome(node, (event) => { void alpha.runtime.runPromise(measureChrome(event)); });
  }, [alpha]);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const showing = state.trail.at(-1);
  const owner = `${showing ?? "home"}:${state.assistant}:${launcher}`;
  const beginSwipe = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || event.defaultPrevented) return;
    startedRef.current = undefined;
    const target = event.target;
    if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [data-alpha-own-gesture]")) return;
    const element = event.currentTarget;
    const box = element.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    if (box.width <= 0 || box.height <= 0 || width <= 0 || height <= 0) return;
    const across = width / box.width;
    const down = height / box.height;
    const x = (event.clientX - box.left) * across;
    const y = (event.clientY - box.top) * down;
    if (x < edge || x > width - edge || (launcher && y > height - barHeight)) {
      startedRef.current = { id: event.pointerId, x, y, width, height, across, down, owner };
    }
  };
  const swiped = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary) return;
    const from = startedRef.current;
    if (from?.id !== event.pointerId) return;
    startedRef.current = undefined;
    if (event.defaultPrevented || from.owner !== owner) return;
    const element = event.currentTarget;
    const box = element.getBoundingClientRect();
    if (element.offsetWidth !== from.width || element.offsetHeight !== from.height) return;
    const dx = (event.clientX - box.left) * from.across - from.x;
    const dy = (event.clientY - box.top) * from.down - from.y;
    const went = swipe(launcher, false, from.width, from.height, from.x, from.y, dx, dy);
    if (went === "SwipeBack") {
      event.preventDefault();
      void alpha.back();
    } else if (went === "SwipeHome") {
      event.preventDefault();
      void alpha.runtime.runPromise(home());
    }
  };
  const inert = layers !== undefined && pageInert(layers);
  const comms = isCommsView(showing);
  const side = showing === undefined && canvas?.landscape === true && coarsePointer;
  const fullScreen = state.assistant === "Full" && !side;
  const strip = comms && fullScreen;
  const back = can({ type: "goBack" });
  const canGoBack = String(back || (layers !== undefined && takesBack(layers)));
  return (
    <main
      data-alpha-launcher={launcher ? "" : undefined}
      ref={frame}
      onPointerDown={beginSwipe}
      onPointerUp={swiped}
      onPointerCancel={(event) => { if (startedRef.current?.id === event.pointerId) startedRef.current = undefined; }}
      style={canvas?.covered ? { height: canvas.visible } : undefined}
      className={cn("relative mx-auto flex h-dvh w-full flex-col overflow-hidden bg-background font-sans text-base text-foreground has-[[data-alpha-camera-native]]:bg-transparent sm:pointer-fine:max-w-103", side && "flex-row")}
    >
      <div
        data-alpha-shell-page=""
        data-alpha-comms-stage={comms ? "" : undefined}
        ref={(node) => {
          const document = node?.ownerDocument.documentElement;
          if (document && document.dataset.alphaCanGoBack !== canGoBack) document.dataset.alphaCanGoBack = canGoBack;
        }}
        className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", showing !== undefined && "overflow-auto overscroll-contain", strip && "overflow-hidden")}
        inert={inert || fullScreen}
      >
        {comms && alpha.slot("phone/stage")}
        {page === undefined || !editorsMounted(page) ? null : showing === undefined
          ? alpha.slot("home")
          : (
            <div key={showing} className="flex min-h-0 flex-1 flex-col motion-safe:animate-rise">
              {!viewHasHeader(showing) && <AppHeader
                title={views[showing].label}
                leading={back && <AppBack alpha={alpha} />}
                className="shrink-0"
              />}
              {alpha.slot(`view:${showing}`)}
            </div>
          )}
      </div>
      <div
        data-alpha-assistant-host=""
        hidden={!askAlphaDrawn(state)}
        className={cn(
          comms && "shrink-0",
          !comms && "[&>[data-alpha-detent]]:absolute [&>[data-alpha-detent]]:inset-x-0 [&>[data-alpha-detent]]:bottom-0 [&>[data-alpha-detent]]:max-w-none",
          side && [
            "relative flex w-[min(400px,46%)] shrink-0 flex-col justify-end",
            "[&>[data-alpha-detent=sheet]]:inset-0 [&>[data-alpha-detent=sheet]]:h-full [&>[data-alpha-detent=sheet]]:max-h-full",
            "[&>[data-alpha-detent=full]]:inset-0",
          ],
        )}
        inert={layers !== undefined && assistantInert(layers)}
      >
        {alpha.slot("assistant")}
      </div>
      {alpha.slot("overlay")}
      {alpha.slot("notice")}
    </main>
  );
}
