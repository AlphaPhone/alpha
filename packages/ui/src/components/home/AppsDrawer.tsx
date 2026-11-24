import { X } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";
import { AppHeader } from "../AppHeader.tsx";
import { Button } from "../Button.tsx";
import { SearchField } from "../SearchField.tsx";
import { Spinner } from "../Spinner.tsx";
import { HomeAppMenu } from "./HomeAppMenu.tsx";
import { HomeDrawerApp } from "./HomeDrawerApp.tsx";
import { HomeNotice, type HomeNoticeMessage } from "./HomeNotice.tsx";
import { tileColumns } from "./HomeTileGrid.tsx";
import type { LauncherHold } from "./launcherPress.ts";

/** What the open drawer shows, as the launcher decides it. */
export type HomeDrawerView = "Spinner" | "CannotRead" | "NoAppsInstalled" | "NoMatch" | "Grid";

/** An app of the last reading of the phone's apps. */
export type HomeInstalledApp = {
  /** The launcher's name for it: its package, activity and profile. */
  id: string;
  /** Its name, as Android gives it. */
  label: string;
  /** Its profile, package or activity where Android's entries need to be told apart. */
  detail?: string;
  /** Its icon, as an image URL. */
  image?: string;
  /** It is on Home already. */
  onHome: boolean;
};

export type AppsDrawerProps = {
  /** A spinner, that the apps could not be read, that none are installed, that none match the search, or the apps. */
  view: HomeDrawerView;
  /** The apps of the last reading that match the search; their order is the drawer's own. */
  apps: readonly HomeInstalledApp[];
  /** A newer reading is on its way while the last list stays up. */
  refreshing?: boolean;
  /** What is searched; the parent keeps it. */
  query: string;
  /** Called with the search as it is typed. */
  onSearch: (query: string) => void;
  /** Closes the drawer. */
  onClose: () => void;
  /** Asks Android to open an app; left out while Android is being asked something, so the apps refuse. */
  onOpenApp?: (id: string) => void;
  /** The app Android is being asked to open. */
  opening?: string;
  /** The app whose menu is open. */
  menu?: string;
  /** Opens an app's menu. */
  onOpenMenu?: (id: string) => void;
  /** Schedules and cancels a stationary press on a drawer app. */
  hold?: LauncherHold;
  /** Closes the open menu. */
  onCloseMenu: () => void;
  /** Adds the menu's app to Home; left out while a change is being saved. */
  onAddToHome?: (id: string) => void;
  /** Hands the menu's app to Android's App info; left out while Android is being asked something. */
  onShowAppInfo?: (id: string) => void;
  /** Reads the apps again after they could not be read; left out where nothing may be read. */
  onTryAgain?: () => void;
  /** A failure told while the drawer is open. */
  notice?: HomeNoticeMessage;
  className?: string;
};

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const byLabel = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Put label matches before package-only matches, as Android's inventory does. */
const arrange = (apps: readonly HomeInstalledApp[], query: string) => {
  const search = plain(query.trim());
  const rank = (name: string) => name.startsWith(search) ? 0 : name.includes(search) ? 1 : 2;
  return apps
    .map((app) => ({ app, rank: rank(plain(app.label)) }))
    .sort((a, b) => a.rank - b.rank || byLabel.compare(a.app.label, b.app.label) || a.app.id.localeCompare(b.app.id));
};

const empty = {
  CannotRead: "Apps could not be read.",
  NoAppsInstalled: "No apps",
  NoMatch: "No apps match",
};

/**
 * The Apps drawer: a search over the apps installed on the phone, their grid, and an app's menu. A press opens an
 * app and a long press its menu.
 * @model spec/app/home/index.md
 */
export function AppsDrawer({
  view, apps, refreshing = false, query, onSearch, onClose, onOpenApp, opening, menu, onOpenMenu, hold, onCloseMenu, onAddToHome, onShowAppInfo, onTryAgain, notice, className,
}: AppsDrawerProps) {
  const entries = useMemo(() => arrange(apps, query), [apps, query]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apps"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          if (menu) onCloseMenu();
          else onClose();
        }
      }}
      className={cn("flex min-h-0 flex-col bg-background pt-[max(--spacing(14),calc(env(safe-area-inset-top)+--spacing(3)))] text-foreground motion-safe:animate-fade", className)}
    >
      <AppHeader title="Apps" className="min-h-11 shrink-0 px-3 [&_h1]:py-0 [&_h1]:pl-2">
        <Button variant="ghost" size="icon" aria-label="Close apps" onClick={onClose}><X className="size-5" /></Button>
      </AppHeader>
      <SearchField aria-label="Search apps" placeholder="Search apps" autoComplete="off" value={query} onValueChange={onSearch} className="mx-4 mt-3 mb-2 shrink-0 [&_input]:rounded-full [&_input]:border-0 [&_input]:bg-secondary [&_input]:pl-11 [&>svg]:size-4.5" />
      {notice ? <HomeNotice notice={notice} place="InDrawer" className="mx-5 my-1" /> : null}
      <div className={cn(dockClearance, "min-h-0 flex-1 touch-pan-y overflow-y-auto px-2 pt-1")}>
        {view === "Grid" ? (
          <div aria-busy={refreshing || undefined} className={cn(tileColumns, "gap-y-5 px-0.5 py-1.5")}>
            {entries.map(({ app }) => (
              <HomeAppMenu
                key={app.id}
                open={app.id === menu}
                label={app.detail ? `${app.label} (${app.detail})` : app.label}
                onHome={app.onHome}
                onAddToHome={onAddToHome && (() => onAddToHome(app.id))}
                onShowAppInfo={onShowAppInfo && (() => onShowAppInfo(app.id))}
                onClose={onCloseMenu}
              >
                <HomeDrawerApp
                  label={app.label}
                  detail={app.detail}
                  image={app.image}
                  opening={opening === app.id}
                  disabled={!onOpenApp}
                  onClick={onOpenApp && (() => onOpenApp(app.id))}
                  onOpenMenu={onOpenMenu && (() => onOpenMenu(app.id))}
                  hold={hold}
                />
              </HomeAppMenu>
            ))}
          </div>
        ) : view === "Spinner" ? (
          <div className="flex justify-center py-7 text-muted-foreground"><Spinner label="Reading apps" /></div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-7 text-center text-sm text-muted-foreground">
            <p role="status">{empty[view]}</p>
            {view === "CannotRead" && onTryAgain ? <Button variant="secondary" onClick={onTryAgain}>Try again</Button> : null}
          </div>
        )}
      </div>
    </div>
  );
}
