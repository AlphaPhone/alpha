// spec/app/shell/index.md, "Story: Move between Home and the apps"
import type { View } from "../gen/app__shell.ts";

/** Runtime surface mode: the full monolith launcher, the system-wide Ask Alpha overlay, or one standalone app view. */
export type AlphaSurface =
  | { readonly mode: "monolith" }
  | { readonly mode: "overlay" }
  | { readonly mode: "app"; readonly view: View };

/** Authoritative set of built-in app views admitted as standalone surfaces. */
const VIEW_INDEX = {
  Phone: true,
  Messages: true,
  Inbox: true,
  Telegram: true,
  Slack: true,
  Calendar: true,
  Clock: true,
  Reminders: true,
  Browser: true,
  Camera: true,
  Photos: true,
  Maps: true,
  Notes: true,
  Contacts: true,
  Files: true,
  Workflows: true,
  Wallet: true,
  Settings: true,
} as const satisfies Record<View, true>;

/** Every built-in view name in canonical casing. */
export const SURFACE_VIEWS: readonly View[] = Object.keys(VIEW_INDEX) as View[];

const VIEW_BY_LOWER = new Map<string, View>(
  SURFACE_VIEWS.map((view) => [view.toLowerCase(), view]),
);

const COMMS_VIEWS: ReadonlySet<View> = new Set<View>(["Phone", "Messages", "Contacts"]);
const OCR_VIEWS: ReadonlySet<View> = new Set<View>(["Camera", "Files"]);

/** Parse an untrusted view name into a validated `View`, matching canonical or lowercase spelling. */
export function parseView(raw: string | null | undefined): View | undefined {
  if (raw === null || raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  return VIEW_BY_LOWER.get(trimmed.toLowerCase());
}

/** Inputs used to resolve the active surface from build-time env and optional URL query parameters. */
export interface SurfaceInputs {
  readonly envSurface?: string;
  readonly envView?: string;
  readonly search?: string;
}

/** Resolve the active `AlphaSurface`; defaults to `{ mode: "monolith" }` when unset or invalid. */
export function parseSurface({ envSurface, envView, search }: SurfaceInputs): AlphaSurface {
  const normalizedEnv = envSurface?.trim().toLowerCase();
  if (normalizedEnv === "overlay") return { mode: "overlay" };
  if (normalizedEnv === "app") {
    const view = parseView(envView);
    if (view !== undefined) return { mode: "app", view };
  }
  if ((normalizedEnv === undefined || normalizedEnv === "" || normalizedEnv === "monolith") && search) {
    const params = new URLSearchParams(search);
    const querySurface = params.get("surface")?.trim().toLowerCase();
    if (querySurface === "overlay") return { mode: "overlay" };
    if (querySurface === "app") {
      const view = parseView(params.get("view"));
      if (view !== undefined) return { mode: "app", view };
    }
  }
  return { mode: "monolith" };
}

/** Resolve the active surface for the current page from Vite env and `location.search`. */
export function currentSurface(): AlphaSurface {
  const meta = import.meta as unknown as { readonly env?: Record<string, unknown> };
  const env = meta.env;
  const envSurface = env !== undefined && typeof env.VITE_ALPHA_SURFACE === "string" ? env.VITE_ALPHA_SURFACE : undefined;
  const envView = env !== undefined && typeof env.VITE_ALPHA_VIEW === "string" ? env.VITE_ALPHA_VIEW : undefined;
  const search = typeof location !== "undefined" ? location.search : undefined;
  return parseSurface({ envSurface, envView, search });
}

/** Lock key scoped to `surface` so multi-surface tabs do not contend with one another. */
export function lockNameFor(surface: AlphaSurface): string {
  switch (surface.mode) {
    case "monolith":
      return "alpha.page";
    case "overlay":
      return "alpha.page:overlay";
    case "app":
      return `alpha.page:app:${surface.view}`;
  }
}

/** Whether `surface` requires offline OCR assets (`monolith`, `Camera`, and `Files` only). */
export function needsLocalOcr(surface: AlphaSurface): boolean {
  switch (surface.mode) {
    case "monolith":
      return true;
    case "overlay":
      return false;
    case "app":
      return OCR_VIEWS.has(surface.view);
  }
}

/** Whether a mount at `place` belongs to `surface`. */
export function allowsPlace(surface: AlphaSurface, place: string): boolean {
  switch (surface.mode) {
    case "monolith":
      return true;
    case "overlay":
      return place === "assistant" || place === "assistant/calendar" || place === "overlay" || place === "notice";
    case "app":
      if (place === `view:${surface.view}` || place === "notice") return true;
      if (place === "phone/stage") return COMMS_VIEWS.has(surface.view);
      if (place.startsWith("settings/")) return surface.view === "Settings";
      return false;
  }
}

/** Filter `all` screen mounts to the subset belonging to `surface`, preserving order and reference identity in monolith mode. */
export function mountsFor<T extends { readonly at: string }>(surface: AlphaSurface, all: readonly T[]): readonly T[] {
  if (surface.mode === "monolith") return all;
  return all.filter((mount) => allowsPlace(surface, mount.at));
}
