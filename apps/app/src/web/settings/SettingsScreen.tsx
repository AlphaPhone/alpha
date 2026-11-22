// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/facts.md, "Story: Read my phone's state truthfully"; spec/settings/appearance.md, "Story: Choose how Alpha looks"; spec/settings/preferences.md, "Story: Decide what Alpha may do without asking"; spec/settings/network.md, "Story: Join a nearby network"; spec/settings/updates.md, "Story: Update Alpha when I choose"; spec/settings/reset.md, "Story: Erase Alpha's data on purpose"
import { AppWindow, ArrowLeft, Bell, Download, Info, LayoutGrid, Monitor, RotateCw, Settings as Gear, Shield, Trash2, Wifi as WifiIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { Settings, Page } from "../../../gen/settings.ts";
import type { Appearance, Choice } from "../../../gen/settings__appearance.ts";
import { dark } from "../../../gen/settings__appearance.ts";
import type { Facts, SettingsPage } from "../../../gen/settings__facts.ts";
import { broaderNotice, storageKnown, textScales } from "../../../gen/settings__facts.ts";
import type { Network, Nearby, Security } from "../../../gen/settings__network.ts";
import type { Preference, Preferences } from "../../../gen/settings__preferences.ts";
import type { ResetReview } from "../../../gen/settings__reset.ts";
import type { Updates } from "../../../gen/settings__updates.ts";
import { Alert, Button, Dialog, DialogContent, DialogTitle, Input, RadioGroup, RadioGroupItem, ScrollArea } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { AboutPages, type AboutPagesProps } from "./AboutPages.tsx";
import { DeveloperPage, type DeveloperPageProps } from "./DeveloperPage.tsx";
import { PrivacyPages, type PrivacyPagesProps } from "./PrivacyPages.tsx";
import { Section, SettingRow, ToggleRow } from "./Rows.tsx";
import { ACCESS, BROADER, JOIN, ONLINE, OUTCOME, PERMISSION, RESET, ROLE, SWITCH } from "./words.ts";

const TITLES: Record<Page, string> = {
  Root: "Settings", General: "General", Display: "Display", Network: "Wi-Fi", Privacy: "Privacy", Permissions: "App permissions",
  Apps: "Apps", Passwords: "Passwords", About: "About", Problems: "Problem log", Licenses: "Licenses", LicenseDetail: "License", Developer: "Developer",
};
const SIZES: Record<number, string> = { 75: "Small", 100: "Default", 115: "Large", 130: "Larger", 150: "Largest" };

/** Everything the Settings pages show, each from its own Machine. */
export interface SettingsModel {
  readonly nav: Settings;
  readonly facts: Facts;
  readonly appearance: Appearance;
  readonly systemDark: boolean;
  readonly preferences: { readonly value: Preferences; readonly readable: boolean };
  readonly network: Network;
  readonly updates: Updates;
  readonly offerLabel?: string;
  readonly reset: ResetReview;
  readonly variant: "launcher" | "aosp" | "browser";
}

/** What the owner can do on the Settings pages. */
export interface SettingsActions {
  readonly navigate: (event: { type: "open" | "openSection"; page: Page } | { type: "back" } | { type: "openLicence"; index: number }) => void;
  readonly openPage: (page: SettingsPage) => void;
  readonly openShade: () => void;
  readonly openAppInfo: () => void;
  readonly askHome: () => void;
  readonly textScale: (percent: number) => void;
  readonly choose: (choice: Choice) => void;
  readonly legible: (on: boolean) => void;
  readonly preference: (preference: Preference, on: boolean) => void;
  readonly resetPreferences: () => void;
  readonly scan: () => void;
  readonly join: (name: string, security: Security, passphrase: string) => void;
  readonly openPanel: () => void;
  readonly check: () => void;
  readonly install: () => void;
  readonly allowAutomatic: () => void;
  readonly eraseAll: () => void;
  readonly openPasswords: () => void;
}

export type SettingsScreenProps = { readonly model: SettingsModel; readonly act: SettingsActions; readonly onClose: () => void }
  & Pick<PrivacyPagesProps, "privacy"> & Pick<AboutPagesProps, "diagnostics" | "aboutActs"> & Pick<DeveloperPageProps, "developerActs"> & Pick<PrivacyPagesProps, "privacyActs">;

/**
 * Alpha's Settings: the root, its categories and their pages.
 * @model spec/settings/index.md
 * @design design.md
 */
export function SettingsScreen({ model, act, onClose, privacy, privacyActs, diagnostics, aboutActs, developerActs }: SettingsScreenProps) {
  const { nav } = model;
  const native = model.variant !== "browser";
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-2 py-3">
        <Button variant="ghost" size="icon" aria-label={nav.page === "Root" ? "Close Settings" : "Back"} onClick={() => (nav.page === "Root" ? onClose() : act.navigate({ type: "back" }))}>
          <ArrowLeft aria-hidden className="size-5" />
        </Button>
        <h1 className="font-serif text-2xl">{TITLES[nav.page]}</h1>
      </header>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 px-3 pb-8">
          {nav.page === "Root" && <Root nav={nav} native={native} act={act} />}
          {nav.page === "General" && <General model={model} act={act} native={native} />}
          {nav.page === "Display" && <Display model={model} act={act} native={native} />}
          {nav.page === "Network" && <WifiPage network={model.network} act={act} />}
          {nav.page === "Apps" && <Section><SettingRow label="Passwords" onOpen={act.openPasswords} /></Section>}
          {(nav.page === "Privacy" || nav.page === "Permissions") && (
            <PrivacyPages page={nav.page} facts={model.facts} preferences={model.preferences} native={native} privacy={privacy} privacyActs={privacyActs}
              onPermissions={() => act.navigate({ type: "open", page: "Permissions" })} onPreference={act.preference} onResetPreferences={act.resetPreferences} onHandoff={act.openPage} />
          )}
          {(nav.page === "About" || nav.page === "Problems" || nav.page === "Licenses" || nav.page === "LicenseDetail") && (
            <AboutPages nav={nav} facts={model.facts} native={native} diagnostics={diagnostics} aboutActs={aboutActs} navigate={act.navigate} onAppInfo={act.openAppInfo} />
          )}
          {nav.page === "Developer" && nav.developer && <DeveloperPage developerActs={developerActs} />}
        </div>
      </ScrollArea>
    </div>
  );
}

