// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/index.md, "A page opens from its parent, and Back returns to that parent"; spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"; spec/settings/passwords.md, "Android's Back cancels a pending confirmation first, then closes the entry shown"; spec/settings/updates.md, "Story: Let Android finish an update without losing what I typed"
import { Effect } from "effect";
import { KeyRound, Settings as Gear } from "lucide-react";
import { useState } from "react";
import { useMachine as useNavigation } from "../../../gen/settings.react.ts";
import { initial as navigationStart } from "../../../gen/settings.ts";
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
import { SettingsPages } from "../../settings/navigation.vibe";
import { Wifi } from "../../settings/network.vibe";
import { Vault } from "../../settings/passwords.vibe";
import { Preferences } from "../../settings/preferences.vibe";
import { PrivacyRow } from "../../settings/privacy.vibe";
import { Reset } from "../../settings/reset.vibe";
import { Updates } from "../../settings/updates.vibe";
import { useAccountRows } from "../account/index.tsx";
import type { AppScreen, AppSurface, ScreenProps } from "../app-screen.ts";
import { NotificationsSettings } from "../shell/NotificationsPage.tsx";
import { CarrierSetupPanel } from "./CarrierSetupPanel.tsx";
import type { DevCommand } from "./DeveloperPage.tsx";
import { backDialog, closeDialog, openDialog, useDialog } from "./dialogs.ts";
import { PasswordsScreen } from "./PasswordsScreen.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";
import { UpdateActivation } from "./UpdateActivation.tsx";
import { now, perform } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { testMocksBuilt } from "../../platform/build-flags.ts";

const mocks = testMocksBuilt;

const pages = <A,>(use: (p: SettingsPages.Shape) => Effect.Effect<A>) => perform(Effect.flatMap(Effect.service(SettingsPages), use));

/** Settings' Back: the shown page's dialog, then the vault's or the problem log's own, then one page up; false on the root. */
async function settingsBack(): Promise<boolean> {
  const nav = await pages((p) => p.current());
  if (backDialog(nav)) return true;
  return pages((p) => p.back());
}

/** The Passwords app's Back: a pending confirmation, then an open entry; false on the list, where Back leaves. */
function passwordsBack(): Promise<boolean> {
  return perform(Effect.flatMap(Effect.service(Vault), (v) => v.back()));
}

/** The theme and legible text the shell draws its root with: `.dark` or `.light`, and `font-legible`. */
export function useAppearanceClass(): string {
  const { state = appearanceStart } = useAppearance(runtime);
  return `${dark(state) ? "dark" : "light"}${state.legible ? " font-legible" : ""}`;
}

