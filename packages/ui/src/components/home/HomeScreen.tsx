import { isValidElement, type ReactNode, type Ref, useCallback } from "react";
import { cn } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";
import { AddToHomeSheet } from "./AddToHomeSheet.tsx";
import { HomeCardRow } from "./HomeCardRow.tsx";
import { HomeEditBar } from "./HomeEditBar.tsx";
import type { HomeNoticeMessage } from "./HomeNotice.tsx";
import { HomeTileGrid, type HomeTileItem, type HomeTileMove } from "./HomeTileGrid.tsx";
import type { LauncherHold } from "./launcherPress.ts";

export type HomeScreenProps = {
  /** The cards drawn above the tiles, in order, each with its key; the row is not drawn without one, keeps its place while cards come and go, and starts again at its first card when that card changes. */
  cards?: readonly ReactNode[];
  /** Cards may still arrive: while none is drawn, the row's height is kept free above the tiles, so a card drawn moments later does not push them down. */
  cardsAwaited?: boolean;
  /** Cards an app draws itself, such as Clock's running timer, in a row of their own under the day's cards; the row is hidden while none draws. */
  appCards?: ReactNode;
  /** The tiles shown, in Home's order; left out until what was saved has been read. */
  tiles?: readonly HomeTileItem[];
  /** Home is being edited. */
  editing?: boolean;
  /** Another launcher surface is over Home. */
  covered?: boolean;
  /** The card rows remain visible while their controls cannot take input. */
  cardsInert?: boolean;
  /** The separately owned app cards cannot take input while Ask is above Home. */
  appCardsInert?: boolean;
  /** The Apps tile remains visible while it cannot take input. */
  drawerInert?: boolean;
  /** The launcher reserves the status bar above the Home cards. */
  launcher?: boolean;
  /** Opens a tile's app; left out where nothing may be opened. */
  onOpenTile?: (id: string) => void;
  /** A press has begun on a tile, before it opens or holds: time to fetch what opening it needs. */
  onPressTile?: (id: string) => void;
  /** Opens the phone's installed Apps drawer. */
  onOpenDrawer?: () => void;
  /** Starts editing from a long press on a tile; left out off the phone, before the tiles are read and under a layer. */
  onBeginEditing?: () => void;
  /** Schedules and cancels a stationary press on a tile. */
  hold?: LauncherHold;
  /** Replaces the tiles' gesture surface when its owning frame or route changes. */
  tileGestureScope?: string;
  /** While editing, takes a tile off Home; left out while a change is being saved. */
  onRemoveTile?: (id: string) => void;
  /** While editing, moves a tile beside another; left out while a change is being saved. */
  onMoveTile?: (move: HomeTileMove) => void;
  /** The Home scroller where the launcher can listen for a pull when Android is free. */
  scrollRef?: Ref<HTMLDivElement>;
  /** Opens Add to Home; left out when it is open or nothing is left to add. */
  onShowHidden?: () => void;
  /** Ends editing. */
  onDone?: () => void;
  /** A failure told while Home is being edited, shown in the edit bar. */
  notice?: HomeNoticeMessage;
  /** Add to Home is open. */
  adding?: boolean;
  /** The frame of a Home sheet that leaves the neighboring Ask pane available. */
  addInFrame?: HTMLElement;
  /** What Add to Home lists: Alpha's own apps this phone admits that Home does not hold. */
  hidden?: readonly Omit<HomeTileItem, "badge">[];
  /** Puts an app back on Home from Add to Home; left out while a change is being saved. */
  onAddToHome?: (id: string) => void;
  /** Closes Add to Home. */
  onCloseAdding?: () => void;
  className?: string;
};

/** Fit the 412-point Home proportions on narrow phones, keeping app faces at least 48px. */
const homeSpacing = "[--alpha-home-spacing:clamp(3px,calc(100cqi/103),var(--spacing))]";
const noop = () => undefined;

/**
 * Home: the day's cards and the owner's tiles; while editing, the edit bar and Add to Home. A pull down on its
 * empty space asks Android for its notifications.
 * @model spec/app/home/index.md
 */
export function HomeScreen({
  cards = [], cardsAwaited = false, appCards, tiles, editing = false, covered = false, cardsInert = false, appCardsInert = cardsInert, drawerInert = false, launcher = false, onOpenTile, onPressTile, onOpenDrawer, onBeginEditing, hold, tileGestureScope, onRemoveTile, onMoveTile, scrollRef,
  onShowHidden, onDone, notice, adding = false, addInFrame, hidden = [], onAddToHome, onCloseAdding = noop, className,
}: HomeScreenProps) {
  const first = String(cards.find(isValidElement)?.key ?? "");
  const startAtFirstCard = useCallback((row: HTMLElement | null) => {
    if (!row || row.dataset.homeFirstCard === first) return;
    row.dataset.homeFirstCard = first;
    row.scrollTo({ left: 0 });
  }, [first]);
  return (
    <div inert={covered || undefined} className={cn("@container flex h-full min-h-0 flex-1 flex-col bg-background text-base text-foreground", className)}>
      <div ref={scrollRef} className={cn(dockClearance, homeSpacing, "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain")}>
        <div className={cn("shrink-0", launcher ? "min-h-[max(calc(var(--alpha-home-spacing)*16),calc(var(--alpha-safe-top)+--spacing(3)))]" : "min-h-[calc(var(--alpha-safe-top)+var(--alpha-home-spacing)*3)]")}>
          <h1 className="sr-only">Home</h1>
        </div>
        {editing ? <HomeEditBar onShowHidden={onShowHidden} onDone={onDone} notice={notice} className="pb-3" /> : null}
        {cards.length > 0 ? (
          <HomeCardRow ref={startAtFirstCard} inert={cardsInert || undefined}>{cards}</HomeCardRow>
        ) : cardsAwaited ? (
          <div aria-hidden data-home-cards-awaited="" className="h-49 shrink-0" />
        ) : null}
        {appCards ? <HomeCardRow inert={appCardsInert || undefined} aria-label={undefined} className={cn((cards.length > 0 || cardsAwaited) && "pt-[calc(var(--alpha-home-spacing)*3)]")}>{appCards}</HomeCardRow> : null}
        <div aria-hidden className="h-[calc(var(--alpha-home-spacing)*6)] shrink-0" />
        {tiles ? (
          <div className="contents" onPointerDownCapture={onPressTile ? (event) => {
            const id = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-home-tile]")?.dataset.homeTile : undefined;
            if (id) onPressTile(id);
          } : undefined}>
          <HomeTileGrid
            tileGestureScope={tileGestureScope}
            tiles={tiles}
            editing={editing}
            onOpen={onOpenTile}
            onOpenDrawer={onOpenDrawer}
            drawerInert={drawerInert}
            onBeginEditing={onBeginEditing}
            hold={hold}
            onRemove={onRemoveTile}
            onMove={onMoveTile}
          />
          </div>
        ) : (
          <div role="status" aria-label="Loading apps" aria-busy className="min-h-24" />
        )}
        <div aria-hidden className="min-h-4 flex-1" />
      </div>
      <AddToHomeSheet open={adding} inFrame={addInFrame} apps={hidden} onAdd={onAddToHome} onClose={onCloseAdding} />
    </div>
  );
}
