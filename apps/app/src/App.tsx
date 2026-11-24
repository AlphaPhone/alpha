// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back"; spec/app/shell/gestures.md, "On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe"; spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { Alert, AppHeader } from "@repo/ui";
import { type PointerEvent, useRef } from "react";
import { useMachine } from "../gen/app__shell.react.ts";
import { useMachine as useCanvas } from "../gen/app__shell__keyboard.react.ts";
import { useMachine as useLayers } from "../gen/app__shell__layers.react.ts";
import { assistantInert, pageInert, takesBack } from "../gen/app__shell__layers.ts";
import { barHeight, edge, swipe } from "../gen/app__shell__gestures.ts";
import { useMachine as usePage } from "../gen/app__update__page.react.ts";
import { editorsMounted } from "../gen/app__update__page.ts";
import type { Alpha } from "./runtime/area.tsx";
import { AppBack } from "./shell/AppBack.tsx";
import { home } from "./shell/shell.vibe";
import { viewHasHeader, views } from "./shell/views.tsx";

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
  const startedRef = useRef<StartedSwipe | undefined>(undefined);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const showing = state.trail.at(-1);
  const owner = `${showing ?? "home"}:${state.assistant}:${state.drawer}:${launcher}`;
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
  const back = can({ type: "goBack" });
  return (
    <main
      data-alpha-launcher={launcher ? "" : undefined}
      ref={(page) => { if (page) page.ownerDocument.documentElement.dataset.alphaCanGoBack = String(back || (layers !== undefined && takesBack(layers))); }}
      onPointerDown={beginSwipe}
      onPointerUp={swiped}
      onPointerCancel={(event) => { if (startedRef.current?.id === event.pointerId) startedRef.current = undefined; }}
      style={canvas?.covered ? { height: canvas.visible } : undefined}
      className="relative mx-auto flex h-dvh w-full flex-col overflow-hidden bg-background font-sans text-base text-foreground sm:pointer-fine:max-w-103"
    >
      <div className="relative flex min-h-0 flex-1 flex-col" inert={inert}>
        {page === undefined || !editorsMounted(page) ? null : showing === undefined
          ? alpha.slot("home")
          : (
            <>
              {!viewHasHeader(showing) && <AppHeader
                title={views[showing].label}
                leading={back && <AppBack alpha={alpha} />}
                className="shrink-0"
              />}
              {alpha.slot(`view:${showing}`)}
            </>
          )}
      </div>
      <div inert={layers !== undefined && assistantInert(layers)}>{alpha.slot("assistant")}</div>
      {alpha.slot("overlay")}
      {alpha.slot("notice")}
    </main>
  );
}