function Root({ nav, native, act }: { readonly nav: Settings; readonly native: boolean; readonly act: SettingsActions }) {
  const open = (page: Page) => () => act.navigate({ type: "open", page });
  return (
    <>
      <Section>
        <SettingRow label="General" icon={<Gear aria-hidden className="size-5" />} onOpen={open("General")} />
        <SettingRow label="Privacy" icon={<Shield aria-hidden className="size-5" />} onOpen={open("Privacy")} />
        <SettingRow label="Apps" icon={<LayoutGrid aria-hidden className="size-5" />} onOpen={open("Apps")} />
        <SettingRow label="About" icon={<Info aria-hidden className="size-5" />} onOpen={open("About")} />
      </Section>
      {native && <Section><SettingRow label="Android settings" ariaLabel="Open Android settings" onHandoff={() => act.openPage("PageHome")} /></Section>}
      {nav.developer && <Section><SettingRow label="Developer" onOpen={open("Developer")} /></Section>}
    </>
  );
}

function General({ model, act, native }: { readonly model: SettingsModel; readonly act: SettingsActions; readonly native: boolean }) {
  const { facts, updates, reset } = model;
  const read = facts.read;
  const [erasing, setErasing] = useState(false);
  const notice = facts.handoff.tag === "HandoffOpened" ? BROADER[broaderNotice("PageHome", facts.handoff.specific)] : "";
  const canAskHome = read.launcher && !facts.roleAsking && (read.home === "NotHeldByAlpha" || read.home === "HeldElsewhere");
  return (
    <>
      <Section caption="Preferences">
        <SettingRow label="Display" icon={<Monitor aria-hidden className="size-5" />} onOpen={() => act.navigate({ type: "open", page: "Display" })} />
        {native && <SettingRow label="Notifications" icon={<Bell aria-hidden className="size-5" />} state={ACCESS[read.notifications]} onHandoff={() => act.openPage("PageNotifications")} ariaLabel="Manage Alpha notifications in Android" />}
      </Section>
      {native && (
        <Section caption="Device">
          <SettingRow label="Wi-Fi" icon={<WifiIcon aria-hidden className="size-5" />} state={SWITCH[read.wifi]} onOpen={() => act.navigate({ type: "open", page: "Network" })} />
          <SettingRow label="Bluetooth" state={SWITCH[read.bluetooth]} onHandoff={() => act.openPage("PageBluetooth")} ariaLabel={`Bluetooth, ${SWITCH[read.bluetooth].word}, opens Android settings`} />
          <SettingRow label="Airplane mode" state={SWITCH[read.airplane]} onHandoff={() => act.openPage("PageAirplane")} ariaLabel={`Airplane mode, ${SWITCH[read.airplane].word}, opens Android settings`} />
          <SettingRow label="Do Not Disturb" state={SWITCH[read.dnd]} onHandoff={() => act.openPage("PageDnd")} ariaLabel={`Do Not Disturb, ${SWITCH[read.dnd].word}, opens Android settings`} />
          <SettingRow label="Notifications shade" onHandoff={act.openShade} />
          {storageKnown(read) && <SettingRow label="Storage" state={{ word: `${Math.round((read.storageUsed * 100) / read.storageTotal)}%` }} onHandoff={() => act.openPage("PageBattery")} ariaLabel="Storage, opens Android settings" />}
          <SettingRow label="Home app" state={ROLE[read.home]} />
          <SettingRow label="Assistant app" state={ROLE[read.assistant]} />
          {canAskHome && <SettingRow label="Set as Home" ariaLabel="Make Alpha your Home app" busy={facts.roleAsking} onOpen={act.askHome} />}
          <SettingRow label="Default apps" onHandoff={() => act.openPage("PageDefaultApps")} ariaLabel="Default apps in Android" />
          {notice && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">{notice}</p>}
        </Section>
      )}
      {native && (
        <Section caption="Updates">
          {updates.permission === "PermissionRequired"
            ? <SettingRow label="Allow automatic updates" icon={<Shield aria-hidden className="size-5" />} onHandoff={act.allowAutomatic} />
            : PERMISSION[updates.permission].word && <SettingRow label="Automatic updates" state={PERMISSION[updates.permission]} />}
          {model.offerLabel && updates.offer > updates.installed && !updates.pending && (
            <SettingRow label="Update" icon={<Download aria-hidden className="size-5" />} state={{ word: model.offerLabel }} busy={updates.busy === "Installing"}
              disabled={updates.busy !== "Idle"} ariaLabel={updates.busy === "Installing" ? "Downloading update" : "Install update"} onOpen={act.install} />
          )}
          <SettingRow label="Check" icon={<RotateCw aria-hidden className="size-5" />} busy={updates.busy === "Checking"} disabled={updates.busy !== "Idle"}
            ariaLabel={updates.busy === "Checking" ? "Checking for updates" : "Check for updates"} onOpen={act.check} />
          {OUTCOME[updates.outcome] && <p role="status" aria-live="polite" className="px-4 py-2 text-sm text-muted-foreground">{OUTCOME[updates.outcome]}</p>}
        </Section>
      )}
      {native && (
        <Section caption="Reset">
          <SettingRow label="Erase all data" ariaLabel="Reset Alpha data" destructive icon={<Trash2 aria-hidden className="size-5 text-destructive" />}
            busy={reset.open} onOpen={() => setErasing(true)} />
          {RESET[reset.notice] && <Alert role="alert">{RESET[reset.notice]}</Alert>}
        </Section>
      )}
      <Dialog open={erasing} onOpenChange={setErasing}>
        <DialogContent>
          <DialogTitle>Erase all of Alpha’s data?</DialogTitle>
          <p className="text-sm text-muted-foreground">Android asks for your screen lock next.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setErasing(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setErasing(false); act.eraseAll(); }}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Display({ model, act, native }: { readonly model: SettingsModel; readonly act: SettingsActions; readonly native: boolean }) {
  const { appearance, facts } = model;
  const isDark = dark({ ...appearance, systemDark: model.systemDark });
  const choices: [Choice, string][] = [["FollowSystem", "System"], ["Light", "Light"], ["Dark", "Dark"]];
  return (
    <>
      <Section caption="Theme">
        <RadioGroup className="grid grid-cols-3 gap-2 p-3" value={appearance.choice} aria-label={`Theme, ${isDark ? "dark" : "light"} now`} onValueChange={(value) => act.choose(value as Choice)}>
          {choices.map(([value, label]) => (
            <label key={value} className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <RadioGroupItem value={value} aria-label={`Theme: ${label}`} />{label}
            </label>
          ))}
        </RadioGroup>
        <ToggleRow label="Legible text" on={appearance.legible} onChange={act.legible} />
      </Section>
      {native && (
        <Section caption="Text size">
          <div role="radiogroup" aria-label="Text size" className="flex items-end justify-between gap-1 p-3">
            {[...textScales].sort((a, b) => a - b).map((percent) => (
              <button key={percent} type="button" role="radio" aria-checked={facts.read.textScale === percent} aria-label={`Text size: ${SIZES[percent]}`}
                className={cn("flex min-h-12 flex-1 items-center justify-center rounded-lg font-serif", facts.read.textScale === percent ? "bg-primary text-primary-foreground" : "bg-secondary")}
                style={{ fontSize: `${percent}%` }} onClick={() => act.textScale(percent)}>Aa</button>
            ))}
          </div>
          <SettingRow label="Brightness" state={facts.read.brightnessAuto === "On" ? { word: "Auto" } : undefined} onHandoff={() => act.openPage("PageDisplay")} ariaLabel="Manage brightness in Android" />
        </Section>
      )}
    </>
  );
}

function WifiPage({ network, act }: { readonly network: Network; readonly act: SettingsActions }) {
  const [chosen, setChosen] = useState<Nearby | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem("passphrase");
    const passphrase = field instanceof HTMLInputElement ? field.value : "";
    if (field instanceof HTMLInputElement) field.value = "";
    if (chosen) act.join(chosen.name, chosen.secured ? "Wpa2" : "OpenNet", passphrase);
    setChosen(null);
  };
  const scanWord = { NotScanned: "", Scanning: "", Found: "", NeedsLocation: "Allow precise location to see networks", LocationOff: "Turn on Location to see networks", ScanUnavailable: "Scanning isn’t available" }[network.scan];
  return (
    <>
      <Section>
        <SettingRow label="Internet" state={ONLINE[network.online]} onHandoff={act.openPanel} ariaLabel={`Internet, ${ONLINE[network.online].word}, opens Android's Internet panel`} />
        {network.join !== "JoinIdle" && <SettingRow label={network.network} state={JOIN[network.join]} onHandoff={network.join === "AlreadySaved" ? act.openPanel : undefined} />}
      </Section>
      <Section caption="Nearby">
        {network.networks.map((n) => (
          <SettingRow key={n.name} label={n.name} state={{ word: n.secured ? "Secured" : "Open" }} disabled={!n.joinable || network.join === "AwaitingAndroid"} onOpen={() => (n.secured ? setChosen(n) : act.join(n.name, "OpenNet", ""))} />
        ))}
        <SettingRow label="Scan" icon={<RotateCw aria-hidden className="size-5" />} busy={network.scan === "Scanning"} ariaLabel="Scan for networks" onOpen={act.scan} />
        {scanWord && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">{scanWord}</p>}
      </Section>
      <Dialog open={chosen !== null} onOpenChange={(open) => { if (!open) setChosen(null); }}>
        <DialogContent>
          <DialogTitle>{chosen?.name}</DialogTitle>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Input name="passphrase" type="password" autoComplete="off" aria-label="Network password" />
            <Button type="submit">Join</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

