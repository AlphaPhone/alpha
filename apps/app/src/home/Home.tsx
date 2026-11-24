// spec/app/home/index.md, "Story: Open an app"; spec/app/home/index.md, "On the assistant alone Home shows no tile and no card"; spec/app/home/index.md, "Story: Edit Home"; spec/app/home/index.md, "Story: Find an app and see its details"; spec/app/home/press.md, "Story: Arrange Home with my fingers"
import type { InstalledApp } from "@elizaos/os/bridges/definitions/system";
import { AppTile, Button, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, SearchField, Sheet, SheetContent, Spinner } from "@repo/ui";
import { Bell, LayoutGrid, Minus } from "lucide-react";
import { type PointerEvent, useRef, useSyncExternalStore } from "react";
import * as Home from "../../gen/app__home.ts";
import { useMachine as useHome } from "../../gen/app__home.react.ts";
import type { Event as PressEvent } from "../../gen/app__home__press.ts";
import { useMachine as usePress } from "../../gen/app__home__press.react.ts";
import type { Tile } from "../../gen/app__home__tiles.ts";
import * as Gestures from "../../gen/app__shell__gestures.ts";
import type { Shell, View } from "../../gen/app__shell.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { views } from "../shell/views.tsx";
import { Agenda } from "./Agenda.tsx";
import { catalog, labelOf, ordered } from "./catalog.vibe";
import type { HomeMachines } from "./index.tsx";
import { keyOfTile } from "./press.vibe";

const owner = "Owner" as const;

/** A finger's start, to tell a press from a scroll and a pull. */
interface Start {
  readonly x: number;
  readonly y: number;
}

function Icon({ app }: { app: InstalledApp | undefined }) {
  return app?.icon ? <img alt="" src={app.icon.startsWith("data:") ? app.icon : `data:image/png;base64,${app.icon}`} className="size-10 rounded-tile" /> : <LayoutGrid className="size-6" />;
}

