/**
 * The installed-app launcher as a person sees it: the drawer's inventory snapshot (loading,
 * ready, failed), the entry being opened and the inline error a failed open or favorites save
 * shows, search and the secondary text that tells same-named entries apart, the favorites list
 * and its on-device record, and the visibility/resume re-reads that keep the list current.
 *
 * The bridge it reads through is the shared installed-app contract
 * (`@elizaos/capacitor-system/launcher`: `LauncherBridge` over `ElizaSystem`, and the
 * `InstalledApp` entries it lists), which this module only types against.
 */
import type {
  InstalledApp,
  LauncherBridge,
} from "@elizaos/capacitor-system/launcher";

/**
 * Alpha's reason after "<app> could not be opened.", keyed by every sentence Android's shared
 * launcher (`SystemPlugin.launchApp`/`openDefaultApp` and `SystemLauncherApps` refusals in
 * plugin-native-system) rejects an open with. The launcher's own text is never shown.
 */
export const LAUNCH_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["This app is no longer installed.", "It’s no longer installed."],
  ["This app is disabled. Enable it in Android settings to open it.", "It’s turned off. Turn it on in Android Settings to open it."],
  ["This app has no screen that can be opened from here.", "It has no screen Alpha can open."],
  ["This profile is no longer on the phone.", "Its profile is no longer on this phone."],
  ["This app is no longer available in that profile.", "It’s no longer in that profile."],
  ["Work apps are paused or locked. Turn on work apps in Android, then try again.", "Work apps are paused or locked. Turn them on in Android, then try again."],
  ["Private space is locked. Unlock it in Android, then try again.", "Private space is locked. Unlock it in Android, then try again."],
  ["This profile is paused or locked. Unlock it in Android, then try again.", "Its profile is paused or locked. Unlock it in Android, then try again."],
  ["Choose an installed app", "Choose an app that’s installed."],
  ["App could not be opened", "Android didn’t open it. Try again."],
  ["Default app unavailable in this product", "Alpha can’t open a default app here."],
  ["role must be dial", "Alpha can’t open a default app here."],
  ["No app on this device handles dial", "No phone app is set up on this device."],
]);

/** The reason by refusal code when the sentence is unknown (`LAUNCHER_REFUSAL_CODES`). */
const LAUNCH_CODES: Readonly<Record<string, string>> = {
  "not-installed": "It’s no longer installed.",
  disabled: "It’s turned off. Turn it on in Android Settings to open it.",
  "no-launcher": "It has no screen Alpha can open.",
  "profile-locked": "Its profile is paused or locked. Unlock it in Android, then try again.",
  "profile-unavailable": "Its profile is no longer on this phone.",
  failed: "Android didn’t open it. Try again.",
};

/** Alpha's whole sentence for a failed open of `label`; the launcher's text is never shown. */
export function launchFailureText(label: string, error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const reason =
    LAUNCH_REFUSALS.get(message) ??
    (typeof code === "string" && Object.hasOwn(LAUNCH_CODES, code) ? LAUNCH_CODES[code] : "Try again.");
  return `${label} could not be opened. ${reason}`;
}

/** The default handler a launcher read reports for a role. */
type DefaultApp = Awaited<
  ReturnType<NonNullable<LauncherBridge["resolveDefault"]>>
>;
/** One launch request: package, then exact activity, then profile. */
export type LaunchTarget = Parameters<LauncherBridge["launch"]>[0];

/** Ordered favorite keys, kept on this device only. `write` throws when storage refuses. */
export interface FavoritesStore {
  read(): string[] | null;
  write(
    keys: string[],
  ): void /** v1 only controlled installed shortcuts, not product Home apps. */;
  legacy?(): boolean /** Old v2 wrote every installed app as the default. */;
  legacyHomeDefaults?(): boolean;
}
type LauncherStatus = "idle" | "loading" | "ready" | "failed";
interface LauncherSnapshot {
  status: LauncherStatus;
  apps: InstalledApp[];
  dial: DefaultApp | null;
  /** Entry currently being opened; repeated taps are ignored until it settles. */
  launching: string | null;
  /** Last open failure, shown inline until the next search, load or launch. */
  launchError: string | null;
  /** Saved favorite keys in the user's order. May name entries that are not installed now. */
  favorites: string[];
}

