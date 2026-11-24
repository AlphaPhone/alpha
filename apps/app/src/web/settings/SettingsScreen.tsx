// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/facts.md, "Story: Read my phone's state truthfully"; spec/settings/facts.md, "Story: Make Alpha my Home app"; spec/settings/facts.md, "Story: Go to Android's own page"; spec/settings/appearance.md, "Story: Choose how Alpha looks"; spec/settings/preferences.md, "Story: Decide what Alpha may do without asking"; spec/settings/network.md, "Story: Join a nearby network"; spec/settings/updates.md, "Story: Update Alpha when I choose"; spec/settings/reset.md, "Story: Erase Alpha's data on purpose"; spec/settings/index.md, "General's Phone row opens Phone's line details on the Alpha image only, and About's Agent activity opens the assistant's activity on the phone"
import {
  AppWindow, ArrowLeft, Bell, Bot, Camera, Download, Globe, Info, LayoutGrid, Link, Mail, MapPin, MessageSquare, Mic, MicOff,
  Monitor, NotebookText, Calendar, Folder, Images, KeyRound, Phone, RotateCw, Settings as Gear, Shield, Trash2, UserRound, Workflow,
  Wifi as WifiIcon,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import type { AppRow, Elsewhere, Page, Settings } from "../../../gen/settings.ts";
import { appListed, elsewhereShown } from "../../../gen/settings.ts";
import type { Appearance, Choice } from "../../../gen/settings__appearance.ts";
import { dark, notSaved } from "../../../gen/settings__appearance.ts";
import type { Facts, SettingsPage } from "../../../gen/settings__facts.ts";
import { broaderNotice, scaleNotSaved, storageKnown, textScales } from "../../../gen/settings__facts.ts";
import type { Network, Nearby, Security } from "../../../gen/settings__network.ts";
import type { Preference, Preferences } from "../../../gen/settings__preferences.ts";
import { loadsMailImages } from "../../../gen/settings__preferences.ts";
import { micMayBeOn } from "../../../gen/settings__privacy.ts";
import type { ResetReview } from "../../../gen/settings__reset.ts";
import type { Updates } from "../../../gen/settings__updates.ts";
import { Alert, Button, Dialog, DialogContent, DialogTitle, Input, RadioGroup, RadioGroupItem, ScrollArea } from "../components/ui/index.ts";
import type { AccountRows } from "../../account/bindings.vibe";
import { cn } from "../lib/cn.ts";
import { AboutPages, type AboutPagesProps } from "./AboutPages.tsx";
import type { PageDialog } from "./dialogs.ts";
import { DeveloperPage, type DeveloperPageProps } from "./DeveloperPage.tsx";
import { PrivacyPages, type PrivacyPagesProps } from "./PrivacyPages.tsx";
import { Section, SettingRow, ToggleRow } from "./Rows.tsx";
import {
  ACCESS, BROADER, HANDOFF_UNAVAILABLE, JOIN, ONLINE, OUTCOME, PERMISSION, RESET, ROLE, ROLE_NOT_CHANGED, SCALE_NOT_SAVED, SHADE,
  SWITCH, THEME_NOT_SAVED,
} from "./words.ts";

const TITLES: Record<Page, string> = {
  Root: "Settings", General: "General", Display: "Display", Notifications: "Notifications", Network: "Wi-Fi", Carrier: "Carrier & SIM setup", Privacy: "Privacy", Permissions: "App permissions",
  Apps: "Apps", Passwords: "Passwords", AppInbox: "Inbox", AppCamera: "Camera", AppMaps: "Maps", AppNotes: "Notes", AppPhotos: "Photos",
  About: "About", Problems: "Problem log", Licenses: "Licenses", LicenseDetail: "License", Developer: "Developer",
};
const SIZES: Record<number, string> = { 75: "Small", 100: "Default", 115: "Large", 130: "Larger", 150: "Largest" };
const APP_ROWS: ReadonlyArray<readonly [AppRow, string, ReactNode]> = [
  ["RowBrowser", "Browser", <Globe aria-hidden className="size-5" />], ["RowCalendar", "Calendar", <Calendar aria-hidden className="size-5" />],
  ["RowCamera", "Camera", <Camera aria-hidden className="size-5" />], ["RowFiles", "Files", <Folder aria-hidden className="size-5" />],
  ["RowInbox", "Inbox", <Mail aria-hidden className="size-5" />], ["RowMaps", "Maps", <MapPin aria-hidden className="size-5" />],
  ["RowMessages", "Messages", <MessageSquare aria-hidden className="size-5" />], ["RowNotes", "Notes", <NotebookText aria-hidden className="size-5" />],
  ["RowPasswords", "Passwords", <KeyRound aria-hidden className="size-5" />], ["RowPhotos", "Photos", <Images aria-hidden className="size-5" />],
  ["RowWorkflows", "Workflows", <Workflow aria-hidden className="size-5" />],
];

/** Everything the Settings pages show, each from its own Machine. */
export interface SettingsModel {
  readonly nav: Settings;
  readonly facts: Facts;
  readonly appearance: Appearance;
  readonly preferences: { readonly value: Preferences; readonly readable: boolean };
  readonly network: Network;
  readonly updates: Updates;
  readonly reset: ResetReview;
  readonly variant: "launcher" | "aosp" | "browser";
  /** The account's words for the root's Account and AI provider rows. */
  readonly account: AccountRows;
}

/** What the owner can do on the Settings pages. */
export interface SettingsActions {
  /** Open a page from the one shown. */
  readonly open: (page: Page) => void;
  readonly back: () => void;
  readonly openLicence: (index: number) => void;
  /** An app's row on Apps: its page here, or the app itself. */
  readonly openApp: (app: AppRow) => void;
  /** Open the Account app at its plan, Google or AI provider section. */
  readonly openAccount: (section: "plans" | "google" | "provider") => void;
  /** General's Phone row or About's Agent activity: the app that answers it. */
  readonly openElsewhere: (elsewhere: Elsewhere) => void;
  /** Android's own page, Alpha's App info, or an Android access dialog. */
  readonly openPage: (page: SettingsPage) => void;
  readonly openShade: () => void;
  readonly askHome: () => void;
  readonly textScale: (percent: number) => void;
  readonly choose: (choice: Choice) => void;
  readonly legible: (on: boolean) => void;
  readonly preference: (preference: Preference, on: boolean) => void;
  readonly resetPreferences: () => void;
  readonly accessSetup: () => void;
  readonly scan: () => void;
  readonly join: (name: string, security: Security, passphrase: string) => void;
  readonly openPanel: () => void;
  readonly check: () => void;
  readonly install: () => void;
  readonly allowAutomatic: () => void;
  readonly eraseAll: () => void;
}

/** The Settings screen: every page's state, what the owner can do there, the dialog the shown page holds open, and the Privacy, About and Developer parts. */
export type SettingsScreenProps = {
  readonly model: SettingsModel;
  readonly act: SettingsActions;
  readonly onClose: () => void;
  readonly dialog: PageDialog | undefined;
  /** Open a dialog on the page shown, or close it with undefined. */
  readonly onDialog: (dialog: PageDialog | undefined) => void;
  /** The notifications page the app mounts for General's Notifications. */
  readonly notifications: ReactNode;
}
  & Pick<PrivacyPagesProps, "privacy" | "privacyActs"> & Pick<AboutPagesProps, "diagnostics" | "aboutActs"> & Pick<DeveloperPageProps, "developerActs">;

function handoffWord(facts: Facts): string {
  if (facts.handoff.tag === "HandoffRefused") return HANDOFF_UNAVAILABLE;
  if (facts.handoff.tag === "HandoffOpened") return BROADER[broaderNotice(facts.handoffPage, facts.handoff.specific)];
  return "";
}

/**
 * Alpha's Settings: the root, its categories and their pages.
 * @model spec/settings/index.md
 * @design design.md
 */
export function SettingsScreen({ model, act, onClose, dialog, onDialog, notifications, privacy, privacyActs, diagnostics, aboutActs, developerActs }: SettingsScreenProps) {
  const { nav, facts } = model;
  const native = model.variant !== "browser";
  const notices = [handoffWord(facts), SHADE[facts.shade], facts.roleRefused ? ROLE_NOT_CHANGED : ""].filter((n) => n !== "");
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-2 py-3">
        <Button variant="ghost" size="icon" aria-label={nav.page === "Root" ? "Close Settings" : "Back"} onClick={() => (nav.page === "Root" ? onClose() : act.back())}>
          <ArrowLeft aria-hidden className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">{TITLES[nav.page]}</h1>
      </header>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 px-3 pb-8">
          {notices.map((notice) => <p key={notice} role="status" aria-live="polite" className="px-4 text-sm text-muted-foreground">{notice}</p>)}
          {nav.page === "Root" && <Root nav={nav} native={native} account={model.account} act={act} micMayBeOn={micMayBeOn(privacy.listener)} />}
          {nav.page === "General" && <General model={model} act={act} native={native} erasing={dialog?.kind === "erase"} onDialog={onDialog} />}
          {nav.page === "Display" && <Display model={model} act={act} native={native} />}
          {nav.page === "Notifications" && notifications}
          {nav.page === "Network" && <WifiPage network={model.network} act={act} chosen={dialog?.kind === "join" ? dialog.network : undefined} onDialog={onDialog} />}
          {nav.page === "Apps" && <AppsPage aosp={model.variant === "aosp"} act={act} />}
          {(nav.page === "AppInbox" || nav.page === "AppCamera" || nav.page === "AppMaps" || nav.page === "AppNotes" || nav.page === "AppPhotos") && (
            <AppPage page={nav.page} model={model} act={act} native={native} />
          )}
          {(nav.page === "Privacy" || nav.page === "Permissions") && (
            <PrivacyPages page={nav.page} facts={facts} preferences={model.preferences} native={native} privacy={privacy} privacyActs={privacyActs}
              onPermissions={() => act.open("Permissions")} onPreference={act.preference} onResetPreferences={act.resetPreferences}
              onHandoff={act.openPage} onAccessSetup={act.accessSetup}
              resetAsked={dialog?.kind === "resetPreferences"} onAskReset={(open) => onDialog(open ? { kind: "resetPreferences" } : undefined)} />
          )}
          {(nav.page === "About" || nav.page === "Problems" || nav.page === "Licenses" || nav.page === "LicenseDetail") && (
            <AboutPages nav={nav} facts={facts} native={native} diagnostics={diagnostics} aboutActs={aboutActs}
              onOpen={act.open} onOpenLicence={act.openLicence} onAppInfo={() => act.openPage("PageAppInfo")}
              onActivity={elsewhereShown("AgentActivity", model.variant === "aosp", native) ? () => act.openElsewhere("AgentActivity") : undefined} />
          )}
          {nav.page === "Developer" && nav.developer && (
            <DeveloperPage developerActs={developerActs} version={facts.read.version} native={native} onHandoff={act.openPage} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Root({ nav, native, account, act, micMayBeOn: micOpen }: {
  readonly nav: Settings; readonly native: boolean; readonly account: AccountRows; readonly act: SettingsActions; readonly micMayBeOn: boolean;
}) {
  return (
    <>
      {micOpen && (
        <Section>
          <SettingRow label="Microphone" state={{ word: "Mic may be on", tone: "destructive" }} icon={<MicOff aria-hidden className="size-5" />}
            ariaLabel="Microphone may be on, open Android settings" onHandoff={() => act.openPage("PageHome")} />
        </Section>
      )}
      <Section>
        <SettingRow label="General" icon={<Gear aria-hidden className="size-5" />} onOpen={() => act.open("General")} />
        <SettingRow label="Privacy" icon={<Shield aria-hidden className="size-5" />} onOpen={() => act.open("Privacy")} />
        <SettingRow label="Apps" icon={<LayoutGrid aria-hidden className="size-5" />} onOpen={() => act.open("Apps")} />
        <SettingRow label="About" icon={<Info aria-hidden className="size-5" />} onOpen={() => act.open("About")} />
      </Section>
      <Section caption="Account">
        <SettingRow label="Account" icon={<UserRound aria-hidden className="size-5" />} state={{ word: account.account }} onOpen={() => act.openAccount("plans")} />
        <SettingRow label="Google & email" icon={<Link aria-hidden className="size-5" />} onOpen={() => act.openAccount("google")} />
        <SettingRow label="AI provider" icon={<Bot aria-hidden className="size-5" />} state={{ word: account.provider }} onOpen={() => act.openAccount("provider")} />
      </Section>
      {native && <Section><SettingRow label="Android settings" icon={<AppWindow aria-hidden className="size-5" />} ariaLabel="Open Android settings" onHandoff={() => act.openPage("PageHome")} /></Section>}
      {nav.developer && <Section><SettingRow label="Developer" onOpen={() => act.open("Developer")} /></Section>}
    </>
  );
}

function General({ model, act, native, erasing, onDialog }: {
  readonly model: SettingsModel; readonly act: SettingsActions; readonly native: boolean; readonly erasing: boolean;
  readonly onDialog: (dialog: PageDialog | undefined) => void;
}) {
  const { facts, updates, reset } = model;
  const read = facts.read;
  const canAskHome = read.launcher && !facts.roleAsking && (read.home === "NotHeldByAlpha" || read.home === "HeldElsewhere");
  const offerLabel = updates.offerName ? `${updates.offerName} (${updates.offer})` : String(updates.offer);
  return (
    <>
      <Section caption="Preferences">
        <SettingRow label="Display" icon={<Monitor aria-hidden className="size-5" />} onOpen={() => act.open("Display")} />
        <SettingRow label="Notifications" icon={<Bell aria-hidden className="size-5" />} state={native ? ACCESS[read.notifications] : undefined} onOpen={() => act.open("Notifications")} />
      </Section>
      {elsewhereShown("PhoneInfo", model.variant === "aosp", native) && (
        <Section><SettingRow label="Phone" icon={<Phone aria-hidden className="size-5" />} ariaLabel="Phone, SIM and carrier" onOpen={() => act.openElsewhere("PhoneInfo")} /></Section>
      )}
      {native && (
        <Section caption="Device">
          <SettingRow label="Wi-Fi" icon={<WifiIcon aria-hidden className="size-5" />} state={SWITCH[read.wifi]} onOpen={() => act.open("Network")} />
          <SettingRow label="Bluetooth" state={SWITCH[read.bluetooth]} onHandoff={() => act.openPage("PageBluetooth")} ariaLabel={`Bluetooth, ${SWITCH[read.bluetooth].word}, opens Android settings`} />
          <SettingRow label="Airplane mode" state={SWITCH[read.airplane]} onHandoff={() => act.openPage("PageAirplane")} ariaLabel={`Airplane mode, ${SWITCH[read.airplane].word}, opens Android settings`} />
          <SettingRow label="Do Not Disturb" state={SWITCH[read.dnd]} onHandoff={() => act.openPage("PageDnd")} ariaLabel={`Do Not Disturb, ${SWITCH[read.dnd].word}, opens Android settings`} />
          <SettingRow label="Notifications shade" onHandoff={act.openShade} />
          {storageKnown(read) && <SettingRow label="Storage" state={{ word: `${Math.round((read.storageUsed * 100) / read.storageTotal)}%` }} onHandoff={() => act.openPage("PageBattery")} ariaLabel="Storage, opens Android settings" />}
          <SettingRow label="Home app" state={ROLE[read.home]} />
          <SettingRow label="Assistant app" state={ROLE[read.assistant]} />
          {(canAskHome || facts.roleAsking) && <SettingRow label="Set as Home" ariaLabel="Make Alpha your Home app" busy={facts.roleAsking} onOpen={act.askHome} />}
          <SettingRow label="Default apps" onHandoff={() => act.openPage("PageDefaultApps")} ariaLabel="Default apps in Android" />
        </Section>
      )}
      {native && (
        <Section caption="Updates">
          {updates.permission === "PermissionRequired"
            ? <SettingRow label="Allow automatic updates" icon={<Shield aria-hidden className="size-5" />} onHandoff={act.allowAutomatic} />
            : PERMISSION[updates.permission].word && <SettingRow label="Automatic updates" state={PERMISSION[updates.permission]} />}
          {updates.offer > updates.installed && !updates.pending && (
            <SettingRow label="Update" icon={<Download aria-hidden className="size-5" />} state={{ word: offerLabel }} busy={updates.busy === "Installing"}
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
            busy={reset.open} onOpen={() => onDialog({ kind: "erase" })} />
          {RESET[reset.notice] && <Alert role="alert">{RESET[reset.notice]}</Alert>}
        </Section>
      )}
      <Dialog open={erasing} onOpenChange={(open) => onDialog(open ? { kind: "erase" } : undefined)}>
        <DialogContent>
          <DialogTitle>Erase all of Alpha’s data?</DialogTitle>
          <p className="text-sm text-muted-foreground">Android asks for your screen lock next.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onDialog(undefined)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onDialog(undefined); act.eraseAll(); }}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Display({ model, act, native }: { readonly model: SettingsModel; readonly act: SettingsActions; readonly native: boolean }) {
  const { appearance, facts } = model;
  const isDark = dark(appearance);
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
        {notSaved(appearance) && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">{THEME_NOT_SAVED}</p>}
      </Section>
      {native && (
        <Section caption="Text size">
          <div role="radiogroup" aria-label="Text size" className="flex items-end justify-between gap-1 p-3">
            {[...textScales].sort((a, b) => a - b).map((percent) => (
              <button key={percent} type="button" role="radio" aria-checked={facts.read.textScale === percent}
                aria-label={`Text size: ${SIZES[percent]}${facts.read.textScale === percent ? ", selected" : ""}`}
                className={cn("flex min-h-12 flex-1 items-center justify-center rounded-lg font-display", facts.read.textScale === percent ? "bg-primary text-primary-foreground" : "bg-secondary")}
                style={{ fontSize: `${percent}%` }} onClick={() => act.textScale(percent)}>Aa</button>
            ))}
          </div>
          {scaleNotSaved(facts) && <p role="status" aria-live="polite" className="px-4 py-2 text-sm text-muted-foreground">{SCALE_NOT_SAVED}</p>}
          <SettingRow label="Brightness" state={facts.read.brightnessAuto === "On" ? { word: "Auto" } : undefined} onHandoff={() => act.openPage("PageDisplay")} ariaLabel="Manage brightness in Android" />
        </Section>
      )}
    </>
  );
}

function AppsPage({ aosp, act }: { readonly aosp: boolean; readonly act: SettingsActions }) {
  return (
    <Section>
      {APP_ROWS.filter(([app]) => appListed(app, aosp)).map(([app, label, icon]) => <SettingRow key={app} label={label} icon={icon} onOpen={() => act.openApp(app)} />)}
    </Section>
  );
}

function AppPage({ page, model, act, native }: { readonly page: "AppInbox" | "AppCamera" | "AppMaps" | "AppNotes" | "AppPhotos"; readonly model: SettingsModel; readonly act: SettingsActions; readonly native: boolean }) {
  const read = model.facts.read;
  const { value, readable } = model.preferences;
  const permission = (label: string, access: keyof typeof ACCESS, icon: ReactNode) => (
    <SettingRow key={label} label={label} state={ACCESS[access]} icon={icon} onHandoff={native ? () => act.openPage("PagePrivacy") : undefined}
      ariaLabel={`${label}, ${ACCESS[access].word}${native ? ", opens Android settings" : ""}`} />
  );
  if (page === "AppInbox") {
    return (
      <Section>
        <SettingRow label="Google & email" icon={<Link aria-hidden className="size-5" />} onOpen={() => act.openAccount("google")} />
        <ToggleRow label="Load images in email" on={loadsMailImages(value, readable)} locked={!readable} onChange={(on) => act.preference("MailImages", on)} />
      </Section>
    );
  }
  if (page === "AppCamera") return <Section>{permission("Camera", read.camera, <Camera aria-hidden className="size-5" />)}{permission("Microphone", read.microphone, <Mic aria-hidden className="size-5" />)}</Section>;
  if (page === "AppMaps") return <Section>{permission("Location", read.locationAccess, <MapPin aria-hidden className="size-5" />)}</Section>;
  if (page === "AppNotes") return <Section>{permission("Microphone", read.microphone, <Mic aria-hidden className="size-5" />)}</Section>;
  return (
    <Section>
      <SettingRow label="Library access" ariaLabel="Change photo access" state={ACCESS[read.photos]} onHandoff={() => act.openPage("PagePhotoAccess")} />
      <SettingRow label="Permissions" ariaLabel="Android photo permissions" onHandoff={() => act.openPage("PageAppInfo")} />
    </Section>
  );
}

function WifiPage({ network, act, chosen, onDialog }: {
  readonly network: Network; readonly act: SettingsActions; readonly chosen: Nearby | undefined;
  readonly onDialog: (dialog: PageDialog | undefined) => void;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem("passphrase");
    const passphrase = field instanceof HTMLInputElement ? field.value : "";
    if (field instanceof HTMLInputElement) field.value = "";
    if (chosen) act.join(chosen.name, chosen.security, passphrase);
    onDialog(undefined);
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
          <SettingRow key={n.name} label={n.name} state={{ word: n.joinable ? (n.secured ? "Secured" : "Open") : "Join in Android settings" }}
            disabled={!n.joinable || network.join === "AwaitingAndroid"}
            onOpen={() => (n.security === "Wpa2" || n.security === "Wpa3" ? onDialog({ kind: "join", network: n }) : act.join(n.name, n.security, ""))} />
        ))}
        <SettingRow label="Scan" icon={<RotateCw aria-hidden className="size-5" />} busy={network.scan === "Scanning"} ariaLabel="Scan for networks" onOpen={act.scan} />
        {scanWord && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">{scanWord}</p>}
      </Section>
      <Dialog open={chosen !== undefined} onOpenChange={(open) => { if (!open) onDialog(undefined); }}>
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