/** Home: the cards, the tiles kept on it, and the Apps drawer, each control offered exactly when the rules allow its event. */
export function HomeScreen({ runtime, alpha }: Shown<HomeMachines | Resident>) {
  const home = useHome(runtime);
  const shell = useShell(alpha.runtime);
  const press = usePress(runtime);
  const known = useSyncExternalStore(catalog.subscribe, catalog.snapshot, catalog.snapshot);
  const started = useRef<Start | undefined>(undefined);
  const h = home.state;
  const s = shell.state;
  if (!h || !s || h.host === "AssistantOnly") return null;
  const sendHome = (event: Home.Event) => void home.send(event, owner);
  const pressed = (event: PressEvent) => void press.send(event);
  const far = (event: PointerEvent) => started.current !== undefined && Math.hypot(event.clientX - started.current.x, event.clientY - started.current.y) > 10;
  const handlers = (key: string, onMinus = false) => ({
    onPointerDown: (event: PointerEvent) => {
      started.current = { x: event.clientX, y: event.clientY };
      pressed({ type: "down", finger: event.pointerId + 1, key, onMinus, now: untimed });
    },
    onPointerMove: (event: PointerEvent) => press.can({ type: "moveFinger", finger: event.pointerId + 1, far: far(event) }) && pressed({ type: "moveFinger", finger: event.pointerId + 1, far: far(event) }),
    onPointerUp: (event: PointerEvent) => {
      const under = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tile]")?.dataset.tile ?? "";
      if (press.can({ type: "up", finger: event.pointerId + 1, onto: under })) pressed({ type: "up", finger: event.pointerId + 1, onto: under });
    },
    onPointerCancel: (event: PointerEvent) => press.can({ type: "cancel", finger: event.pointerId + 1 }) && pressed({ type: "cancel", finger: event.pointerId + 1 }),
    onContextMenu: (event: PointerEvent) => {
      event.preventDefault();
      if (press.can({ type: "longPress", key })) pressed({ type: "longPress", key });
    },
    onClick: (event: { detail: number; stopPropagation: () => void }) => {
      event.stopPropagation();
      if (press.can({ type: "tap", key, onMinus, keyboard: event.detail === 0 })) pressed({ type: "tap", key, onMinus, keyboard: event.detail === 0 });
    },
  });
  const shown = Home.tilesShown(h, s);
  const tile = (one: Tile) => {
    const key = keyOfTile(one);
    const label = one.tag === "Own" ? views[one.view].label : labelOf(one.app);
    const OwnIcon = one.tag === "Own" ? views[one.view].icon : undefined;
    return (
      <li key={key} data-tile={key} className="relative flex justify-center">
        <AppTile
          label={label}
          icon={OwnIcon ? <OwnIcon className="size-6" /> : <Icon app={one.tag === "Installed" ? known.apps.get(one.app) : undefined} />}
          aria-label={h.editing ? `${label}, move with the arrow keys` : label}
          onKeyDown={(event) => {
            const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
            if (direction !== 0 && press.can({ type: "arrow", key, direction })) pressed({ type: "arrow", key, direction });
            if ((event.key === "Delete" || event.key === "Backspace") && press.can({ type: "erase", key })) pressed({ type: "erase", key });
          }}
          {...handlers(key)}
        />
        {h.editing && home.can({ type: "removeFromHome", tile: one, shell: s }, owner) ? (
          <Button variant="secondary" size="icon" aria-label={`Remove ${label} from Home`} className="absolute -top-2 right-0 size-7" {...handlers(key, true)}>
            <Minus />
          </Button>
        ) : null}
      </li>
    );
  };
  const pull = {
    onPointerDown: (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("[data-tile], button, input")) return;
      started.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = started.current;
      started.current = undefined;
      if (!from) return;
      const allowed = home.can({ type: "pullDown", shell: s, locked: false, now: untimed }, owner);
      if (Gestures.pullOpensShade(allowed, from.y, event.clientX - from.x, event.clientY - from.y, true, false, false, (event.currentTarget as HTMLElement).scrollTop > 0)) {
        sendHome({ type: "pullDown", shell: s, locked: false, now: untimed });
      }
    },
  };
  return (
    <section aria-label="Home" className="flex min-h-dvh flex-col gap-4 overflow-y-auto pb-28" {...pull}>
      {Home.showsCards(h) ? <div className="flex snap-x gap-3 overflow-x-auto px-4 pt-4"><Agenda runtime={runtime} />{alpha.slot("home/cards")}</div> : null}
      <ul aria-label="Apps on Home" className="grid grid-cols-4 gap-x-2 gap-y-6 px-4">{shown.map(tile)}</ul>
      <div className="mt-auto flex justify-center gap-2 px-4">
        {h.editing ? (
          <>
            {home.can({ type: "showHidden", shell: s }, owner) ? <Button variant="secondary" onClick={() => sendHome({ type: "showHidden", shell: s })}>Add to Home</Button> : null}
            {home.can({ type: "done" }, owner) ? <Button onClick={() => sendHome({ type: "done" })}>Done</Button> : null}
          </>
        ) : (
          <>
            {Home.offersDrawer(h) && shell.can({ type: "openDrawer" }) ? <Button variant="secondary" onClick={() => void shell.send({ type: "openDrawer" })}><LayoutGrid />Apps</Button> : null}
            {home.can({ type: "pullDown", shell: s, locked: false, now: untimed }, owner) ? <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => sendHome({ type: "pullDown", shell: s, locked: false, now: untimed })}><Bell /></Button> : null}
          </>
        )}
      </div>
      <AddToHome home={h} shell={s} can={(view) => home.can({ type: "addToHome", tile: { tag: "Own", view }, shell: s }, owner)} onAdd={(view) => sendHome({ type: "addToHome", tile: { tag: "Own", view }, shell: s })} onClose={() => home.can({ type: "backOut" }, owner) && sendHome({ type: "backOut" })} />
      {s.drawer ? <Drawer home={h} shell={s} known={known.apps} details={known.details} send={sendHome} can={(event) => home.can(event, owner)} handlers={handlers} onClose={() => void alpha.back()} /> : null}
    </section>
  );
}

