// spec/app/home/index.md, "Story: Open an app"; spec/app/home/index.md, "On the assistant alone Home shows no tile and no card"; spec/app/home/index.md, "Story: Edit Home"; spec/app/home/index.md, "Story: Find an app and see its details"; spec/app/home/index.md, "Story: Pull down for notifications"
import type { InstalledApp } from "@elizaos/os/bridges/definitions/system";
import { AppsDrawer, HomeScreen, type HomeInstalledApp, type HomeTileItem, InstalledAppIcon } from "@repo/ui";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import * as Home from "../../gen/app__home.ts";
import { useMachine as useHome } from "../../gen/app__home.react.ts";
import { type Tile, badged, saving } from "../../gen/app__home__tiles.ts";
import type { View } from "../../gen/app__shell.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { feel } from "../shell/haptics.vibe";
import { views } from "../shell/views.tsx";
import { Agenda } from "./Agenda.tsx";
import { MailOnHome } from "./Mail.tsx";
import { catalog, labelOf } from "./catalog.vibe";
import { told } from "./home.vibe";
import { launcherHeld, openNotifications, watchHomePull } from "./pull.vibe";
import { waiting } from "./waiting.vibe";
import type { HomeMachines } from "./index.tsx";

const owner = "Owner" as const;

/** A tile's id on the screen: `view:<View>` for one of Alpha's own apps, `app:<key>` for an installed one. */
/** The drawer's view on a phone; off it there is no drawer, which shows a spinner until the shell closes it. */
const drawerView = (view: Home.Drawer) => (view === "NotOnPhone" ? "Spinner" : view);

const idOf = (tile: Tile): string => (tile.tag === "Own" ? `view:${tile.view}` : `app:${tile.app}`);

const tileOf = (id: string): Tile => (id.startsWith("view:") ? { tag: "Own", view: id.slice("view:".length) as View } : { tag: "Installed", app: id.slice("app:".length) });

const imageOf = (app: InstalledApp | undefined): string | undefined =>
  app?.icon ? (app.icon.startsWith("data:") ? app.icon : `data:image/png;base64,${app.icon}`) : undefined;

function tileItem(tile: Tile, known: ReadonlyMap<string, InstalledApp>, said?: string, editing = false): HomeTileItem {
  if (tile.tag === "Own") {
    const Glyph = views[tile.view].icon;
    const badge = badged(tile, said !== undefined, editing) ? said : undefined;
    return { id: idOf(tile), label: views[tile.view].label, icon: <Glyph className="size-7.5" />, ...(badge ? { badge } : {}) };
  }
  return { id: idOf(tile), label: labelOf(tile.app), icon: <InstalledAppIcon image={imageOf(known.get(tile.app))} /> };
}