function SettingsApp({ onClose }: ScreenProps) {
  const nav = useNavigation(runtime).state ?? { ...navigationStart, developer: mocks };
  const facts = useFacts(runtime).state ?? factsStart;
  const appearance = useAppearance(runtime).state ?? appearanceStart;
  const preferences = usePreferences(runtime);
  const network = useNetwork(runtime).state ?? networkStart;
  const updates = useUpdates(runtime).state ?? updatesStart;
  const reset = useReset(runtime).state ?? resetStart;
  const privacyMachine = usePrivacy(runtime);
  const diagnostics = useDiagnostics(runtime);
  const [profile, setProfile] = useState<"app" | "development">(() => new URLSearchParams(location.search).get("mode") === "dev" ? "development" : "app");
  const variant = now(Effect.map(Effect.service(Build), (b) => b.info.variant), "browser");
  const readable = now(Effect.flatMap(Effect.service(Preferences), (p) => Effect.map(p.current(), (c) => c.readable)), false);
  const route = now(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.route()), "RouteUnavailable");
  const account = useAccountRows();
  const dialog = useDialog(nav);
  if (nav.page === "Passwords") return <PasswordsApp onClose={() => void pages((p) => p.back())} />;
  return (
    <SettingsScreen
      model={{
        nav, facts, appearance, network, updates, reset, variant, account,
        preferences: { value: preferences.state ?? preferencesStart, readable: preferences.cause === undefined && readable },
      }}
      act={{
        open: (page) => void pages((p) => p.open(page)),
        back: () => void pages((p) => p.back()),
        openLicence: (index) => void pages((p) => p.openLicence(index)),
        openApp: (app) => void pages((p) => p.openApp(app)),
        openAccount: (section) => void pages((p) => p.openAccount(section)),
        openElsewhere: (elsewhere) => void pages((p) => p.openElsewhere(elsewhere)),
        accessSetup: () => void pages((p) => p.accessSetup()),
        openPage: (page) => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.openPage(page))),
        openShade: () => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.openShade())),
        askHome: () => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.askHome())),
        textScale: (percent) => void perform(Effect.flatMap(Effect.service(DeviceFacts), (f) => f.requestScale(percent))),
        choose: (choice) => void perform(Effect.flatMap(Effect.service(Appearance), (a) => a.choose(choice))),
        legible: (on) => void perform(Effect.flatMap(Effect.service(Appearance), (a) => a.setLegible(on))),
        preference: (preference, on) => void perform(Effect.flatMap(Effect.service(Preferences), (p) => Effect.ignore(p.set(preference, on)))),
        resetPreferences: () => void perform(Effect.flatMap(Effect.service(Preferences), (p) => p.reset())),
        scan: () => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.scan())),
        join: (name, security, passphrase) => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.join(name, security, passphrase))),
        openPanel: () => void perform(Effect.flatMap(Effect.service(Wifi), (w) => w.openPanel())),
        check: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.check(true))),
        install: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.install())),
        allowAutomatic: () => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.allowAutomatic())),
        eraseAll: () => void perform(Effect.flatMap(Effect.service(Reset), (r) => r.review())),
      }}
      onClose={onClose}
      dialog={dialog}
      onDialog={(next) => (next === undefined ? closeDialog() : openDialog(nav, next))}
      notifications={<NotificationsSettings />}
      carrier={<CarrierSetupPanel native={variant !== "browser"} />}
      privacy={{ route, listener: privacyMachine.state ?? privacyStart, aosp: variant === "aosp" }}
      privacyActs={{
        stop: (stop) => void perform(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.stop(stop))),
        listenerSettings: () => void perform(Effect.flatMap(Effect.service(PrivacyRow), (p) => p.openListenerSettings())),
      }}
      diagnostics={diagnostics.state ?? diagnosticsStart}
      aboutActs={{
        readLog: () => void perform(Effect.flatMap(Effect.service(Diagnostics), (d) => d.readLog(true))),
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
  return (
    <PasswordsScreen vault={vault.state ?? vaultStart} onClose={onClose} acts={{
      run: (task, id) => void perform(Effect.flatMap(Effect.service(Vault), (v) => v.run(task, id))),
      edit: (id) => void perform(Effect.flatMap(Effect.service(Vault), (v) => v.edit(id))),
      askRemove: (id) => void vault.send({ type: "askRemove", id }),
      askReset: () => void vault.send({ type: "askReset" }),
      openEntry: (id) => void vault.send({ type: "openEntry", id }),
      closeEntry: () => void vault.send({ type: "closeEntry" }),
      refresh: () => void perform(Effect.flatMap(Effect.service(Vault), (v) => Effect.andThen(v.leave(), v.open()))),
    }} />
  );
}

function UpdateSurface() {
  const updates = useUpdates(runtime).state ?? updatesStart;
  return <UpdateActivation updates={updates} onContinue={() => void perform(Effect.flatMap(Effect.service(Updates), (u) => u.continueInstall()))} />;
}

/** Settings and Passwords; Android's Back closes what a page holds open, pops one Settings page, and leaves from the root or the vault's list. */
export const screens: AppScreen[] = [
  { id: "settings", title: "Settings", icon: Gear, availability: "everywhere", Screen: SettingsApp, back: () => settingsBack().catch(() => false) },
  { id: "passwords", title: "Passwords", icon: KeyRound, availability: "everywhere", Screen: PasswordsApp, back: () => passwordsBack().catch(() => false) },
];

/** The update activation hold, above every screen. */
export const surfaces: AppSurface[] = [
  { id: "settings-update-activation", slot: "overlay", availability: "everywhere", Surface: UpdateSurface },
];
