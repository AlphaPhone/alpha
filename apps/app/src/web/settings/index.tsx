// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"; spec/settings/updates.md, "Story: Let Android finish an update without losing what I typed"
import { Effect, ManagedRuntime } from "effect";
import { KeyRound, Settings as Gear } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useMachine as useNavigation } from "../../../gen/settings.react.ts";
import { type Page, initial as navigationStart, listedSection } from "../../../gen/settings.ts";
import { machine as navigationMachine } from "../../../gen/settings.effect.vibe";
import { useMachine as useAppearance } from "../../../gen/settings__appearance.react.ts";
import { dark, initial as appearanceStart } from "../../../gen/settings__appearance.ts";
import { useMachine as useDiagnostics } from "../../../gen/settings__diagnostics.react.ts";
import { initial as diagnosticsStart } from "../../../gen/settings__diagnostics.ts";
import { useMachine as useFacts } from "../../../gen/settings__facts.react.ts";
import { initial as factsStart } from "../../../gen/settings__facts.ts";
import { useMachine as useNetwork } from "../../../gen/settings__network.react.ts";
import { initial as networkStart } from "../../../gen/settings__network.ts";
import { useMachine as useVault } from "../../../gen/settings__passwords.react.ts";
import { initial as vaultStart } from "../../../gen/settings__passwords.ts";
import { useMachine as usePreferences } from "../../../gen/settings__preferences.react.ts";
import { initial as preferencesStart } from "../../../gen/settings__preferences.ts";
import { useMachine as usePrivacy } from "../../../gen/settings__privacy.react.ts";
import { initial as privacyStart } from "../../../gen/settings__privacy.ts";
import { useMachine as useReset } from "../../../gen/settings__reset.react.ts";
import { initial as resetStart } from "../../../gen/settings__reset.ts";
import { useMachine as useUpdates } from "../../../gen/settings__updates.react.ts";
import { initial as updatesStart } from "../../../gen/settings__updates.ts";
import { Build } from "../../platform/build.vibe";
import { Native } from "../../platform/native.vibe";
import { Appearance } from "../../settings/appearance.vibe";
import { Diagnostics } from "../../settings/diagnostics.vibe";
import { DeviceFacts } from "../../settings/facts.vibe";
import { Wifi } from "../../settings/network.vibe";
import { Vault } from "../../settings/passwords.vibe";
import { Preferences } from "../../settings/preferences.vibe";
import { PrivacyRow } from "../../settings/privacy.vibe";
import { Reset } from "../../settings/reset.vibe";
import { Updates } from "../../settings/updates.vibe";
import type { AppScreen, AppSurface, ScreenProps } from "../app-screen.ts";
import type { DevCommand } from "./DeveloperPage.tsx";
import { PasswordsScreen } from "./PasswordsScreen.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";
import { UpdateActivation } from "./UpdateActivation.tsx";
import { type SettingsServices, perform, runtime } from "./runtime.ts";

const mocks = __ALPHA_TEST_MOCKS__;
const scheme = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : undefined;
const subscribeScheme = (changed: () => void) => { scheme?.addEventListener("change", changed); return () => scheme?.removeEventListener("change", changed); };
const systemDark = () => scheme?.matches === true;

/** The theme and legible text the shell draws its root with: `.dark` or `.light`, and `font-legible`. */
export function useAppearanceClass(): string {
  const { state = appearanceStart } = useAppearance(runtime);
  const isDark = dark({ ...state, systemDark: useSyncExternalStore(subscribeScheme, systemDark, () => false) });
  return `${isDark ? "dark" : "light"}${state.legible ? " font-legible" : ""}`;
}

