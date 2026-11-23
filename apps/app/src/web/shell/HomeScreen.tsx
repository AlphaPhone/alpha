// spec/shell/index.md, "Story: Open an app from Home and keep my place"; spec/shell/navigation.md, "Story: Use the library and arrange Home"; spec/shell/overview.md, "Story: See my day on Home"; spec/shell/gestures.md, "A pull asks for Android's shade only on empty launcher Home"
import { Bell, LayoutGrid, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { overflowPull } from "../../../gen/shell__gestures.ts";
import type { Overview } from "../../../gen/shell__overview.ts";
import type { AppId } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { launcherFocusRing, type TileFace } from "./AppTile.tsx";
import { OverviewCards } from "./OverviewCards.tsx";
import { TileGrid, type GestureControls } from "./TileGrid.tsx";

/** Home: the overview, the agenda and attention slots, the tiles and the launcher controls. */
export interface HomeScreenProps {
  overview: Overview;
  /** Calendar's card of the next event, shown in place of the overview's own event card. */
  agenda?: ReactNode;
  /** What Home's other sources have that is new, such as missed calls and messages on the image. */
  attention?: ReactNode;
  /** Home's tiles in the owner's order. */
  tiles: readonly TileFace[];
  /** Home's edit mode. */
  editing?: boolean;
  /** The launcher's last error while editing, such as a favorite that could not be saved. */
  editError?: string;
  /** The Add sheet has an Alpha app to offer. */
  canAdd?: boolean;
  /** The library exists: installed apps are read on this device. */
  library?: boolean;
  /** Home's notifications control: the launcher on Android, or the development stand-in. */
  notifications?: boolean;
  /** The entry being opened through Android. */
  launching?: string | null;
  /** Home is covered by a layer, the shade or the conversation. */
  covered?: boolean;
  /** A pull on Home may ask for Android's shade now: launcher Home, unlocked, with nothing over it. */
  pullEligible?: boolean;
  controls: GestureControls;
  onOpen: (app: AppId) => void;
  onLibrary: () => void;
  onAdd: () => void;
  onDone: () => void;
  onNotifications: () => void;
}

/** The 44-pixel status band at the top is Android's. */
const STATUS_BAND = 44;

/**
 * Home's part of the shade pull: whether Home fits its screen, and on a Home taller than the screen, a touch that starts at its
 * top below the status band, away from a field or tile, claims a downward pull once it has moved six pixels, so the WebView
 * does not take the drag for scrolling and the shell sees the pull end (spec/shell/gestures.md, `overflowPull`).
 */
function useHomePull(eligible: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const [fits, setFits] = useState(true);
  const live = useRef(eligible);
  useEffect(() => { live.current = eligible; }, [eligible]);
  useEffect(() => {
    const home = ref.current;
    if (home === null) return;
    const measure = () => setFits(home.scrollHeight <= home.clientHeight);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(home);
    for (const child of Array.from(home.children)) observer?.observe(child);
    let touch: { readonly x: number; readonly y: number; claimed: boolean } | undefined;
    const start = (event: TouchEvent) => {
      const at = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const armed = event.touches.length === 1 && at !== undefined && live.current && home.scrollTop <= 0 && at.clientY >= STATUS_BAND &&
        home.scrollHeight > home.clientHeight && !target?.closest("[data-alpha-tile],button,input,textarea,[contenteditable]");
      touch = armed ? { x: at.clientX, y: at.clientY, claimed: false } : undefined;
    };
    const move = (event: TouchEvent) => {
      const at = event.touches[0];
      if (touch === undefined || at === undefined) return;
      if (touch.claimed) {
        event.preventDefault();
        return;
      }
      const claim = overflowPull(live.current, Math.round(at.clientX - touch.x), Math.round(at.clientY - touch.y));
      if (claim === "ClaimPull") {
        touch.claimed = true;
        event.preventDefault();
      } else if (claim === "ReleasePull") touch = undefined;
    };
    const end = () => { touch = undefined; };
    home.addEventListener("touchstart", start, { passive: true });
    home.addEventListener("touchmove", move, { passive: false });
    home.addEventListener("touchend", end);
    home.addEventListener("touchcancel", end);
    return () => {
      observer?.disconnect();
      home.removeEventListener("touchstart", start);
      home.removeEventListener("touchmove", move);
      home.removeEventListener("touchend", end);
      home.removeEventListener("touchcancel", end);
    };
  }, []);
  return { ref, fits };
}

/**
 * Home: the daily overview above Alpha's and the owner's tiles, the library tile, and edit mode's bar.
 * @model spec/shell/navigation.md
 */
export function HomeScreen({
  overview, agenda, attention, tiles, editing = false, editError = "", canAdd = false, library = false, notifications = false, launching = null, covered = false,
  pullEligible = false, controls, onOpen, onLibrary, onAdd, onDone, onNotifications,
}: HomeScreenProps) {
  const fits = useHomePull(pullEligible);
  return (
    <section
      ref={fits.ref}
      aria-label="Home"
      data-alpha-layer="home"
      data-alpha-focus-target="home"
      data-alpha-home-fits={fits.fits || undefined}
      inert={covered || undefined}
      className="flex h-full flex-col gap-6 overflow-y-auto pt-4"
      // Home that fits gives vertical drags to the page, so a pull reaches the shell rather than the WebView's overscroll.
      style={{ paddingBottom: "var(--alpha-dock-clearance, 7rem)", scrollPaddingBottom: "var(--alpha-dock-clearance, 7rem)", touchAction: fits.fits ? "pan-x pinch-zoom" : undefined }}
    >
      {notifications && !editing && (
        <div className="flex justify-end px-3">
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications" data-alpha-notifications onClick={onNotifications}>
            <Bell aria-hidden className="size-5" />
          </Button>
        </div>
      )}
      {editing ? (
        <div className="flex flex-col gap-2 px-4" data-alpha-header>
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" size="icon" aria-label="Add to Home" aria-haspopup="dialog" disabled={!canAdd} onClick={onAdd}>
              <Plus aria-hidden className="size-5" />
            </Button>
            <Button onClick={onDone}>Done</Button>
          </div>
          {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
        </div>
      ) : (
        <>
          <OverviewCards overview={overview} agenda={agenda} onOpen={onOpen} />
          {attention}
        </>
      )}
      <TileGrid label="Apps on Home" faces={tiles} editing={editing} launching={launching} controls={controls} />
      {library && !editing && (
        <div className="px-3">
          <button type="button" aria-haspopup="dialog" onClick={onLibrary} data-alpha-focus="tile:library"
            className={cn(launcherFocusRing, "flex min-h-24 w-24 flex-col items-center gap-2 rounded-lg p-2 text-sm")}>
            <span className="flex size-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <LayoutGrid aria-hidden className="size-7" />
            </span>
            Apps
          </button>
        </div>
      )}
    </section>
  );
}