const FAVORITES_KEY = "eliza.launcher.favorites.v1";
const MAX_FAVORITES = 4096;
const PROFILES = ["work", "private", "clone", "other"];
const PROFILE_LABEL: Record<string, string> = {
  work: "Work",
  private: "Private",
  clone: "Clone",
  other: "Other profile",
};

/** Identity of one launcher entry: package, then exact activity, then profile. Labels never identify. */
export function appKey(app: LaunchTarget): string {
  return (
    app.packageName +
    (app.activityName ? `/${app.activityName}` : "") +
    (app.user ? `#${app.user}` : "")
  );
}

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});
const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
/** Label (then package) match, ignoring case and accents; prefix matches sort first. */
export function filterLauncherApps(
  apps: InstalledApp[],
  query: string,
): InstalledApp[] {
  const needle = fold(query.trim());
  const sorted = [...apps].sort(
    (a, b) =>
      collator.compare(a.label, b.label) ||
      a.packageName.localeCompare(b.packageName) ||
      appKey(a).localeCompare(appKey(b)),
  );
  if (!needle) return sorted;
  const score = (app: InstalledApp) => {
    const label = fold(app.label);
    return label.startsWith(needle)
      ? 0
      : label.includes(needle)
        ? 1
        : fold(app.packageName).includes(needle)
          ? 2
          : -1;
  };
  return sorted
    .map((app) => [app, score(app)] as const)
    .filter(([, rank]) => rank >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([app]) => app);
}

/** Secondary text per entry key. Entries that share a label in the same profile are told apart by
 * package, by activity inside one package, and by profile number when two profiles of one kind hold
 * the same component; another profile's entries always name the profile. No two entries read alike. */
export function describeLauncherApps(
  apps: InstalledApp[],
  branding: { builtinPrefix?: string; productName?: string } = {},
): Map<string, string[]> {
  const groups = new Map<string, InstalledApp[]>();
  for (const app of apps) {
    const id = `${fold(app.label)}\n${app.profile || ""}`;
    groups.set(id, [...(groups.get(id) || []), app]);
  }
  const short = (app: InstalledApp) =>
    app.activityName
      ? app.activityName.slice(app.activityName.lastIndexOf(".") + 1) ||
        app.activityName
      : "";
  const details = new Map<string, string[]>();
  for (const group of groups.values()) {
    for (const app of group) {
      const parts: string[] = [];
      if (app.profile)
        parts.push(
          PROFILE_LABEL[app.profile] + (app.locked ? " · locked" : ""),
        );
      if (group.length > 1) {
        const packageLabel = app.packageName.startsWith(
          branding.builtinPrefix ?? "eliza:",
        )
          ? (branding.productName ?? "Eliza")
          : app.packageName;
        const siblings = group.filter(
          (other) => other.packageName === app.packageName,
        );
        const before = parts.length;
        if (siblings.length < group.length) parts.push(packageLabel);
        if (siblings.length > 1 && app.activityName) {
          parts.push(
            siblings.filter((other) => short(other) === short(app)).length === 1
              ? short(app)
              : app.activityName,
          );
          if (
            app.user &&
            siblings.filter((other) => other.activityName === app.activityName)
              .length > 1
          )
            parts.push(`profile ${app.user}`);
        }
        if (parts.length === before) parts.push(packageLabel);
      }
      details.set(appKey(app), parts);
    }
  }
  // Last resort for shapes the rules above do not separate (a profile entry without an activity,
  // an activity whose short name reads like a profile): rows that still read the same get their
  // full identity, so two different entries are never presented as one.
  const shown = new Map<string, InstalledApp[]>();
  for (const app of apps) {
    const id = `${fold(app.label)}\n${(details.get(appKey(app)) || []).join("\n")}`;
    shown.set(id, [...(shown.get(id) || []), app]);
  }
  for (const same of shown.values()) {
    if (new Set(same.map(appKey)).size < 2) continue;
    for (const app of same) {
      const parts = details.get(appKey(app)) || [];
      for (const part of [
        app.packageName,
        app.activityName,
        app.user ? `profile ${app.user}` : "",
      ])
        if (part && !parts.includes(part)) parts.push(part);
    }
  }
  return details;
}

