import { type ReactNode, useCallback, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "../Button.tsx";
import { AppTile } from "../AppTile.tsx";
import { Input } from "../Input.tsx";
import { cn } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";
import { HomeAppMenu, type HomeAppMenuProps } from "./HomeAppMenu.tsx";
import { type HomeNoticeMessage, HomeNotice } from "./HomeNotice.tsx";
import { InstalledAppIcon } from "./InstalledAppIcon.tsx";
import { tileColumns } from "./HomeTileGrid.tsx";
import { type LauncherHold, useLauncherPress } from "./launcherPress.ts";

/** An app from the accepted launcher catalog, or one of Alpha's own apps that is not on Home. */
export interface DrawerApp {
  readonly id: string;
  readonly label: string;
  readonly packageName: string;
  readonly activityName?: string;
  readonly profile?: string;
  readonly user?: string;
  readonly locked?: boolean;
  readonly image?: string;
  /** One of Alpha's own apps draws its glyph, as its Home tile would. */
  readonly icon?: ReactNode;
}

export interface AppsDrawerProps {
  readonly apps: readonly DrawerApp[];
  readonly query: string;
  readonly catalog: "reading" | "ready" | "unavailable";
  readonly opening?: string;
  modal?: boolean;
  inactive?: boolean;
  readonly notice?: HomeNoticeMessage;
  readonly hold?: LauncherHold;
  readonly menu?: { readonly app: string; readonly actions: NonNullable<HomeAppMenuProps["actions"]> };
  onSearch: (query: string) => void;
  onClose: () => void;
  onOpen: (id: string) => void;
  onOpenMenu?: (id: string) => void;
  onRetry?: () => void;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const folded = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const short = (app: DrawerApp) => app.activityName?.split(".").at(-1) || app.activityName || "";

function byName(apps: readonly DrawerApp[], name: (app: DrawerApp) => string) {
  const groups = new Map<string, DrawerApp[]>();
  for (const app of apps) {
    const key = name(app);
    const group = groups.get(key);
    if (group) group.push(app);
    else groups.set(key, [app]);
  }
  return groups;
}

function detailsFor(apps: readonly DrawerApp[]) {
  const details = new Map<string, string[]>();
  const groups = byName(apps, (app) => `${folded(app.label)}\n${app.profile ?? ""}`);
  for (const group of groups.values()) {
    for (const app of group) {
      const parts = app.profile ? [app.locked ? `${app.profile} · locked` : app.profile] : [];
      if (group.length > 1) {
        const before = parts.length;
        const siblings = group.filter((other) => other.packageName === app.packageName);
        if (siblings.length < group.length) parts.push(app.packageName);
        if (siblings.length > 1 && app.activityName) {
          parts.push(siblings.filter((other) => short(other) === short(app)).length === 1 ? short(app) : app.activityName);
          if (app.user && siblings.filter((other) => other.activityName === app.activityName).length > 1) {
            parts.push(`profile ${app.user}`);
          }
        }
        if (parts.length === before) parts.push(app.packageName);
      }
      details.set(app.id, parts);
    }
  }
  const names = byName(apps, (app) => `${folded(app.label)}\n${details.get(app.id)?.join("\n") ?? ""}`);
  for (const same of names.values()) {
    if (same.length < 2) continue;
    for (const app of same) {
      const visible = details.get(app.id) ?? [];
      const identity = [app.packageName, app.activityName, app.user ? `profile ${app.user}` : undefined];
      details.set(app.id, [...visible, ...identity.filter((part): part is string => Boolean(part && !visible.includes(part)))]);
    }
  }
  return details;
}

function matches(apps: readonly DrawerApp[], query: string) {
  const search = folded(query.trim());
  const details = detailsFor(apps);
  return apps.flatMap((app) => {
    const name = folded(app.label);
    const rank = name.startsWith(search) ? 0 : name.includes(search) ? 1 : folded(app.packageName).includes(search) ? 2 : -1;
    return rank < 0 ? [] : [{ app, rank, detail: details.get(app.id) ?? [] }];
  }).sort((a, b) => a.rank - b.rank || collator.compare(a.app.label, b.app.label)
    || a.app.packageName.localeCompare(b.app.packageName) || a.app.id.localeCompare(b.app.id));
}

function DrawerTile({ app, detail, opening, hold, menu, onOpen, onOpenMenu }: {
  app: DrawerApp;
  detail: readonly string[];
  opening?: string;
  hold?: LauncherHold;
  menu?: AppsDrawerProps["menu"];
  onOpen: AppsDrawerProps["onOpen"];
  onOpenMenu?: AppsDrawerProps["onOpenMenu"];
}) {
  const actions = menu?.app === app.id ? menu.actions : undefined;
  const longPress = onOpenMenu && opening === undefined ? () => onOpenMenu(app.id) : undefined;
  const activation = useLauncherPress(hold, longPress, () => onOpen(app.id));
  return (
    <div data-launcher-app={app.id} className="flex min-w-0 justify-center">
      <HomeAppMenu label={app.label} actions={actions}>
        <AppTile drawer label={app.label} detail={detail.join(" · ")}
          aria-busy={opening === app.id || undefined} disabled={opening !== undefined}
          aria-haspopup={onOpenMenu ? "menu" : undefined} aria-expanded={onOpenMenu ? actions !== undefined : undefined}
          icon={app.icon ?? <InstalledAppIcon image={app.image} className={app.image ? "size-14 rounded-drawer-icon" : "size-6.5"} />}
          {...activation} />
      </HomeAppMenu>
    </div>
  );
}

/** The native launcher catalog in a drawer over Home. @model spec/app/home/drawer.md */
export function AppsDrawer({ apps, query, catalog, opening, notice, hold, menu, modal = true, inactive = false, onSearch, onClose, onOpen, onOpenMenu, onRetry }: AppsDrawerProps) {
  const entries = useMemo(() => matches(apps, query), [apps, query]);
  const reading = catalog === "reading";
  const failed = catalog === "unavailable";
  const drawerRef = useCallback((node: HTMLElement | null) => {
    if (!inactive && node && !node.contains(node.ownerDocument.activeElement)) {
      node.querySelector<HTMLElement>("h1")?.focus();
    }
  }, [inactive]);
  return (
    <section ref={drawerRef} data-alpha-apps-drawer="" role="dialog" aria-modal={modal || undefined} aria-label="Apps" inert={inactive || undefined}
      className="absolute inset-0 z-sheet flex min-h-0 flex-col bg-background pt-[calc(max(--spacing(11),var(--alpha-safe-top))+--spacing(3))] text-foreground motion-safe:animate-fadein"
      onKeyDown={(event) => {
        if (inactive || event.key !== "Escape" || event.defaultPrevented) return;
        const drawer = event.currentTarget;
        if (!(event.target instanceof Node) || !drawer.contains(event.target)
          || !drawer.contains(drawer.ownerDocument.activeElement)) return;
        event.preventDefault();
        event.stopPropagation();
        if (menu) menu.actions.close();
        else onClose();
      }}>
      <header className="flex h-11 shrink-0 items-center gap-2 pr-3 pl-5">
        <h1 tabIndex={-1} className="grow font-display text-3xl leading-serif font-light outline-none [font-variation-settings:'opsz'_144]">Apps</h1>
        <Button variant="ghost" size="icon" aria-label="Close apps" onClick={onClose}><X aria-hidden className="size-5" /></Button>
      </header>
      <div className="relative mx-4 mt-3 mb-2 shrink-0">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="Search apps" placeholder="Search apps" autoComplete="off" enterKeyHint="search"
          value={query} onChange={(event) => onSearch(event.currentTarget.value)} className="rounded-panel border-0 pr-4 pl-11" />
      </div>
      {notice && <HomeNotice notice={notice} place="InDrawer" className="mx-5 mt-1" />}
      <div aria-busy={reading || undefined} className={cn(dockClearance, "min-h-0 flex-1 touch-pan-y overflow-y-auto px-2 pt-1 [scrollbar-width:none]")}>
        <div data-alpha-apps-grid="" className={cn(tileColumns, "gap-y-5 px-0.5 py-1.5")}>
          {entries.map(({ app, detail }) => <DrawerTile key={app.id} app={app} detail={detail} opening={opening}
            hold={hold} menu={menu} onOpen={onOpen} onOpenMenu={onOpenMenu} />)}
        </div>
        {(failed || (entries.length === 0 && !reading)) && (
          <div className="px-4 py-7 text-center text-sm text-muted-foreground">
            <p role="status">{failed ? "Apps could not be read." : "No apps"}</p>
            {onRetry && failed && <Button variant="secondary" className="mt-3 h-11 px-4.5 font-normal text-inherit" onClick={onRetry}>Try again</Button>}
          </div>
        )}
      </div>
    </section>
  );
}
