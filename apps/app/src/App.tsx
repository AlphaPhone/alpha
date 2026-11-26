// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/index.md, "On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises"; spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back"; spec/app/shell/gestures.md, "On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe"; spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { Alert, AppHeader, StartupFailureScreen, StartupMark, cn } from "@repo/ui";
import { type PointerEvent, type TouchEvent, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useMachine } from "../gen/app__shell.react.ts";
import { type View, adjacentAskSheet, askAlphaDrawn } from "../gen/app__shell.ts";
import { useMachine as useCanvas } from "../gen/app__shell__keyboard.react.ts";
import { useMachine as useLayers } from "../gen/app__shell__layers.react.ts";
import { assistantInert, pageInert, takesBack } from "../gen/app__shell__layers.ts";
import { useMachine as useAccess } from "../gen/app__startup__access.react.ts";
import { completed as accessCompleted, coveredAt as accessCoveredAt, panel as accessPanel } from "../gen/app__startup__access.ts";
import { barHeight, edge, swipe } from "../gen/app__shell__gestures.ts";
import { useMachine as usePage } from "../gen/app__update__page.react.ts";
import { dialogShown, editorsMounted } from "../gen/app__update__page.ts";
import { BrowserFrames } from "./browser/BrowserFrames.tsx";
import { addLayerAt } from "./home/addHome.vibe";
import { coarsePointer, desktopPreview, landscapeHomeInput, watchPrimaryPointer } from "./shell/canvas.vibe";
import { native } from "./platform/device.vibe";
import type { Alpha } from "./runtime/area.tsx";
import { AppBack } from "./shell/AppBack.tsx";
import { measureChrome, watchChrome } from "./shell/chrome.vibe";
import { home } from "./shell/shell.vibe";
import { isCommsView, viewHasHeader, views } from "./shell/views.tsx";
import { canLeaveSignInStep, SignIn, useFirstRun } from "./startup/SignIn.tsx";
import { AccessWalkthrough } from "./startup/SettingsAccess.tsx";
import { firstFrame } from "./startup/cover.vibe";
import { reloadBeforeMount } from "./startup/recovery.vibe";

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
  touch?: {
    target: Element;
    identifier?: number;
    pointerCanceled?: true;
    scrolled: () => boolean;
  };
};

/** A swipe can belong to the shell only while the touched surface has not panned. */
function touchScroll(target: Element, shell: HTMLElement) {
  const vertical: { element: Element; top: number }[] = [];
  for (let element: Element | null = target; element && element !== shell; element = element.parentElement) {
    const style = getComputedStyle(element);
    const touchAction = style.touchAction ?? "";
    if (touchAction === "none" || /pan-(x|left|right)/.test(touchAction)
      || ((style.overflowX === "auto" || style.overflowX === "scroll") && element.scrollWidth > element.clientWidth)) return;
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && element.scrollHeight > element.clientHeight) {
      vertical.push({ element, top: element.scrollTop });
    }
  }
  return () => vertical.some(({ element, top }) => element.scrollTop !== top);
}

/**
 * Alpha: Home, or the app on top of the trail under its title, with Back offered exactly when the rules allow it, and
 * over them Ask Alpha, whatever covers the screen, and the notices. Each screen is its area's, drawn at its place.
 * One startup cover, the white page with the Alpha mark, stays over it until what shows under it is ready, kept at one
 * place so its fade never starts over: v119 drew one cover for the whole start (45f6bed30 apps/app/src/main.tsx:357).
 * The apps share one layer, as v119's did (45f6bed30 prototype/template.html:130): it rises over Home when an app opens
 * from Home, with Home showing under it until the rise ends; an app opened from another, and Back, swap in it at once.
 * @model spec/app/shell/index.md
 */