const valid = (value: unknown): value is InstalledApp => {
  if (!value || typeof value !== "object") return false;
  const app = value as InstalledApp;
  return (
    typeof app.packageName === "string" &&
    !!app.packageName &&
    typeof app.label === "string" &&
    (app.icon === undefined ||
      (typeof app.icon === "string" &&
        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(app.icon))) &&
    (app.activityName === undefined ||
      (typeof app.activityName === "string" && !!app.activityName)) &&
    (app.user === undefined ||
      (typeof app.user === "string" && /^\d{1,19}$/.test(app.user))) &&
    (app.profile === undefined || PROFILES.includes(app.profile)) &&
    (app.locked === undefined || typeof app.locked === "boolean")
  );
};

const cleanKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter(
      (key): key is string =>
        typeof key === "string" &&
        !!key &&
        key.length <= 512 &&
        !seen.has(key) &&
        !!seen.add(key),
    )
    .slice(0, MAX_FAVORITES);
};
/** Favorites in this origin's localStorage. A missing setting is distinct from an explicitly empty list; malformed data preserves an empty choice. */
export function localFavorites(
  storage: () => Pick<Storage, "getItem" | "setItem"> = () =>
    globalThis.localStorage,
  options: { key?: string; defaultPolicy?: string } = {},
): FavoritesStore {
  const storageKey = options.key ?? FAVORITES_KEY;
  const legacyDefaults = (): string[] | null => {
    try {
      const saved = JSON.parse(storage().getItem(storageKey) || "null");
      return saved?.version === 2 &&
        Object.keys(saved).sort().join(",") === "keys,version" &&
        Array.isArray(saved.keys) &&
        saved.keys.length <= MAX_FAVORITES &&
        cleanKeys(saved.keys).length === saved.keys.length
        ? saved.keys
        : null;
    } catch {
      return null;
    }
  };
  return {
    read() {
      try {
        const raw = storage().getItem(storageKey);
        if (raw === null) return null;
        const saved = JSON.parse(raw);
        return saved?.version === 1 || saved?.version === 2
          ? cleanKeys(saved.keys)
          : [];
      } catch {
        return [];
      }
    },
    legacy() {
      try {
        return (
          JSON.parse(storage().getItem(storageKey) || "null")?.version === 1
        );
      } catch {
        return false;
      }
    },
    legacyHomeDefaults: () => legacyDefaults() !== null,
    write(keys) {
      const original = legacyDefaults();
      let previousDefaults: string[] | null = null;
      try {
        const saved = JSON.parse(storage().getItem(storageKey) || "null");
        if (Array.isArray(saved?.previousDefaults))
          previousDefaults = cleanKeys(saved.previousDefaults);
      } catch {
        /* Keep the existing explicit write behavior. */
      }
      // Retain the old default's choices once; this is migration evidence, not a second live list.
      storage().setItem(
        storageKey,
        JSON.stringify({
          version: 2,
          keys,
          defaultPolicy: options.defaultPolicy ?? "eliza-apps",
          ...(previousDefaults || original
            ? { previousDefaults: previousDefaults || original }
            : {}),
        }),
      );
    },
  };
}

/** Reads installed apps on each open and whenever Android reports a change (installs and removals
 * happen outside the launcher), and launches only from an explicit tap. Failures stay visible; nothing is
 * retried automatically. */
