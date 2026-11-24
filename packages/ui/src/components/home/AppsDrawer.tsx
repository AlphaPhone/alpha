import { CircleAlert, SearchX, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { Screen } from "../Screen.tsx";
import { SearchField } from "../SearchField.tsx";
import { Spinner } from "../Spinner.tsx";
import { HomeAppMenu } from "./HomeAppMenu.tsx";
import { HomeDrawerApp } from "./HomeDrawerApp.tsx";
import { HomeNotice, type HomeNoticeMessage } from "./HomeNotice.tsx";
import { tileColumns } from "./HomeTileGrid.tsx";

/** What the open drawer shows, as the launcher decides it. */
export type HomeDrawerView = "Spinner" | "CannotRead" | "NoAppsInstalled" | "NoMatch" | "Grid";

/** An app of the last reading of the phone's apps. */
export type HomeInstalledApp = {
  /** The launcher's name for it: its package, activity and profile. */
  id: string;
  /** Its name, as Android gives it. */
  label: string;
  /** Its package, which tells apart two apps of the same name in one profile. */
  package: string;
  /** The profile it is installed in, such as "Work"; left out for the owner's own. */
  profile?: string;
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
  /** Closes the open menu. */
  onCloseMenu: () => void;
  /** Adds the menu's app to Home; left out while a change is being saved. */
  onAddToHome?: (id: string) => void;
  /** Hands the menu's app to Android's App info; left out while Android is being asked something. */
  onShowAppInfo?: (id: string) => void;
  /** A failure told while the drawer is open. */
  notice?: HomeNoticeMessage;
  className?: string;
};

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

/** Prefix matches first, then by name; an app whose name another shares says its profile, or else its package. */
const arrange = (apps: readonly HomeInstalledApp[], query: string) => {
  const search = plain(query.trim());
  const twinsOf = (name: string) => apps.filter((other) => plain(other.label) === name);
  return apps
    .map((app) => {
      const name = plain(app.label);
      const twins = twinsOf(name);
      const byProfile = new Set(twins.map((twin) => twin.profile)).size === twins.length;
      return { app, name, detail: twins.length < 2 ? undefined : byProfile ? app.profile : app.package };
    })
    .sort((a, b) => Number(!a.name.startsWith(search)) - Number(!b.name.startsWith(search)) || a.name.localeCompare(b.name) || (a.detail ?? "").localeCompare(b.detail ?? ""));
};

const empty = {
  CannotRead: { title: "Apps could not be read", icon: <CircleAlert /> },
  NoAppsInstalled: { title: "No apps", icon: undefined },
  NoMatch: { title: "No apps match", icon: <SearchX /> },
};

/**
 * The Apps drawer: a search over the apps installed on the phone, their grid, and an app's menu. A press opens an
 * app and a long press its menu.
 * @model spec/app/home/index.md
 */
export function AppsDrawer({
  view, apps, refreshing = false, query, onSearch, onClose, onOpenApp, opening, menu, onOpenMenu, onCloseMenu, onAddToHome, onShowAppInfo, notice, className,
}: AppsDrawerProps) {
  const entries = arrange(apps, query);
  const open = entries.find(({ app }) => app.id === menu);
  return (
    <Screen
      title="Apps"
      className={className}
      actions={<Button variant="ghost" size="icon" aria-label="Close apps" onClick={onClose}><X /></Button>}
    >
      <SearchField aria-label="Search apps" placeholder="Search apps" autoComplete="off" value={query} onValueChange={onSearch} />
      {notice ? <HomeNotice notice={notice} place="InDrawer" /> : null}
      {view === "Grid" ? (
        <div aria-busy={refreshing || undefined} className={cn(tileColumns, "py-2")}>
          {entries.map(({ app, detail }) => (
            <HomeDrawerApp
              key={app.id}
              label={app.label}
              detail={detail}
              image={app.image}
              opening={opening === app.id}
              disabled={!onOpenApp}
              onClick={onOpenApp && (() => onOpenApp(app.id))}
              onOpenMenu={onOpenMenu && (() => onOpenMenu(app.id))}
            />
          ))}
        </div>
      ) : view === "Spinner" ? (
        <div className="flex justify-center py-12 text-muted-foreground"><Spinner label="Reading apps" /></div>
      ) : (
        <EmptyState {...empty[view]} />
      )}
      <HomeAppMenu
        open={open !== undefined}
        label={open?.detail ? `${open.app.label} (${open.detail})` : (open?.app.label ?? "")}
        onHome={open?.app.onHome ?? false}
        onAddToHome={open && onAddToHome && (() => onAddToHome(open.app.id))}
        onShowAppInfo={open && onShowAppInfo && (() => onShowAppInfo(open.app.id))}
        onClose={onCloseMenu}
      />
    </Screen>
  );
}