export function App({ alpha }: AppProps) {
  const { state, cause, can } = useMachine(alpha.runtime);
  const layers = useLayers(alpha.runtime).state;
  const page = usePage(alpha.runtime).state;
  const canvas = useCanvas(alpha.runtime).state;
  const fitted = useSyncExternalStore(desktopPreview.subscribe, desktopPreview.snapshot, () => undefined);
  const phone = native();
  const preview = phone ? undefined : fitted;
  const launcher = canvas?.launcher ?? false;
  const coarse = useSyncExternalStore(watchPrimaryPointer, coarsePointer, () => false);
  const startedRef = useRef<StartedSwipe | undefined>(undefined);
  const frame = useCallback((node: HTMLElement | null) => {
    if (node) return watchChrome(node, (event) => { void alpha.runtime.runPromise(measureChrome(event)); });
  }, [alpha]);
  const updating = page !== undefined && dialogShown(page);
  const { read: signedIn, flow: signInFlow } = useFirstRun(alpha, state !== undefined && cause === undefined && page !== undefined && editorsMounted(page) && !updating);
  const signingIn = alpha.requiresSignIn && signedIn?.stage !== "Admitted";
  const access = useAccess(alpha.runtime).state;
  const enrolled = alpha.requiresSignIn && signedIn?.accountConfirmed === true;
  const accessCovered = !state || cause !== undefined || !page || !layers
    || accessCoveredAt(state, pageInert(layers), updating || !editorsMounted(page));
  const accessHolding = enrolled && (!access || !access.begun || !accessCompleted(access) || access.finish.allSet);
  const accessMayShow = accessHolding && !accessCovered;
  const accessStage = access !== undefined && accessPanel(access);
  const accessShowing = accessMayShow && (accessStage === "Walkthrough" || accessStage === "AllSet");
  const [homeShown, setHomeShown] = useState(false);
  const homeLayer = useCallback((node: HTMLDivElement | null) => {
    const main = node?.closest("main");
    if (!main || homeShown) return;
    const stop = new AbortController();
    void alpha.runtime.runPromise(firstFrame(main), { signal: stop.signal }).then(() => setHomeShown(true), () => undefined);
    return () => stop.abort();
  }, [alpha, homeShown]);
  const [risen, setRisen] = useState<{ view: View | undefined; overHome: boolean }>({ view: undefined, overHome: false });
  const pageReady = state !== undefined && cause === undefined && page !== undefined && editorsMounted(page) && !updating;
  const signInWaits = signingIn && (!signedIn || signedIn.stage === "Checking" || !signInFlow);
  const cover = !updating && cause === undefined
    && (!pageReady || signInWaits || (accessMayShow && !accessShowing) || (!signingIn && !accessHolding && !homeShown))
    ? <StartupMark key="startup" className="fixed inset-0 z-sheet" /> : null;
  if (!state) {
    if (updating) return <>{alpha.slot("overlay")}</>;
    return cause
      ? <StartupFailureScreen kind="FailedToStart" platform={phone ? "android" : "web"} version="Unavailable" onReload={reloadBeforeMount} />
      : <>{null}{cover}</>; // the cover keeps its place beside main, so its fade never starts over
  }
  const shellFailed = cause !== undefined;
  const showing = state.trail.at(-1);
  if (risen.view !== showing) setRisen({ view: showing, overHome: risen.view === undefined || risen.overHome });
  const overHome = risen.view === showing && risen.overHome;
  const owner = `${showing ?? "home"}:${state.assistant}:${launcher}:${state.textAskThrough}`;
  const beginSwipe = (event: PointerEvent<HTMLElement>) => {
    if (shellFailed || signingIn || accessHolding || state.textAsk.tag === "TextAskVisit" || !event.isPrimary || event.button !== 0 || event.defaultPrevented) return;
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
    if (x >= edge && x <= width - edge && (!launcher || y <= height - barHeight)) return;
    const from: StartedSwipe = { id: event.pointerId, x, y, width, height, across, down, owner };
    if (event.pointerType === "touch" && target instanceof Element) {
      const scrolled = touchScroll(target, element);
      if (!scrolled) return;
      from.touch = { target, scrolled };
    }
    startedRef.current = from;
  };
  const finishSwipe = (from: StartedSwipe, element: HTMLElement, clientX: number, clientY: number, claim?: () => void) => {
    if (shellFailed || from.owner !== owner || from.touch?.scrolled()) return;
    const box = element.getBoundingClientRect();
    if (element.offsetWidth !== from.width || element.offsetHeight !== from.height) return;
    const dx = (clientX - box.left) * from.across - from.x;
    const dy = (clientY - box.top) * from.down - from.y;
    const went = swipe(launcher, false, from.width, from.height, from.x, from.y, dx, dy);
    if (went === "SwipeBack") {
      claim?.();
      void alpha.back();
    } else if (went === "SwipeHome") {
      claim?.();
      void alpha.runtime.runPromise(home());
    }
  };
  const swiped = (event: PointerEvent<HTMLElement>) => {
    const from = startedRef.current;
    if (!event.isPrimary || from?.id !== event.pointerId) return;
    startedRef.current = undefined;
    if (!event.defaultPrevented) finishSwipe(from, event.currentTarget, event.clientX, event.clientY, () => event.preventDefault());
  };
  const touchStarted = (event: TouchEvent<HTMLElement>) => {
    const touch = startedRef.current?.touch;
    if (!touch) return;
    if (event.defaultPrevented || event.touches.length !== 1 || touch.target !== event.target) {
      startedRef.current = undefined;
      return;
    }
    touch.identifier = event.touches[0]?.identifier;
  };
  const pointerCanceled = (event: PointerEvent<HTMLElement>) => {
    const from = startedRef.current;
    if (from?.id !== event.pointerId) return;
    // Chromium can stop delivering Pointer Events while the same finger still sends Touch Events.
    if (from.touch?.identifier !== undefined) from.touch.pointerCanceled = true;
    else startedRef.current = undefined;
  };
  const touchEnded = (event: TouchEvent<HTMLElement>) => {
    const from = startedRef.current;
    if (!from?.touch?.pointerCanceled) return;
    startedRef.current = undefined;
    if (event.defaultPrevented || event.touches.length !== 0) return;
    const ended = Array.from(event.changedTouches).find((touch) => touch.identifier === from.touch?.identifier);
    if (ended) finishSwipe(from, event.currentTarget, ended.clientX, ended.clientY);
  };
  const inert = shellFailed || (layers !== undefined && pageInert(layers));
  const comms = isCommsView(showing);
  const side = state.textAsk.tag === "NoTextAsk" && showing === undefined && canvas?.landscape === true && (phone || coarse);
  const nativeHomeSide = phone && side;
  const inboxLandscapeBar = !phone && showing === "Inbox" && state.assistant === "Bar" && state.textAsk.tag === "NoTextAsk"
    && canvas?.landscape === true && coarse;
  const fullScreen = state.assistant === "Full" && (phone || !side);
  const sheetBeside = layers !== undefined && !shellFailed && (!inert || addLayerAt(layers, state.route, true) !== undefined)
    && adjacentAskSheet(state, landscapeHomeInput(canvas));
  const voiceOverHome = phone && side && canvas?.voice === true;
  const strip = comms && fullScreen;
  const back = !shellFailed && can({ type: "goBack" });
  const canGoBack = String(!shellFailed && (accessMayShow || (signingIn ? canLeaveSignInStep(signedIn, signInFlow)
    : back || state.textAsk.tag === "TextAskVisit" || (layers !== undefined && takesBack(layers)))));
  const frameStyle = preview
    ? { left: preview.left, top: preview.top, width: preview.width, height: preview.height, transform: `scale(${preview.scale})`, transformOrigin: "top left" }
    : canvas?.covered ? { height: canvas.visible } : undefined;
  return (
    <>
      <main
        data-alpha-native={phone ? "" : undefined}
        data-alpha-launcher={launcher ? "" : undefined}
        data-alpha-desktop-preview={preview ? "" : undefined}
        ref={frame}
        onPointerDown={beginSwipe}
        onPointerUp={swiped}
        onPointerCancel={pointerCanceled}
        onTouchStart={touchStarted}
        onTouchEnd={touchEnded}
        onTouchCancel={() => { if (startedRef.current?.touch) startedRef.current = undefined; }}
        style={frameStyle}
        className={cn("relative mx-auto flex h-dvh w-full flex-col overflow-hidden bg-background font-sans text-base text-foreground [--alpha-call-inset-top:max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))] has-[[data-alpha-camera-native]]:bg-transparent has-[[data-alpha-call-strip=over]]:pt-[calc(var(--alpha-call-inset-top)_+_4rem)]", showing === "Camera" && "bg-black", !phone && "sm:pointer-fine:max-w-103", side && "flex-row", nativeHomeSide && "gap-4 [--alpha-home-ask-width:min(400px,46%)]", preview && "absolute m-0 rounded-panel")}
      >
        <div
          data-alpha-shell-page=""
          data-alpha-comms-stage={comms ? "" : undefined}
          ref={(node) => {
            const document = node?.ownerDocument.documentElement;
            if (document && document.dataset.alphaCanGoBack !== canGoBack) document.dataset.alphaCanGoBack = canGoBack;
          }}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col in-[main:has([data-alpha-call-strip=over])]:[--alpha-native-inset-top:0px]",
            showing !== undefined && "overflow-auto overscroll-contain",
            strip && "overflow-hidden",
            nativeHomeSide && "[--alpha-dock-overlap:0px]",
            nativeHomeSide && !launcher && "[&_[data-alpha-apps-drawer]]:top-0",
          )}
          inert={signingIn ? updating : inert || fullScreen || voiceOverHome}
        >
          {signingIn && !updating ? <SignIn alpha={alpha} read={signedIn} state={signInFlow} /> : null}
          {!signingIn && !accessHolding && comms && alpha.slot("phone/stage")}
          {signingIn || accessHolding || page === undefined || !editorsMounted(page) ? null : (
            <>
              <div
                key="home"
                ref={homeLayer}
                data-alpha-home-layer=""
                inert={showing !== undefined || undefined}
                className={cn(
                  showing === undefined ? "contents" : "absolute inset-0 isolate flex flex-col",
                  showing !== undefined && (comms || !overHome ? "invisible" : "motion-reduce:invisible"),
                )}
              >
                {alpha.slot("home")}
              </div>
              {showing !== undefined && (
                <div
                  onAnimationEnd={(event) => { if (event.target === event.currentTarget) setRisen((was) => ({ ...was, overHome: false })); }}
                  className={cn("relative flex min-h-0 flex-1 flex-col motion-safe:animate-rise has-[[data-alpha-camera-native]]:bg-transparent", showing === "Camera" ? "bg-black" : "bg-background")}
                >
                  {!viewHasHeader(showing) && <AppHeader
                    title={views[showing].label}
                    leading={back && <AppBack alpha={alpha} />}
                    className="shrink-0"
                  />}
                  {alpha.slot(`view:${showing}`)}
                </div>
              )}
            </>
          )}
          {!phone && <BrowserFrames alpha={alpha} preview={preview} />}
        </div>
        {accessShowing ? <AccessWalkthrough runtime={alpha.runtime} /> : null}
        <div
          data-alpha-assistant-host=""
          hidden={signingIn || accessHolding || !askAlphaDrawn(state)}
          className={cn(
            "in-[body:has([data-alpha-notes-trash-sheet])]:invisible",
            "in-[body:has([data-alpha-subview=photos-clip-editor])]:invisible",
            "in-[body:has([data-alpha-covers-assistant])]:invisible",
            comms && "shrink-0",
            sheetBeside && "[&>[data-alpha-chat-scrim]]:hidden",
            !comms && "[&>[data-alpha-detent]]:absolute [&>[data-alpha-detent]]:inset-x-0 [&>[data-alpha-detent]]:bottom-0 [&>[data-alpha-detent]]:max-w-none",
            phone && canvas?.landscape && showing !== undefined && !comms && [
              "[&&>[data-alpha-detent]]:start-auto [&>[data-alpha-detent]]:w-[min(400px,46%)]",
              "[&&>[data-alpha-detent]:not([data-alpha-detent=bar])]:h-full [&>[data-alpha-detent]:not([data-alpha-detent=bar])]:max-h-full",
              "[&>[data-alpha-detent]:not([data-alpha-detent=bar])]:rounded-none [&>[data-alpha-detent]:not([data-alpha-detent=bar])]:shadow-none",
            ],
            inboxLandscapeBar && "[&&>[data-alpha-detent=bar]]:start-auto [&>[data-alpha-detent=bar]]:w-[min(400px,46%)]",
            side && [
              "relative flex w-[var(--alpha-home-ask-width,min(400px,46%))] shrink-0 flex-col justify-end",
              "[&>[data-alpha-detent=sheet]]:inset-0 [&>[data-alpha-detent=sheet]]:h-full [&>[data-alpha-detent=sheet]]:max-h-full",
              "[&>[data-alpha-detent=full]]:inset-0",
            ],
            nativeHomeSide && [
              "[&>[data-alpha-detent=bar]>[data-host-chrome]]:ml-0",
              "[&>[data-alpha-detent]_[data-alpha-composer]]:min-h-[min(168px,28dvh)] [&>[data-alpha-detent]_[data-alpha-composer]]:rounded-none",
              "[&>[data-alpha-detent]:not([data-alpha-detent=bar])]:h-full! [&>[data-alpha-detent]:not([data-alpha-detent=bar])]:rounded-none [&>[data-alpha-detent]:not([data-alpha-detent=bar])]:shadow-none",
            ],
          )}
          inert={shellFailed || (layers !== undefined && assistantInert(layers))}
        >
          {!signingIn && !accessHolding && alpha.slot("assistant")}
        </div>
        {alpha.slot("overlay")}
        {alpha.slot("notice")}
        {shellFailed && !updating && <Alert variant="destructive" className="absolute inset-x-4 top-3 z-dialog">Alpha could not read where you were</Alert>}
      </main>
      {cover}
    </>
  );
}