export function createLauncher(
  bridge: LauncherBridge,
  changed: () => void,
  options: {
    icons?: boolean;
    favorites?: FavoritesStore;
    aliases?: Record<string, string>;
  } = {},
) {
  const store = options.favorites;
  const rawSaved = store ? store.read() : [];
  const saved =
    rawSaved === null
      ? null
      : cleanKeys(rawSaved.map((key) => options.aliases?.[key] || key));
  let migrationPending = !!store?.legacy?.();
  let legacyHomeDefaultsPending = !!store?.legacyHomeDefaults?.();
  let defaultsPending = saved === null;
  let builtins: InstalledApp[] = [];
  let state: LauncherSnapshot = {
    status: "idle",
    apps: [],
    dial: null,
    launching: null,
    launchError: null,
    favorites: saved || [],
  };
  let generation = 0;
  let lifetime = 0;
  const update = (patch: Partial<LauncherSnapshot>) => {
    state = { ...state, ...patch };
    changed();
  };
  const saveFavorites = (favorites: string[]) => {
    if (!store) {
      update({ launchError: "Favorites cannot be saved on this device." });
      return;
    }
    try {
      store.write(favorites);
      defaultsPending = false;
      migrationPending = false;
      legacyHomeDefaultsPending = false;
      update({ favorites, launchError: null });
    } catch {
      update({ launchError: "Favorites could not be saved. Nothing changed." });
    }
  };
  const installed = (key: string) =>
    state.apps.some((app) => appKey(app) === key);
  /** With `reuseIcons`, the read skips icons and keeps the ones from the last read; an entry that
   * is new or changed its lock state is read again with icons. */
  const read = async (reuseIcons: boolean) => {
    if (!options.icons) return bridge.list();
    if (!reuseIcons || state.status !== "ready")
      return bridge.list({ icons: true });
    const light = await bridge.list();
    if (!Array.isArray(light?.apps)) return light;
    const known = new Map(state.apps.map((app) => [appKey(app), app] as const));
    const current = light.apps
      .filter(valid)
      .filter((app) => !options.aliases?.[appKey(app)]);
    if (
      current.some((app) => {
        const was = known.get(appKey(app));
        return !was || !!was.locked !== !!app.locked;
      })
    )
      return bridge.list({ icons: true });
    return {
      apps: current.map((app) => {
        const icon = known.get(appKey(app))?.icon;
        return icon ? { ...app, icon } : app;
      }),
    };
  };
  async function load(mode: { quiet?: boolean; reuseIcons?: boolean } = {}) {
    const current = ++generation;
    // A quiet refresh keeps the visible list and any launch error until the new read lands.
    update(
      mode.quiet && state.status !== "idle"
        ? {}
        : { status: "loading", launchError: null },
    );
    const [listed, dial] = await Promise.allSettled([
      read(!!mode.reuseIcons),
      bridge.resolveDefault
        ? bridge.resolveDefault({ role: "dial" })
        : Promise.reject(Error("Unsupported")),
    ]);
    if (current !== generation) return;
    const dialApp =
      dial.status === "fulfilled" && dial.value && dial.value.available === true
        ? dial.value
        : null;
    // A failed read never leaves an older inventory on screen as if it were current.
    if (listed.status === "rejected" || !Array.isArray(listed.value?.apps)) {
      update({ status: "failed", apps: [...builtins], dial: dialApp });
      return;
    }
    const seen = new Set<string>();
    const apps = [
      ...builtins,
      ...listed.value.apps
        .filter(valid)
        .filter((app) => !options.aliases?.[appKey(app)]),
    ].filter((app) => !seen.has(appKey(app)) && !!seen.add(appKey(app)));
    if (defaultsPending || migrationPending || legacyHomeDefaultsPending) {
      const liveSaved = store ? store.read() : [];
      const unchanged =
        rawSaved === null
          ? liveSaved === null
          : liveSaved !== null &&
            rawSaved.length === liveSaved.length &&
            rawSaved.every((key, index) => key === liveSaved[index]);
      if (
        !unchanged ||
        (legacyHomeDefaultsPending && !store?.legacyHomeDefaults?.()) ||
        (migrationPending && !store?.legacy?.())
      ) {
        // An explicit choice made while the inventory read was pending wins.
        defaultsPending = migrationPending = legacyHomeDefaultsPending = false;
        update({
          status: "ready",
          apps,
          dial: dialApp,
          favorites: cleanKeys(
            (liveSaved || []).map((key) => options.aliases?.[key] || key),
          ),
        });
        return;
      }
      let favorites = defaultsPending
        ? (builtins.length ? builtins : apps).map(appKey)
        : state.favorites;
      if (legacyHomeDefaultsPending && builtins.length) {
        const currentKeys = apps.map(appKey),
          current = new Set(currentKeys),
          product = new Set(builtins.map(appKey));
        const visible = favorites.filter((key) => current.has(key));
        if (
          visible.length === currentKeys.length &&
          visible.every((key, index) => key === currentKeys[index])
        )
          favorites = favorites.filter(
            (key) => product.has(key) || !current.has(key),
          );
      }
      try {
        store?.write(favorites);
        defaultsPending = false;
        migrationPending = false;
        legacyHomeDefaultsPending = false;
        state = { ...state, favorites };
      } catch {
        state = {
          ...state,
          favorites,
          launchError: "Favorites could not be saved.",
        };
      }
    }
    update({ status: "ready", apps, dial: dialApp });
  }
  return {
    snapshot: () => state,
    /** Retire pending reads and late handoff replies without undoing a native launch.
     * A later load can reuse this controller, including a StrictMode remount. */
    cancelPending() {
      generation++;
      lifetime++;
      state = { ...state, launching: null };
    },
    /** Product apps already passed the shell's capability policy. Never dispatch these to Android. */
    setBuiltins(apps: InstalledApp[]) {
      const old = new Set(builtins.map(appKey));
      builtins = apps;
      state = {
        ...state,
        apps: [
          ...builtins,
          ...state.apps.filter((app) => !old.has(appKey(app))),
        ],
      };
      if (defaultsPending)
        state = {
          ...state,
          favorites: (builtins.length ? builtins : state.apps).map(appKey),
        };
      else if (migrationPending)
        state = {
          ...state,
          favorites: cleanKeys([...state.favorites, ...builtins.map(appKey)]),
        };
    },
    load,
    /** Re-reads after an outside change. Does nothing before the first open; never shows the loading state over a list. */
    async refresh(mode: { reuseIcons?: boolean } = {}) {
      if (state.status !== "idle") await load({ quiet: true, ...mode });
    },
    async launch(app: InstalledApp) {
      if (state.launching) return;
      const currentLifetime = lifetime;
      const key = appKey(app);
      // Only an entry from the current read can be opened; a removed one is never sent to Android.
      if (!installed(key)) {
        update({ launchError: `${app.label} is no longer installed.` });
        return;
      }
      update({ launching: key, launchError: null });
      const target: LaunchTarget = { packageName: app.packageName };
      if (app.activityName) target.activityName = app.activityName;
      if (app.user) target.user = app.user;
      try {
        await bridge.launch(target);
        if (currentLifetime !== lifetime) return;
        update({ launching: null });
      } catch (error) {
        if (currentLifetime !== lifetime) return;
        update({
          launching: null,
          launchError: launchFailureText(app.label, error),
        });
        // The entry may be gone, disabled or locked now: show the device's current list. This is a
        // full read, so one it overtakes (the drawer was still opening) cannot strand the loading state.
        await load({ quiet: true });
      }
    },
    async openDial() {
      if (state.launching || !state.dial || !bridge.openDefault) return;
      const currentLifetime = lifetime;
      const label = state.dial.label || "Phone";
      update({ launching: "dial", launchError: null });
      try {
        await bridge.openDefault({ role: "dial" });
        if (currentLifetime !== lifetime) return;
        update({ launching: null });
      } catch (error) {
        if (currentLifetime !== lifetime) return;
        update({
          launching: null,
          launchError: launchFailureText(label, error),
        });
        // The handler may have been removed or disabled: re-resolve it so a dead shortcut does not stay.
        await load({ quiet: true });
      }
    },
    isFavorite: (app: InstalledApp) => state.favorites.includes(appKey(app)),
    /** Installed favorites in the saved order. A saved favorite that is not installed is not shown. */
    favoriteApps(): InstalledApp[] {
      const byKey = new Map(
        state.apps.map((app) => [appKey(app), app] as const),
      );
      return state.favorites
        .map((key) => byKey.get(key))
        .filter((app): app is InstalledApp => !!app);
    },
    toggleFavorite(app: InstalledApp) {
      const key = appKey(app);
      if (state.favorites.includes(key)) {
        saveFavorites(state.favorites.filter((item) => item !== key));
        return;
      }
      if (!installed(key)) return;
      // Room is made from favorites that are no longer installed before refusing a new one.
      let kept = state.favorites;
      if (kept.length >= MAX_FAVORITES) kept = kept.filter(installed);
      if (kept.length >= MAX_FAVORITES) {
        update({
          launchError: `You can keep ${MAX_FAVORITES} favorites. Remove one to add ${app.label}.`,
        });
        return;
      }
      saveFavorites([...kept, key]);
    },
    /** Moves a favorite among the visible installed favorites; the others keep their slots. */
    moveFavorite(
      app: InstalledApp,
      direction: -1 | 1,
      visibleKeys?: ReadonlySet<string>,
    ) {
      const key = appKey(app),
        visible = state.favorites.filter(
          (item) => installed(item) && (!visibleKeys || visibleKeys.has(item)),
        ),
        at = visible.indexOf(key),
        other = visible[at + direction];
      if (at < 0 || !other) return;
      const next = [...state.favorites],
        a = next.indexOf(key),
        b = next.indexOf(other);
      next[a] = other;
      next[b] = key;
      saveFavorites(next);
    },
    /** Drops a stale launch error (new search or reopened drawer). An in-flight read keeps its
     * generation, so typing while apps load never strands the drawer in its loading state. */
    clearError() {
      if (state.launchError) state = { ...state, launchError: null };
    },
  };
}
export type Launcher = ReturnType<typeof createLauncher>;

