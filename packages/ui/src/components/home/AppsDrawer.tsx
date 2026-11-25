import { Search, X } from "lucide-react";
import { Button } from "../Button.tsx";
import { AppTile } from "../AppTile.tsx";
import { Input } from "../Input.tsx";
import { cn } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";
import { type HomeNoticeMessage, HomeNotice } from "./HomeNotice.tsx";
import { InstalledAppIcon } from "./InstalledAppIcon.tsx";
import { tileColumns } from "./HomeTileGrid.tsx";

/** An app from the accepted launcher catalog. */
export interface DrawerApp {
  readonly id: string;
  readonly label: string;
  readonly packageName: string;
  readonly activityName?: string;
  readonly profile?: string;
  readonly user?: string;
  readonly locked?: boolean;
  readonly image?: string;
}

export interface AppsDrawerProps {
  readonly apps: readonly DrawerApp[];
  readonly query: string;
  readonly catalog: "reading" | "ready" | "unavailable";
  readonly opening?: string;
  readonly notice?: HomeNoticeMessage;
  onSearch: (query: string) => void;
  onClose: () => void;
  onBack?: () => void;
  onOpen: (id: string) => void;
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

/** The native launcher catalog in a drawer over Home. @model spec/app/home/drawer.md */
export function AppsDrawer({ apps, query, catalog, opening, notice, onSearch, onClose, onBack = onClose, onOpen, onRetry }: AppsDrawerProps) {
  const entries = matches(apps, query);
  const reading = catalog === "reading";
  const failed = catalog === "unavailable";
  return (
    <section data-alpha-apps-drawer="" role="dialog" aria-modal="true" aria-label="Apps"
      className="absolute inset-x-0 top-[max(--spacing(11),var(--alpha-native-inset-top,0px),env(safe-area-inset-top))] bottom-0 z-10 flex min-h-0 flex-col bg-background pt-3 text-foreground"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }}>
      <header className="flex h-11 shrink-0 items-center gap-2 pr-3 pl-5">
        <h1 className="grow font-display text-3xl font-light outline-none">Apps</h1>
        <Button variant="ghost" size="icon" aria-label="Close apps" onClick={onClose}><X className="size-5" /></Button>
      </header>
      <div className="relative mx-4 mt-3 mb-2 shrink-0">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="Search apps" placeholder="Search apps" autoComplete="off" enterKeyHint="search"
          value={query} onChange={(event) => onSearch(event.currentTarget.value)} className="rounded-panel border-0 pr-4 pl-11.5" />
      </div>
      {notice && <HomeNotice notice={notice} place="InDrawer" className="mx-5 mt-1" />}
      <div aria-busy={reading || undefined} className={cn(dockClearance, "min-h-0 flex-1 touch-pan-y overflow-y-auto px-2 pt-1 [scrollbar-width:none]")}>
        <div data-alpha-apps-grid="" className={cn(tileColumns, "gap-y-5 px-0.5 py-1.5")}>
          {entries.map(({ app, detail }) => {
            const description = detail.join(" · ");
            return (
              <div key={app.id} data-launcher-app={app.id} className="flex min-w-0 justify-center">
                <AppTile drawer label={app.label} detail={description}
                  aria-busy={opening === app.id || undefined} disabled={opening !== undefined} onClick={() => onOpen(app.id)}
                  icon={<InstalledAppIcon image={app.image} className={app.image ? "size-14 rounded-drawer-icon" : "size-6.5"} />} />
              </div>
            );
          })}
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