/** Home: the day, its cards, the tiles kept on it and the Apps drawer, each control offered exactly when the rules allow its event. */
export function HomePage({ runtime, alpha }: Shown<HomeMachines | Resident>) {
  const home = useHome(runtime);
  const shell = useShell(alpha.runtime);
  const known = useSyncExternalStore(catalog.subscribe, catalog.snapshot, catalog.snapshot);
  const inline = useSyncExternalStore(told.subscribe, told.snapshot, told.snapshot);
  const waits = useSyncExternalStore(waiting.subscribe, waiting.snapshot, waiting.snapshot);
  const h = home.state;
  const s = shell.state;
  const canPull = s !== undefined && home.can({ type: "pullDown", shell: s, locked: false, now: untimed }, owner);
  const homeScroller = useCallback((node: HTMLDivElement | null) => {
    if (node && canPull) return watchHomePull(node, () => { void runtime.runPromise(openNotifications()); });
  }, [canPull, runtime]);
  const hold = useCallback((held: () => void) => {
    const fiber = alpha.runtime.runFork(launcherHeld(held));
    return () => fiber.interruptUnsafe();
  }, [alpha]);
  const drawerOpen = s?.drawer ?? false;
  const apps = useMemo((): HomeInstalledApp[] => drawerOpen && h ? [...Home.listing(h)].map((key) => {
    const app = known.apps.get(key);
    return { id: key, label: app?.label ?? key, detail: known.details.get(key)?.join(" · "), image: imageOf(app), onHome: Home.isOnHome(h, key) };
  }) : [], [drawerOpen, h, known]);
  if (!h || !s || h.host === "AssistantOnly") return null;
  const can = (event: Home.Event) => home.can(event, owner);
  const send = (event: Home.Event) => void home.send(event, owner);
  const offered = (event: Home.Event) => (can(event) ? () => send(event) : undefined);
  const notice = inline && inline.place === Home.noticeAt(h, s) ? inline.notice : undefined;
  const beginEditing = { type: "beginEditing", shell: s } as const;
  const opening = h.handoff.ask.tag === "OpenApp" && h.handoff.attempt.outcome === "Sent" ? h.handoff.ask.app : undefined;
  const menu = Home.menuApp(h.menu);
  const mayEdit = !saving(h.tiles);
  return (
    <>
      <HomeScreen
        covered={s.drawer}
        cards={Home.showsCards(h) ? [<Agenda key="agenda" runtime={runtime} />, <div key="others" className="contents">{alpha.slot("home/cards")}</div>, <MailOnHome key="mail" runtime={alpha.runtime} />] : []}
        tiles={h.tiles.load.status === "Loaded" ? Home.tilesShown(h, s).map((tile) => tileItem(tile, known.apps, tile.tag === "Own" ? waits.get(tile.view) : undefined, h.editing)) : undefined}
        editing={h.editing}
        onOpenTile={(id) => {
          const tile = tileOf(id);
          const event: Home.Event = tile.tag === "Own" ? { type: "openTile", view: tile.view, shell: s } : { type: "openApp", app: tile.app, now: untimed };
          if (can(event)) send(event);
        }}
        onBeginEditing={can(beginEditing) ? () => {
          send(beginEditing);
          void alpha.runtime.runPromise(feel("LongPress"));
        } : undefined}
        hold={hold}
        onRemoveTile={mayEdit ? (id) => offered({ type: "removeFromHome", tile: tileOf(id), shell: s })?.() : undefined}
        onMoveTile={mayEdit ? ({ id, onto, behind }) => offered({ type: "moveTile", tile: tileOf(id), onto: tileOf(onto), behind, shell: s })?.() : undefined}
        onOpenDrawer={Home.offersDrawer(h) && shell.can({ type: "openDrawer" }) ? () => void shell.send({ type: "openDrawer" }) : undefined}
        scrollRef={homeScroller}
        onShowHidden={offered({ type: "showHidden", shell: s })}
        onDone={offered({ type: "done" })}
        notice={notice}
        adding={h.adding}
        hidden={Home.hiddenApps(h, s).map((view) => tileItem({ tag: "Own", view }, known.apps))}
        onAddToHome={mayEdit ? (id) => offered({ type: "addToHome", tile: tileOf(id), shell: s })?.() : undefined}
        onCloseAdding={() => offered({ type: "backOut" })?.()}
      />
      {s.drawer ? (
        <AppsDrawer
          className="absolute inset-x-0 top-0 bottom-0 z-sheet"
          view={drawerView(Home.drawer(h))}
          apps={apps}
          refreshing={h.installed.read.status === "Loading" && apps.length > 0}
          query={h.query}
          onSearch={(query) => offered({ type: "search", query, shell: s })?.()}
          onClose={() => void alpha.back()}
          onOpenApp={h.handoff.attempt.outcome === "Sent" ? undefined : (app) => offered({ type: "openApp", app, now: untimed })?.()}
          opening={opening}
          menu={menu === "" ? undefined : menu}
          onOpenMenu={(app) => {
            const event = { type: "openMenu", app, shell: s } as const;
            if (can(event)) {
              send(event);
              void alpha.runtime.runPromise(feel("LongPress"));
            }
          }}
          hold={hold}
          onCloseMenu={() => offered({ type: "backOut" })?.()}
          onAddToHome={mayEdit ? (app) => offered({ type: "addToHome", tile: { tag: "Installed", app }, shell: s })?.() : undefined}
          onTryAgain={offered({ type: "tryAgain", shell: s })}
          onShowAppInfo={(app) => offered({ type: "showAppInfo", app, shell: s, now: untimed })?.()}
          notice={notice}
        />
      ) : null}
    </>
  );
}
