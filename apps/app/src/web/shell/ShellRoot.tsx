// spec/shell/index.md, "Story: Open an app from Home and keep my place"; spec/shell/navigation.md, "Story: Go back one step at a time"; spec/shell/gestures.md, "Story: Swipe the way the phone expects"; spec/shell/navigation.md, "On Phone, Messages and Contacts the app's own bar stands in for the dock until a conversation opens"
import { Effect } from "effect";
import { useRef, useState, useSyncExternalStore } from "react";
import { useMachine as useNavigation } from "../../../gen/shell__navigation.react.ts";
import { useMachine as useFavorites } from "../../../gen/shell__favorites.react.ts";
import { useMachine as useToasts } from "../../../gen/shell__toasts.react.ts";
import { useMachine as useOverview } from "../../../gen/shell__overview.react.ts";
import { useMachine as usePermissions } from "../../../gen/shell__permissions.react.ts";
import { useMachine as useRecovery } from "../../../gen/shell__recovery.react.ts";
import { useMachine as useAppInfo } from "../../../gen/shell__appInfo.react.ts";
import { appInert, dockShown, initial as navStart, talking, type Nav } from "../../../gen/shell__navigation.ts";
import { initial as favoritesStart } from "../../../gen/shell__favorites.ts";
import { initial as toastsStart } from "../../../gen/shell__toasts.ts";
import { initial as overviewStart } from "../../../gen/shell__overview.ts";
import { initial as permissionsStart } from "../../../gen/shell__permissions.ts";
import { initial as recoveryStart } from "../../../gen/shell__recovery.ts";
import { initial as appInfoStart } from "../../../gen/shell__appInfo.ts";
import { emptyHome, pullOpensShade, swipe } from "../../../gen/shell__gestures.ts";
import { appKey, type InstalledApp } from "@elizaos/os/bridges/system";
import { appOfKey } from "../../shell/apps.vibe";
import { Launcher, addableViews, appInfoText, homeKeys, inventory, launchErrorText, libraryKeys } from "../../shell/launcher.vibe";
import { Navigation, setAppBack } from "../../shell/navigation.vibe";
import { Notices } from "../../shell/notices.vibe";
import { Permissions } from "../../shell/permissions.vibe";
import { Recovery } from "../../shell/recovery.vibe";
import { Shade } from "../../shell/shade.vibe";
import { followSurfaceSheets } from "../../shell/surfaceSheets.vibe";
import { Build } from "../../platform/build.vibe";
import type { AppId, SurfaceSlot } from "../app-screen.ts";
import { useAppearanceClass } from "../settings/index.tsx";
import { runtime } from "../runtime.ts";
import { cn } from "../lib/cn.ts";
import { AddToHomeSheet } from "./AddToHomeSheet.tsx";
import { AppFrame } from "./AppFrame.tsx";
import { AppLibrary } from "./AppLibrary.tsx";
import type { TileFace } from "./AppTile.tsx";
import { HomeScreen } from "./HomeScreen.tsx";
import { RecoveryScreen, diagnosticsOf } from "./RecoveryScreen.tsx";
import { StandInShade } from "./StandInShade.tsx";
import { StartupPermissions } from "./StartupPermissions.tsx";
import { NoticesSlot, ToastRegion } from "./ToastRegion.tsx";
import type { GestureControls } from "./TileGrid.tsx";
import { admittedScreens, allScreens, allSurfaces, homeMounts, onImage, screenOf, surfacesIn, walkthroughMounts } from "./registry.ts";
import { act } from "./services.ts";

const launcher = (f: (l: Launcher.Shape) => Effect.Effect<void>) => act(Effect.flatMap(Effect.service(Launcher), f));
const navigate = (f: (n: Navigation.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Navigation), f));
const openApp = (app: AppId, route?: string) => navigate((n) => n.open(app, route));

function faceOf(key: string, apps: readonly InstalledApp[], details: ReadonlyMap<string, string[]>, admitted: readonly string[]): TileFace | undefined {
  const app = appOfKey(key);
  if (app !== undefined) {
    const screen = screenOf(app, admitted);
    return screen ? { key, label: screen.title, icon: screen.icon } : undefined;
  }
  const entry = apps.find((each) => appKey(each) === key);
  return entry ? { key, label: entry.label || entry.packageName, image: entry.icon, detail: (details.get(key) ?? []).join(" · ") || undefined } : undefined;
}

setAppBack((app) => allScreens.find((screen) => screen.id === app)?.back);

let sheetsFollowed = false;

function followSheets(): void {
  if (sheetsFollowed) return;
  sheetsFollowed = true;
  act(Effect.flatMap(Effect.service(Build), (build) => followSurfaceSheets(allSurfaces.flatMap((surface) =>
    surface.back !== undefined && (surface.availability === "everywhere" || build.info.variant === "aosp") ? [{ id: surface.id, ...surface.back }] : []))));
}

