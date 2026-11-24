// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back"; spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"
import { Alert, AppHeader, Button } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import { type PointerEvent, useRef } from "react";
import { useMachine } from "../gen/app__shell.react.ts";
import { useMachine as useLayers } from "../gen/app__shell__layers.react.ts";
import { assistantInert, pageInert, takesBack } from "../gen/app__shell__layers.ts";
import { swipe } from "../gen/app__shell__gestures.ts";
import type { Alpha } from "./runtime/area.tsx";
import { views } from "./shell/views.tsx";

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
  const started = useRef<{ x: number; y: number } | undefined>(undefined);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const swiped = (event: PointerEvent<HTMLElement>) => {
    const from = started.current;
    started.current = undefined;
    const page = event.currentTarget.getBoundingClientRect();
    if (from && swipe(false, false, page.width, page.height, from.x, from.y, event.clientX - from.x, event.clientY - from.y) === "SwipeBack") void alpha.back();
  };
  const inert = layers !== undefined && pageInert(layers);
  const showing = state.trail.at(-1);
  const back = can({ type: "goBack" });
  return (
    <main
      ref={(page) => { if (page) page.ownerDocument.documentElement.dataset.alphaCanGoBack = String(back || (layers !== undefined && takesBack(layers))); }}
      onPointerDown={(event) => { started.current = { x: event.clientX - event.currentTarget.getBoundingClientRect().left, y: event.clientY }; }}
      onPointerUp={swiped}
      className="mx-auto flex min-h-dvh max-w-md flex-col bg-background font-sans text-base text-foreground"
    >
      <div className="flex flex-1 flex-col" inert={inert}>
        {showing === undefined
          ? alpha.slot("home")
          : (
            <>
              <AppHeader
                title={views[showing].label}
                leading={back && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void alpha.back()}><ChevronLeft /></Button>}
              />
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