interface AddProps {
  home: Home.Home;
  shell: Shell;
  can: (view: View) => boolean;
  onAdd: (view: View) => void;
  onClose: () => void;
}

// spec/app/home/index.md, "While editing, Add to Home lists Alpha's own apps that this phone admits and Home does not hold, and opens only if there is one"
function AddToHome({ home, shell, can, onAdd, onClose }: AddProps) {
  return (
    <Sheet open={home.adding} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent title="Add to Home">
        <ul className="flex flex-col gap-1">
          {Home.hiddenApps(home, shell).map((view) => (
            <li key={view}>
              <Button variant="ghost" className="w-full justify-start" disabled={!can(view)} onClick={() => onAdd(view)}>
                {(() => { const Glyph = views[view].icon; return <Glyph />; })()}
                {views[view].label}
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

interface DrawerProps {
  home: Home.Home;
  shell: Shell;
  known: ReadonlyMap<string, InstalledApp>;
  details: ReadonlyMap<string, readonly string[]>;
  send: (event: Home.Event) => void;
  can: (event: Home.Event) => boolean;
  handlers: (key: string) => object;
  onClose: () => void;
}

// spec/app/home/index.md, "Off the phone there is no drawer; on it the drawer shows a spinner, that the apps could not be read, that none are installed, that none match the search, or the apps"
function Drawer({ home, shell, known, details, send, can, handlers, onClose }: DrawerProps) {
  const state = Home.drawer(home);
  const menuApp = Home.menuApp(home.menu);
  return (
    <section aria-label="Apps" className="fixed inset-0 z-sheet flex flex-col gap-4 overflow-y-auto bg-background p-4">
      <div className="flex items-center gap-2">
        <SearchField className="flex-1" aria-label="Search apps" value={home.query} onValueChange={(query) => can({ type: "search", query, shell }) && send({ type: "search", query, shell })} />
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {state === "Spinner" ? <Spinner className="mx-auto" label="Loading apps" /> : null}
      {state === "CannotRead" ? <EmptyState title="Couldn't load your apps" /> : null}
      {state === "NoAppsInstalled" ? <EmptyState title="No apps are installed" /> : null}
      {state === "NoMatch" ? <EmptyState title={`No apps match “${home.query}”`} /> : null}
      {state === "Grid" ? (
        <ul aria-label="Installed apps" className="grid grid-cols-4 gap-x-2 gap-y-6">
          {ordered(Home.listing(home), home.query).map((key) => {
            const app = known.get(key);
            const label = app?.label ?? key;
            const detail = details.get(key)?.join(" · ");
            return (
              <li key={key} data-tile={`app:${key}`} className="flex justify-center">
                <Menu open={menuApp === key} onOpenChange={(open) => { if (!open && can({ type: "backOut" })) send({ type: "backOut" }); }}>
                  <MenuTrigger asChild>
                    <AppTile label={detail ? `${label} (${detail})` : label} icon={<Icon app={app} />} {...handlers(`app:${key}`)} />
                  </MenuTrigger>
                  <MenuContent align="center">
                    <MenuItem disabled={!can({ type: "addToHome", tile: { tag: "Installed", app: key }, shell })} onSelect={() => send({ type: "addToHome", tile: { tag: "Installed", app: key }, shell })}>
                      {Home.isOnHome(home, key) ? "On Home" : "Add to Home"}
                    </MenuItem>
                    <MenuItem disabled={!can({ type: "showAppInfo", app: key, shell, now: untimed })} onSelect={() => send({ type: "showAppInfo", app: key, shell, now: untimed })}>App info</MenuItem>
                  </MenuContent>
                </Menu>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