/** Share package/resume refresh ownership across hosts; initial inventory remains explicit.
 * While `appsChanged` is followed, it alone re-reads icons; a return to Home or a resume re-reads
 * the list without them. Without the listener every resume is a full read, so a paused or
 * unlocked profile still shows up. */
export function observeLauncher(
  bridge: LauncherBridge,
  launcher: Launcher,
  options: { follow?: boolean } = {},
): () => void {
  let active = true;
  let following = false;
  let changedSinceRead = false;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const schedule = (appsChanged: boolean) => {
    if (!active) return;
    if (appsChanged) changedSinceRead = true;
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      if (!active) return;
      const full = changedSinceRead || !following;
      changedSinceRead = false;
      void launcher.refresh(full ? {} : { reuseIcons: true });
    }, 120);
  };
  const refresh = () => schedule(false);
  const visible = () => {
    if (!document.hidden) refresh();
  };
  document.addEventListener("visibilitychange", visible);
  document.addEventListener("resume", refresh);
  let subscription: unknown = null;
  try {
    subscription =
      options.follow !== false && bridge.addListener
        ? Promise.resolve(
            bridge.addListener("appsChanged", () => schedule(true)),
          ).then(
            (handle) => {
              following = active;
              return handle;
            },
            () => null,
          )
        : null;
  } catch {
    subscription = null;
  }
  return () => {
    if (!active) return;
    active = false;
    document.removeEventListener("visibilitychange", visible);
    document.removeEventListener("resume", refresh);
    if (pending) clearTimeout(pending);
    pending = null;
    void Promise.resolve(subscription)
      .then((handle) => {
        if (
          handle &&
          typeof handle === "object" &&
          "remove" in handle &&
          typeof handle.remove === "function"
        )
          return handle.remove();
      })
      .catch(() => {});
  };
}