const controls: GestureControls = {
  down: (pointer, key, onRemove) => launcher((l) => l.down(pointer, key, onRemove)),
  move: (pointer, far) => launcher((l) => l.move(pointer, far)),
  up: (pointer, over) => launcher((l) => l.up(pointer, over)),
  cancel: (pointer) => launcher((l) => l.cancel(pointer)),
  context: (key) => launcher((l) => l.context(key)),
  tap: (key, onRemove, keyboard) => launcher((l) => l.tap(key, onRemove, keyboard)),
  arrow: (key, direction) => launcher((l) => l.arrow(key, direction)),
  erase: (key) => launcher((l) => l.erase(key)),
};

function Surfaces({ slot, admitted }: { slot: SurfaceSlot; admitted: readonly string[] }) {
  return <>{surfacesIn(slot, admitted).map(({ id, Surface }) => <Surface key={id} open={openApp} />)}</>;
}

/** The shell root takes nothing: it reads every machine from the one app runtime. */
export type ShellRootProps = Record<string, never>;

/**
 * The phone: Home or the open app, the library, the assistant's dock, the shell's layers, toasts and notices.
 * @model spec/shell/navigation.md
 */
export function ShellRoot() {
  const nav: Nav = useNavigation(runtime).state ?? navStart;
  const favorites = useFavorites(runtime).state ?? favoritesStart;
  const toasts = useToasts(runtime).state ?? toastsStart;
  const overview = useOverview(runtime).state ?? overviewStart;
  const walkthrough = usePermissions(runtime).state ?? permissionsStart;
  const recovery = useRecovery(runtime).state ?? recoveryStart;
  const info = useAppInfo(runtime).state ?? appInfoStart;
  const { snapshot, details } = useSyncExternalStore(inventory.subscribe, inventory.getSnapshot, inventory.getSnapshot);
  const appearance = useAppearanceClass();
  useState(() => {
    followSheets();
    act(Effect.flatMap(Effect.service(Recovery), (r) => r.mounted()));
  });
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  if (recovery.phase !== "Running") {
    return (
      <RecoveryScreen
        diagnostics={diagnosticsOf(recovery.phase === "StartupFailed" ? "startup" : "render", recovery.errorClass, document.documentElement.dataset.alphaVersion ?? "", nav.host === "Standalone" ? "web" : "android", new Date())}
        homeEscape={recovery.homeEscape}
        onReload={() => act(Effect.flatMap(Effect.service(Recovery), (r) => r.reload()))}
        onSwitchHome={() => act(Effect.flatMap(Effect.service(Recovery), (r) => r.switchHome()))}
      />
    );
  }

  const admitted = nav.admitted;
  const screens = admittedScreens(admitted);
  const apps = snapshot.apps;
  const home = nav.app === "";
  const tiles = homeKeys(favorites.entries, admitted, apps).flatMap((key) => faceOf(key, apps, details, admitted) ?? []);
  const entries = libraryKeys(apps, nav.query).flatMap((key) => faceOf(key, apps, details, admitted) ?? []);
  const hidden = addableViews(favorites.entries, admitted).flatMap((key) => faceOf(key, apps, details, admitted) ?? []);
  const launcherHost = nav.host === "HomeApp" || nav.host === "LauncherApp";
  const libraryShown = launcherHost || apps.length > 0;
  const covered = appInert(nav) || nav.shade || talking(nav) || nav.voice;
  const infoText = info.notice === "" ? "" : appInfoText(apps.find((app) => appKey(app) === info.notice)?.label ?? info.notice, info.reason);
  const topDialog = nav.layers.filter((layer) => layer.kind === "DialogLayer" || layer.kind === "SheetLayer").length > 0;

  const { agenda: Agenda, attention: Attention } = homeMounts;
  const { account: ReadyAccount } = walkthroughMounts;

  return (
    <div
      data-alpha-screen
      data-alpha-chat-half={nav.chat === "Sheet" || undefined}
      className={cn(appearance, "relative h-dvh w-full overflow-hidden bg-background font-sans text-foreground")}
      onPointerDown={(event) => { start.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => {
        const begun = start.current;
        start.current = null;
        if (!begun || begun.id !== event.pointerId) return;
        const dx = event.clientX - begun.x, dy = event.clientY - begun.y;
        const eligible = emptyHome(launcherHost, nav.host === "AssistantSurface", false, nav.shade, home, nav.library, nav.voice, talking(nav));
        const target = event.target instanceof Element ? event.target : null;
        const onHome = !!target?.closest('[data-alpha-layer="home"]') && !target.closest("[data-alpha-tile],button,input,textarea");
        const editable = !!target?.closest("input,textarea,[contenteditable]");
        const pulled = pullOpensShade(eligible, begun.y, dx, dy, onHome, editable, document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement, false);
        const action = swipe(launcherHost, home, nav.chat === "Sheet", talking(nav), pulled, Math.round(begun.x), Math.round(begun.y), Math.round(dx), Math.round(dy));
        if (action === "SwipeBack") navigate((n) => n.back());
        else if (action === "SwipeHome") navigate((n) => n.home());
        else if (action === "SwipeShade") act(Effect.flatMap(Effect.service(Shade), (s) => s.pull()));
        else if (action === "LowerAssistant") navigate((n) => n.moveChat(home ? "Input" : "Hidden"));
        else if (action === "RaiseAssistant") navigate((n) => n.moveChat("Sheet"));
      }}
    >
      <Surfaces slot="top" admitted={admitted} />
      <HomeScreen
        overview={overview}
        agenda={<Agenda open={openApp} />}
        attention={onImage(admitted) ? <Attention open={openApp} /> : undefined}
        tiles={tiles}
        editing={nav.editing}
        editError={nav.editing ? launchErrorText(snapshot.launchError) : ""}
        canAdd={hidden.length > 0}
        library={libraryShown}
        notifications={launcherHost || nav.host === "Standalone"}
        launching={snapshot.launching}
        covered={!home || nav.library || covered}
        controls={controls}
        onOpen={(app) => navigate((n) => n.open(app))}
        onLibrary={() => launcher((l) => l.openLibrary())}
        onAdd={() => launcher((l) => l.openAdd())}
        onDone={() => launcher((l) => l.finishEditing())}
        onNotifications={() => act(Effect.flatMap(Effect.service(Shade), (s) => s.pull()))}
      />
      {nav.library && (
        <AppLibrary
          entries={entries}
          query={nav.query}
          status={snapshot.status}
          menu={nav.menu}
          onHome={favorites.entries}
          dial={nav.admitted.includes("phone") ? undefined : snapshot.dial?.label ?? (snapshot.dial ? "Phone" : undefined)}
          launching={snapshot.launching}
          error={launchErrorText(snapshot.launchError)}
          infoNotice={infoText}
          appInfo={launcherHost}
          covered={covered}
          controls={controls}
          onSearch={(query) => launcher((l) => l.search(query))}
          onClose={() => launcher((l) => l.closeLibrary())}
          onDial={() => launcher((l) => l.openDial())}
          onAddToHome={(key) => launcher((l) => l.addToHome(key))}
          onAppInfo={(key) => launcher((l) => l.appInfo(key))}
          onCloseMenu={() => navigate((n) => n.send({ type: "closeMenu" }))}
          onDismissInfo={() => launcher((l) => l.dismissAppInfo())}
        />
      )}
      <AppFrame nav={nav} screens={screens} failures={recovery.recorded} onClose={() => navigate((n) => n.home())} />
      <AddToHomeSheet hidden={hidden} open={nav.adding} onAdd={(key) => launcher((l) => l.addView(key))} onClose={() => launcher((l) => l.closeAdd())} />
      <StandInShade open={nav.shade} onClose={() => navigate((n) => n.send({ type: "closeShade" }))} />
      {dockShown(nav) && (
        <div data-alpha-dock data-alpha-dock-bar={nav.chat === "Sheet" || nav.chat === "Full" ? undefined : ""} className="contents">
          <Surfaces slot="dock" admitted={admitted} />
        </div>
      )}
      <div className="absolute inset-x-0 z-40 flex flex-col gap-2" style={{ top: "calc(var(--alpha-header-clearance, 0px) + 4rem)" }}>
        <Surfaces slot="notices" admitted={admitted} />
        <NoticesSlot notices={toasts.notices} onDismiss={(message) => act(Effect.flatMap(Effect.service(Notices), (n) => n.dismiss(message)))} />
      </div>
      <ToastRegion
        toasts={toasts}
        inDialog={topDialog}
        onHold={() => act(Effect.flatMap(Effect.service(Notices), (n) => n.hold()))}
        onRelease={() => act(Effect.flatMap(Effect.service(Notices), (n) => n.release()))}
        onAction={() => act(Effect.flatMap(Effect.service(Notices), (n) => n.takeAction()))}
      />
      <StartupPermissions
        walkthrough={walkthrough}
        onAllow={() => act(Effect.flatMap(Effect.service(Permissions), (p) => p.allow()))}
        onNext={(skip) => act(Effect.flatMap(Effect.service(Permissions), (p) => p.next(skip)))}
        onFinish={() => act(Effect.flatMap(Effect.service(Permissions), (p) => p.finish()))}
        onClose={() => act(Effect.flatMap(Effect.service(Permissions), (p) => p.close()))}
        account={walkthrough.phase === "PhaseReady" ? <ReadyAccount /> : undefined}
      />
      <Surfaces slot="overlay" admitted={admitted} />
    </div>
  );
}