function SettingsApp({ route, onClose }: ScreenProps) {
  const [navigation] = useState(() => ManagedRuntime.make(navigationMachine({
    ...navigationStart, developer: mocks, page: route !== undefined && listedSection(route as Page) ? (route as Page) : "Root",
  })));
  const nav = useNavigation(navigation);
  useState(() => perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.show())));
  const close = () => { void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.hide())); onClose(); };
  const facts = useFacts(runtime).state ?? factsStart;
  const appearance = useAppearance(runtime).state ?? appearanceStart;
  const preferences = usePreferences(runtime);
  const network = useNetwork(runtime).state ?? networkStart;
  const updates = useUpdates(runtime).state ?? updatesStart;
  const reset = useReset(runtime).state ?? resetStart;
  const privacyMachine = usePrivacy(runtime);
  const diagnostics = useDiagnostics(runtime);
  const isDark = useSyncExternalStore(subscribeScheme, systemDark, () => false);
  const [offerLabel, setOfferLabel] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<"app" | "development">(() => new URLSearchParams(location.search).get("mode") === "dev" ? "development" : "app");
  const variant = runtime.runSync(Effect.map(Effect.service(Build), (b) => b.info.variant));
  const sync = <A,>(use: Effect.Effect<A, never, SettingsServices>) => runtime.runSync(use);
  const readable = sync(Effect.flatMap(Effect.service(Preferences), (p) => Effect.map(p.current(), (c) => c.readable)));
  const route_ = sync(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.route()));
  if (nav.state?.page === "Passwords") return <PasswordsApp onClose={() => void nav.send({ type: "back" })} />;
  return (
    <SettingsScreen
      model={{
        nav: nav.state ?? { ...navigationStart, developer: mocks }, facts, appearance, systemDark: isDark,
        preferences: { value: preferences.state ?? preferencesStart, readable: preferences.cause === undefined && readable },
        network, updates, offerLabel, reset, variant,
      }}
      act={{
        navigate: (event) => {
          void nav.send(event);
          if (event.type === "open" && event.page === "Network") void perform(Effect.flatMap(Effect.service(Wifi), (w) => Effect.andThen(w.readConnectivity(), w.scan())));
          if (event.type === "open" && event.page === "General") void perform(Effect.flatMap(Effect.service(Updates), (u) => Effect.map(u.offer(), (o) => setOfferLabel(o === undefined ? undefined : o.versionName ? `${o.versionName} (${o.versionCode})` : String(o.versionCode)))));
          if (event.type === "open" && event.page === "Privacy") void perform(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.readListener()));
        },
        openPage: (page) => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.openPage(page))),
        openShade: () => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.openShade())),
        openAppInfo: () => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.openAppInfo())),
        askHome: () => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.askHome())),
        textScale: (percent) => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.requestScale(percent))),
        choose: (choice) => void perform(Effect.flatMap(Effect.service(Appearance), (a) => a.choose(choice))),
        legible: (on) => void perform(Effect.flatMap(Effect.service(Appearance), (a) => a.setLegible(on))),
        preference: (preference, on) => void perform(Effect.flatMap(Effect.service(Preferences), (p) => Effect.ignore(p.set(preference, on)))),
        resetPreferences: () => void perform(Effect.flatMap(Effect.service(Preferences), (p) => p.reset())),
        scan: () => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.scan())),
        join: (name, security, passphrase) => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.join(name, security, passphrase))),
        openPanel: () => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.openPanel())),
        check: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => Effect.andThen(u.check(true), Effect.map(u.offer(), (o) => setOfferLabel(o === undefined ? undefined : o.versionName ? `${o.versionName} (${o.versionCode})` : String(o.versionCode)))))),
        install: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.install())),
        allowAutomatic: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.allowAutomatic())),
        eraseAll: () => void perform(Effect.flatMap(Effect.service(Reset), (r) => r.review())),
        openPasswords: () => void nav.send({ type: "open", page: "Passwords" }),
      }}
      onClose={close}
      privacy={{ route: route_, listener: privacyMachine.state ?? privacyStart, aosp: variant === "aosp" }}
      privacyActs={{
        stop: (stop) => void perform(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.stop(stop))),
        listenerSettings: () => void perform(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.openListenerSettings())),
      }}
      diagnostics={diagnostics.state ?? diagnosticsStart}
      aboutActs={{
        readLog: () => void perform(Effect.flatMap(Effect.service(Diagnostics), (d) => d.readLog())),
        askClear: () => void diagnostics.send({ type: "askClear" }),
        cancelClear: () => void diagnostics.send({ type: "cancelClear" }),
        clear: () => void perform(Effect.flatMap(Effect.service(Diagnostics), (d) => d.clearLog())),
        exportReport: () => void perform(Effect.flatMap(Effect.service(Diagnostics), (d) => d.exportReport(facts.read))),
        loadLicences: () => void perform(Effect.flatMap(Effect.service(Diagnostics), (d) => d.loadLicences())),
      }}
      developerActs={{
        profile,
        command: (command: DevCommand) => { if (mocks) window.dispatchEvent(new CustomEvent("alpha:dev-command", { detail: command })); },
        requestRole: (role) => { if (mocks) void perform(Effect.flatMap(Effect.service(Native), (n) => Effect.ignore(n.invoke("ElizaSystem", "requestRole", { role })))); },
        toggleProfile: () => { if (!mocks) return; const url = new URL(location.href); if (profile === "development") url.searchParams.delete("mode"); else url.searchParams.set("mode", "dev"); setProfile(profile === "development" ? "app" : "development"); location.assign(url.href); },
      }}
    />
  );
}

function PasswordsApp({ onClose }: ScreenProps) {
  const vault = useVault(runtime);
  const [opened] = useState(() => perform(Effect.flatMap(Effect.service(Vault), (v) => v.open())));
  const close = () => { void opened.then(() => perform(Effect.flatMap(Effect.service(Vault), (v) => v.leave()))); onClose(); };
  return (
    <PasswordsScreen vault={vault.state ?? vaultStart} onClose={close} acts={{
      run: (task, id) => void perform(Effect.flatMap(Effect.service(Vault), (v) => v.run(task, id))),
      edit: (id) => void perform(Effect.flatMap(Effect.service(Vault), (v) => v.edit(id))),
      askRemove: (id) => void vault.send({ type: "askRemove", id }),
      askReset: () => void vault.send({ type: "askReset" }),
      refresh: () => void perform(Effect.flatMap(Effect.service(Vault), (v) => Effect.andThen(v.leave(), v.open()))),
    }} />
  );
}

function UpdateSurface() {
  const updates = useUpdates(runtime).state ?? updatesStart;
  return <UpdateActivation updates={updates} onContinue={() => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.continueInstall()))} />;
}

/** Settings and Passwords. */
export const screens: AppScreen[] = [
  { id: "settings", title: "Settings", icon: Gear, availability: "everywhere", Screen: SettingsApp },
  { id: "passwords", title: "Passwords", icon: KeyRound, availability: "everywhere", Screen: PasswordsApp },
];

/** The update activation hold, above every screen. */
export const surfaces: AppSurface[] = [
  { id: "settings-update-activation", slot: "overlay", availability: "everywhere", Surface: UpdateSurface },
];
