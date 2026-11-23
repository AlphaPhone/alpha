// spec/shell/navigation.md, "The library, its entry menu and Home's edit mode exist only over Home"; spec/shell/appInfo.md, "Story: Check an app's details in Android"; spec/shell/inventory.md, "Story: See the apps installed now"
import { Info, Phone, Plus, Search, X } from "lucide-react";
import { Button, EmptyState, Input, Spinner } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { launcherFocusRing, type TileFace } from "./AppTile.tsx";
import { TileGrid, type GestureControls } from "./TileGrid.tsx";

/** The library over Home: its entries, search, entry menu, inventory status and App info notice. */
export interface AppLibraryProps {
  /** The installed apps the search shows, in their shown order. */
  entries: readonly TileFace[];
  query: string;
  status: "idle" | "loading" | "ready" | "failed";
  /** The entry whose menu is open, if one is. */
  menu: string;
  /** Keys already on Home. */
  onHome: readonly string[];
  /** The default Phone app's label, where one is set up. */
  dial?: string;
  /** The entry being opened through Android. */
  launching?: string | null;
  /** The last launch error, in Alpha's words. */
  error?: string;
  /** Android's App info refusal for the last entry asked about. */
  infoNotice?: string;
  /** App info is reachable on this device. */
  appInfo?: boolean;
  /** Covered by the conversation or voice: its controls are inert. */
  covered?: boolean;
  controls: GestureControls;
  onSearch: (query: string) => void;
  onClose: () => void;
  onDial: () => void;
  onAddToHome: (key: string) => void;
  onAppInfo: (key: string) => void;
  onCloseMenu: () => void;
  onDismissInfo: () => void;
}

/**
 * The library over Home: every installed app, searchable, with an entry's menu to add it to Home or open App info.
 * @model spec/shell/navigation.md
 */
export function AppLibrary({
  entries, query, status, menu, onHome, dial, launching = null, error = "", infoNotice = "", appInfo = false, covered = false,
  controls, onSearch, onClose, onDial, onAddToHome, onAppInfo, onCloseMenu, onDismissInfo,
}: AppLibraryProps) {
  const opened = entries.find((entry) => entry.key === menu);
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Apps"
      data-alpha-layer="drawer"
      inert={covered || undefined}
      className="absolute inset-0 z-30 flex flex-col gap-4 bg-background pt-3"
      style={{ paddingBottom: "var(--alpha-dock-clearance, 7rem)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4" data-alpha-header>
        <h1 className="font-display text-3xl">Apps</h1>
        <Button variant="ghost" size="icon" aria-label="Close apps" onClick={onClose}><X aria-hidden className="size-5" /></Button>
      </div>
      <label className="relative mx-4 flex items-center">
        <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input type="search" aria-label="Search apps" placeholder="Search apps" value={query} data-alpha-focus-target="search"
          onChange={(event) => onSearch(event.currentTarget.value)} className="pl-9" />
      </label>
      {(error || infoNotice) && (
        <p role="alert" className="mx-4 flex items-start justify-between gap-3 text-sm text-destructive">
          <span>{infoNotice || error}</span>
          {infoNotice && <button type="button" className={cn(focusRing, "font-mono text-xs uppercase tracking-widest")} onClick={onDismissInfo}>Dismiss</button>}
        </p>
      )}
      <div className="flex-1 overflow-y-auto" data-installed-apps-scroll>
        {dial && query === "" && (
          <div className="px-3 pb-2">
            <button type="button" onClick={onDial} aria-busy={launching === "dial" || undefined}
              className={cn(launcherFocusRing, "flex min-h-24 w-24 flex-col items-center gap-2 rounded-lg p-2 text-sm")}>
              <span className="flex size-14 items-center justify-center rounded-xl bg-secondary"><Phone aria-hidden className="size-7" /></span>
              {dial}
            </button>
          </div>
        )}
        {status === "loading" && entries.length === 0 ? (
          <div className="flex justify-center p-8"><Spinner label="Loading apps" /></div>
        ) : status === "failed" && entries.length === 0 ? (
          <EmptyState title="Couldn’t load your apps" />
        ) : entries.length === 0 ? (
          <EmptyState title={query ? "No apps match" : "No apps"} />
        ) : (
          <TileGrid label="Installed apps" faces={entries} launching={launching} controls={controls} />
        )}
      </div>
      {opened && (
        <div role="menu" aria-label={opened.label} className="absolute inset-x-3 bottom-[calc(var(--alpha-dock-clearance,7rem)+0.5rem)] z-40 flex flex-col rounded-xl bg-popover p-2 text-popover-foreground shadow-lg">
          <button role="menuitem" type="button" disabled={onHome.includes(opened.key)} onClick={() => onAddToHome(opened.key)}
            className={cn(focusRing, "flex min-h-12 items-center gap-3 rounded-md px-3 text-left disabled:opacity-50")}>
            <Plus aria-hidden className="size-4" />{onHome.includes(opened.key) ? "On Home" : "Add to Home"}
          </button>
          {appInfo && (
            <button role="menuitem" type="button" onClick={() => onAppInfo(opened.key)} className={cn(focusRing, "flex min-h-12 items-center gap-3 rounded-md px-3 text-left")}>
              <Info aria-hidden className="size-4" />App info
            </button>
          )}
          <button role="menuitem" type="button" onClick={onCloseMenu} className={cn(focusRing, "flex min-h-12 items-center gap-3 rounded-md px-3 text-left text-muted-foreground")}>
            <X aria-hidden className="size-4" />Close menu
          </button>
        </div>
      )}
    </section>
  );
}
