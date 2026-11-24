// spec/app/settings/index.md, "Story: Find a setting and come back"; spec/app/settings/index.md, "Story: Reach what another area owns"; spec/app/settings/facts.md, "Story: See what the phone says"; spec/app/settings/android.md, "Story: Change what only Android can change"
import {
  Banner,
  Button,
  type SettingsAccess,
  type SettingsAccessWord,
  SettingsAboutPage,
  type SettingsAndroidStart,
  type SettingsAndroidTarget,
  type SettingsAndroidTold,
  SettingsAppPage,
  SettingsAppsPage,
  SettingsBatteryPage,
  SettingsDeveloperPage,
  type SettingsDeviceRead,
  SettingsDisplayPage,
  type SettingsFactReading,
  SettingsGeneralPage,
  type SettingsNeighbour,
  SettingsNotificationsPage,
  type SettingsPageName,
  SettingsPermissionsPage,
  SettingsPhonePage,
  type SettingsPreferencesNoticeProps,
  SettingsPrivacyPage,
  type SettingsResetNoticeProps,
  type SettingsRoleRowProps,
  type SettingsShare,
  SettingsSoundPage,
  SettingsTopPage,
  type SettingsTextSizePickerProps,
  SettingsPage,
} from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { ReactNode } from "react";
import type * as AndroidGen from "../../gen/app__settings__android.ts";
import { useMachine as useAndroid } from "../../gen/app__settings__android.react.ts";
import type { Machine as AndroidMachine } from "../../gen/app__settings__android.effect.vibe";
import * as FactsGen from "../../gen/app__settings__facts.ts";
import { useMachine as useFacts } from "../../gen/app__settings__facts.react.ts";
import type { Machine as FactsMachine } from "../../gen/app__settings__facts.effect.vibe";
import type * as PrefsGen from "../../gen/app__settings__preferences.ts";
import { useMachine as usePrefs } from "../../gen/app__settings__preferences.react.ts";
import type { Machine as PrefsMachine } from "../../gen/app__settings__preferences.effect.vibe";
import type * as ResetGen from "../../gen/app__settings__reset.ts";
import { useMachine as useReset } from "../../gen/app__settings__reset.react.ts";
import type { Machine as ResetMachine } from "../../gen/app__settings__reset.effect.vibe";
import type { Neighbour, Page } from "../../gen/app__settings.ts";
import { useMachine as usePages } from "../../gen/app__settings.react.ts";
import type { Machine as PagesMachine } from "../../gen/app__settings.effect.vibe";
import { useMachine as useDeveloper } from "../../gen/app__settings__developer.react.ts";
import type { Machine as DeveloperMachine } from "../../gen/app__settings__developer.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";

/** What every Settings page reads: where the owner is, the phone's facts, the hand-overs to Android, the preferences, the reset and the developer tools. */
export type SettingsRuntime = ManagedRuntime.ManagedRuntime<PagesMachine | FactsMachine | AndroidMachine | PrefsMachine | ResetMachine | DeveloperMachine | ShellMachine | Time, unknown>;

/** What the frame gives each page: the runtime, Alpha's places, and the props every page shares. */
export interface PageProps {
  readonly runtime: SettingsRuntime;
  readonly alpha: Alpha;
  readonly common: Common;
}

/** The props every page of Settings shares: the way back, the rows below, Android's pages and where the owner was. */
export interface Common {
  readonly onBack?: () => void;
  readonly onOpen: (page: SettingsPageName) => void;
  readonly onHandOver: (neighbour: SettingsNeighbour) => void;
  readonly starting?: SettingsAndroidStart;
  readonly onAndroid: (start: SettingsAndroidStart) => void;
  readonly told?: SettingsAndroidTold;
  readonly place: number;
  readonly onPlace: (row: number) => void;
}

const pageNames: Record<Page, SettingsPageName> = {
  Top: "top", General: "general", Display: "display", Sound: "sound", Notifications: "notifications", Battery: "battery",
  NetworkPage: "network", CarrierPage: "carrier", PhonePage: "phone", Privacy: "privacy", Permissions: "permissions", Apps: "apps",
  InboxApp: "inbox", WorkflowsApp: "workflows", CalendarApp: "calendar", CameraApp: "camera", PhotosApp: "photos", MapsApp: "maps", NotesApp: "notes",
  About: "about", Activity: "activity", Licences: "licences", Developer: "developer", Problems: "problems",
};
const pagesNamed = Object.fromEntries(Object.entries(pageNames).map(([page, name]) => [name, page])) as Record<SettingsPageName, Page>;

const neighbourNames: Record<Neighbour, SettingsNeighbour> = {
  AccountAndPlan: "account-and-plan", GoogleAndEmail: "google-and-email", CalendarAccount: "calendar-account", PasswordManager: "password-manager",
  NotificationCollection: "notification-collection", Listener: "listener", Conversations: "conversations", RestartDetails: "restart-details", CalendarBackups: "calendar-backups",
};
const neighboursNamed = Object.fromEntries(Object.entries(neighbourNames).map(([neighbour, name]) => [name, neighbour])) as Record<SettingsNeighbour, Neighbour>;

const targetNames: Record<AndroidGen.Target, SettingsAndroidTarget> = {
  AndroidHome: "android-home", AccountsSync: "accounts-sync", WifiNetworks: "wifi-networks", BluetoothDevices: "bluetooth-devices",
  MobileNetworks: "mobile-networks", AirplaneMode: "airplane-mode", ScreenLock: "screen-lock", DefaultApps: "default-apps",
  DisplaySettings: "display-settings", Brightness: "brightness", SoundSettings: "sound-settings", DoNotDisturb: "do-not-disturb",
  BatterySaver: "battery-saver", AlphaAlerts: "alpha-alerts", AlertChannel: "alert-channel", NotificationAccess: "notification-access",
  WorkflowAlerts: "workflow-alerts", AppPermissions: "app-permissions", PhotoPermissions: "photo-permissions", AllFilesAccess: "all-files-access",
  LocationSettings: "location-settings", InternetPanel: "internet-panel", SimCards: "sim-cards", AccessPointNames: "access-point-names",
  AboutPhone: "about-phone", DeveloperOptions: "developer-options",
};
const targetsNamed = Object.fromEntries(Object.entries(targetNames).map(([target, name]) => [name, target])) as Record<SettingsAndroidTarget, AndroidGen.Target>;

const toldWords: Record<AndroidGen.Told, SettingsAndroidTold | undefined> = { Silent: undefined, SaidNearby: "nearby", SaidUnavailable: "unavailable", SaidNoAnswer: "no-answer" };

const accessNames: Record<FactsGen.Access, SettingsAccess> = {
  CameraAccess: "camera", MicrophoneAccess: "microphone", LocationAccess: "location", CalendarAccess: "calendar", PhotosAccess: "photos", FilesAccess: "files", NotificationsAccess: "notifications",
};
const accessWords: Record<FactsGen.AccessWord, SettingsAccessWord> = { AccessWaiting: "waiting", AccessUnavailable: "unavailable", Allowed: "allowed", Approximate: "approximate", Off: "off" };
const roleWords: Record<FactsGen.RoleWord, SettingsRoleRowProps["word"]> = {
  RoleWaiting: "waiting", RoleUnavailable: "unavailable", NotOnThisPhone: "not-on-this-phone", HeldByAlpha: "alpha", HeldByAnother: "another", NotHeldByAlpha: "not-alpha",
};

const themeNames: Record<PrefsGen.Theme, "system" | "light" | "dark"> = { System: "system", Light: "light", Dark: "dark" };
const themesNamed = { system: "System", light: "Light", dark: "Dark" } as const satisfies Record<"system" | "light" | "dark", PrefsGen.Theme>;
const noticeNames: Record<PrefsGen.Notice, SettingsPreferencesNoticeProps["notice"] | undefined> = {
  Quiet: undefined, NotSaved: "not-saved", SizeNotConfirmed: "size-not-confirmed", SizeUnavailable: "size-unavailable", NotRecovered: "not-recovered",
};
const shareNames: Record<PrefsGen.Share, SettingsShare> = { AgentLocation: "agent-location", BrowserPage: "browser-page", GmailChanges: "gmail-changes", CalendarEdits: "calendar-edits" };
const sharesNamed = Object.fromEntries(Object.entries(shareNames).map(([share, name]) => [name, share])) as Record<SettingsShare, PrefsGen.Share>;

const saidNames: Record<ResetGen.Said, SettingsResetNoticeProps["said"] | undefined> = {
  Quiet: undefined, NotConfirmedItsYou: "not-confirmed-its-you", EraseUnavailable: "erase-unavailable", ReviewExpired: "review-expired",
  ReviewAlreadyOpen: "review-already-open", SetAScreenLock: "set-a-screen-lock", NoDeviceAuth: "no-device-auth", MayStillGoAhead: "may-still-go-ahead",
  NotErased: "not-erased", CouldNotTell: "could-not-tell", Erased: "erased",
};

const loading = (timed: { readonly read: { readonly status: string } }) => timed.read.status === "Loading";

const sounds: Record<string, string> = { all: "Ring", priority: "Priority only", alarms: "Alarms only", none: "Silent" };

/** What the phone said about one fact, in the words and state the row shows. */
function reading(facts: FactsGen.Facts | undefined, fact: FactsGen.Fact): SettingsFactReading {
  if (facts === undefined) return { word: "waiting" };
  const word = FactsGen.word(facts, fact);
  if (word === "Waiting") return { word: "waiting" };
  if (word === "Unavailable") return { word: "unavailable" };
  const value = facts.reported.find((one) => one.fact === fact)?.value ?? "";
  if (value === "on") return { word: "reported", value: "On", status: "ok" };
  if (value === "off") return { word: "reported", value: "Off", status: "off" };
  if (fact === "Sound") return { word: "reported", value: sounds[value] ?? value };
  if (fact === "Battery") return { word: "reported", value: value.endsWith(" charging") ? `${value.replace(" charging", "")}%, charging` : `${value}%` };
  return { word: "reported", value };
}

/** Each access as the phone last said, never allowed where it did not say. */
function grants(facts: FactsGen.Facts | undefined): Record<SettingsAccess, SettingsAccessWord> {
  const all = Object.keys(accessNames) as FactsGen.Access[];
  return Object.fromEntries(all.map((access) => [accessNames[access], facts === undefined ? "waiting" : accessWords[FactsGen.accessWord(facts, access)]])) as Record<SettingsAccess, SettingsAccessWord>;
}

/** How the phone's read of the device preferences stands. */
function deviceRead(prefs: PrefsGen.Preferences): SettingsDeviceRead {
  const status = prefs.document.read.status;
  return status === "Loaded" ? "loaded" : status === "Failed" ? "failed" : "reading";
}

/** The device preferences as the Privacy and Inbox pages show and change them, each change offered exactly when the rules allow it. */
function useDevice(runtime: SettingsRuntime) {
  const { state, can, send } = useTimed(runtime, usePrefs);
  if (!state) return undefined;
  const read = deviceRead(state);
  const offer = <E extends PrefsGen.Event>(event: (value: boolean) => E) => (value: boolean) => {
    if (can(event(value), "Owner")) void send(event(value), "Owner");
  };
  const recover = { type: "recover", at: untimed } as const;
  return {
    read,
    askFirst: read !== "loaded" || state.askFirst,
    images: read === "loaded" && state.images,
    shares: Object.fromEntries(state.shares.map((share) => [shareNames[share], true])) as Partial<Record<SettingsShare, boolean>>,
    saving: loading(state.saving),
    recovering: loading(state.recovering),
    onAskFirstChange: offer((askFirst) => ({ type: "setAskFirst", askFirst, at: untimed })),
    onImagesChange: offer((images) => ({ type: "setImages", images, at: untimed })),
    onShareChange: (share: SettingsShare, on: boolean) => offer((value) => ({ type: "setShare", share: sharesNamed[share], on: value, at: untimed }))(on),
    onRecover: can(recover, "Owner") ? () => void send(recover, "Owner") : undefined,
  };
}

function Top({ runtime, alpha, common }: PageProps) {
  const pages = usePages(runtime).state;
  return (
    <SettingsTopPage {...common} developer={pages?.development ?? false}>
      {alpha.slot("settings/account")}
      {alpha.slot("settings/updates")}
    </SettingsTopPage>
  );
}

// spec/app/settings/reset.md, "Erase all data, on the phone, asks the phone to show its disclosure and check the device credential, one review at a time"; spec/app/settings/facts.md, "Set as Home is offered when the newest answer reported a Home role that Alpha can take and does not hold, one request at a time"
function General({ runtime, common }: PageProps) {
  const pages = usePages(runtime).state;
  const { state: facts, can, send } = useTimed(runtime, useFacts);
  const reset = useTimed(runtime, useReset);
  const request = { type: "requestHome", at: untimed } as const;
  const onPhone = pages?.phone ?? false;
  const erase = { type: "erase", at: untimed, onPhone } as const;
  return (
    <SettingsGeneralPage
      {...common}
      wifi={reading(facts, "Wifi")}
      bluetooth={reading(facts, "Bluetooth")}
      mobileData={reading(facts, "MobileData")}
      image={pages?.image ?? false}
      onPhone={onPhone}
      reviewing={reset.state !== undefined && loading(reset.state.review)}
      onErase={reset.can(erase) ? () => void reset.send(erase) : undefined}
      said={reset.state && saidNames[reset.state.said]}
      requestingHome={facts !== undefined && loading(facts.request)}
      onRequestHome={can(request) ? () => void send(request) : undefined}
    />
  );
}

// spec/app/settings/preferences.md, "Story: Choose how Alpha looks"; spec/app/settings/preferences.md, "Story: Make the text larger or smaller"
function Display({ runtime, common }: PageProps) {
  const { state, can, send } = useTimed(runtime, usePrefs);
  if (!state) return null;
  const size = ([75, 100, 115, 130, 150] as const).find((percent) => percent === state.size) ?? 0;
  const choose = (event: PrefsGen.Event) => {
    if (can(event, "Owner")) void send(event, "Owner");
  };
  return (
    <SettingsDisplayPage
      {...common}
      theme={themeNames[state.theme]}
      keeping={loading(state.keeping)}
      onChooseTheme={(theme) => choose({ type: "chooseTheme", theme: themesNamed[theme], at: untimed })}
      legible={state.legible}
      onLegibleChange={(legible) => choose({ type: "setLegible", legible, at: untimed })}
      size={size satisfies SettingsTextSizePickerProps["size"]}
      sizing={loading(state.sizing)}
      onChooseSize={(percent) => choose({ type: "chooseSize", percent, at: untimed })}
      notice={noticeNames[state.notice]}
    />
  );
}

// spec/app/settings/preferences.md, "Story: Decide whether Alpha asks before it acts"; spec/app/settings/index.md, "Set up Alpha access on Privacy, and each access on Permissions, open the walkthrough to review that one access"
function Privacy({ runtime, alpha, common }: PageProps) {
  const device = useDevice(runtime);
  const { can, send } = usePages(runtime);
  if (!device) return null;
  const review = { type: "reviewAccess", access: "NotificationsAccess" } as const;
  return (
    <SettingsPrivacyPage {...common} {...device} onSetUpAccess={can(review) ? () => void send(review) : undefined}>
      {alpha.slot("settings/listening")}
    </SettingsPrivacyPage>
  );
}

function Permissions({ runtime, common }: PageProps) {
  const facts = useFacts(runtime).state;
  const { can, send } = usePages(runtime);
  const accesses = Object.fromEntries(Object.entries(accessNames).map(([access, name]) => [name, access])) as Record<SettingsAccess, FactsGen.Access>;
  return (
    <SettingsPermissionsPage
      {...common}
      grants={grants(facts)}
      onReview={(access) => {
        const review = { type: "reviewAccess", access: accesses[access] } as const;
        if (can(review)) void send(review);
      }}
    />
  );
}

// spec/app/settings/facts.md, "Set as Home is offered when the newest answer reported a Home role that Alpha can take and does not hold, one request at a time"
function Phone({ runtime, common }: PageProps) {
  const { state, can, send } = useTimed(runtime, useFacts);
  if (!state) return null;
  const request = { type: "requestHome", at: untimed } as const;
  return (
    <SettingsPhonePage
      {...common}
      home={roleWords[FactsGen.roleWord(state, state.home)]}
      assistant={roleWords[FactsGen.roleWord(state, state.assistant)]}
      requesting={loading(state.request)}
      onRequestHome={can(request) ? () => void send(request) : undefined}
    />
  );
}

function Apps({ runtime, common }: PageProps) {
  const shell = useShell(runtime);
  return (
    <SettingsAppsPage
      {...common}
      onOpenApp={(app) => {
        const open = { type: "openView", view: app === "browser" ? "Browser" : "Files" } as const;
        if (shell.can(open)) void shell.send(open);
      }}
    />
  );
}

function App({ runtime, common, app }: PageProps & { app: "inbox" | "workflows" | "calendar" | "camera" | "photos" | "maps" | "notes" }) {
  const facts = useFacts(runtime).state;
  const device = useDevice(runtime);
  return (
    <SettingsAppPage
      {...common}
      app={app}
      grants={grants(facts)}
      read={device?.read}
      images={device?.images}
      saving={device?.saving}
      recovering={device?.recovering}
      onImagesChange={device?.onImagesChange}
      onRecover={device?.onRecover}
    />
  );
}

function About({ runtime, alpha, common }: PageProps) {
  const facts = useFacts(runtime).state;
  const done = facts !== undefined && FactsGen.word(facts, "Versions") !== "Waiting";
  return (
    <SettingsAboutPage {...common} alphaVersion={reading(facts, "Versions")} androidVersion={done ? { word: "unavailable" } : { word: "waiting" }} storage={reading(facts, "Storage")}>
      {alpha.slot("settings/about")}
    </SettingsAboutPage>
  );
}

// spec/app/settings/developer.md, "Export diagnostics shares the log and Alpha's diagnostics, one export at a time, with ten seconds to start"
function Developer({ runtime, common }: PageProps) {
  const { state, can, send } = useTimed(runtime, useDeveloper);
  const startExport = { type: "startExport", at: untimed } as const;
  return (
    <SettingsDeveloperPage
      {...common}
      exporting={state !== undefined && loading(state.exporting)}
      onExport={can(startExport) ? () => void send(startExport) : undefined}
    />
  );
}

/** Agent activity: the conversations and, in a development build, the agent's restart details, which their own areas show. */
function Activity({ runtime, alpha, common }: PageProps) {
  const pages = usePages(runtime);
  const hand = (neighbour: Neighbour) => ({ type: "handOver", neighbour, micMayBeOn: false }) as const;
  return (
    <SettingsPage title="Agent activity" onBack={common.onBack}>
      {alpha.slot("settings/activity")}
      <div className="flex flex-wrap gap-2 px-4">
        {pages.can(hand("Conversations")) ? <Button variant="outline" onClick={() => void pages.send(hand("Conversations"))}>Conversations</Button> : null}
        {pages.can(hand("RestartDetails")) ? <Button variant="outline" onClick={() => void pages.send(hand("RestartDetails"))}>Restart details</Button> : null}
      </div>
    </SettingsPage>
  );
}

/** A page of Settings, given the runtime, Alpha and the props every page shares. */
export type Drawn = (props: PageProps) => ReactNode;

const drawn: Partial<Record<Page, Drawn>> = {
  Top,
  General,
  Display,
  Sound: ({ runtime, common }) => <SettingsSoundPage {...common} sound={reading(useFacts(runtime).state, "Sound")} />,
  Notifications: ({ runtime, common }) => <SettingsNotificationsPage {...common} alerts={reading(useFacts(runtime).state, "Alerts")} channels={[]} />,
  Battery: ({ runtime, common }) => <SettingsBatteryPage {...common} battery={reading(useFacts(runtime).state, "Battery")} />,
  PhonePage: Phone,
  Privacy,
  Permissions,
  Apps,
  InboxApp: (props) => <App {...props} app="inbox" />,
  WorkflowsApp: (props) => <App {...props} app="workflows" />,
  CalendarApp: (props) => <App {...props} app="calendar" />,
  CameraApp: (props) => <App {...props} app="camera" />,
  PhotosApp: (props) => <App {...props} app="photos" />,
  MapsApp: (props) => <App {...props} app="maps" />,
  NotesApp: (props) => <App {...props} app="notes" />,
  About,
  Activity,
  Developer,
};

/**
 * Settings: the page showing, built from its own component, each control offered exactly when its event is, with
 * what Android said about the last page it was asked to open. `further` draws the pages whose machines their own
 * screens read.
 * @model spec/app/settings/index.md
 */
export function Settings({ runtime, alpha, further }: { runtime: SettingsRuntime; alpha: Alpha; further: Partial<Record<Page, Drawn>> }) {
  const { state, cause, can, send } = usePages(runtime);
  const android = useTimed(runtime, useAndroid);
  const facts = useTimed(runtime, useFacts);
  if (cause) return <Banner variant="destructive" className="m-4">Alpha could not open Settings</Banner>;
  if (!state) return null;
  const page = state.page;
  const goBack = { type: "goBack" } as const;
  const start = android.state && loading(android.state.start) ? { target: targetNames[android.state.target], channel: android.state.channel > 0 ? android.state.channel : undefined } : undefined;
  const common: Common = {
    onBack: can(goBack) ? () => void send(goBack) : undefined,
    onOpen: (name) => {
      const open = { type: "open", page: pagesNamed[name] } as const;
      if (can(open)) void send(open);
    },
    onHandOver: (name) => {
      const hand = { type: "handOver", neighbour: neighboursNamed[name], micMayBeOn: false } as const;
      if (can(hand)) void send(hand);
    },
    starting: start,
    onAndroid: ({ target, channel }) => {
      const handOff = { type: "handOff", page, target: targetsNamed[target], channel: channel ?? 0, at: untimed } as const;
      if (android.can(handOff)) void android.send(handOff);
    },
    told: android.state && toldWords[android.state.told],
    place: state.places[state.places.length - 1] ?? 0,
    onPlace: (focused) => {
      if (focused !== (state.places[state.places.length - 1] ?? 0)) void send({ type: "focus", focused });
    },
  };
  const Shown = further[page] ?? drawn[page];
  const refresh = { type: "refresh", at: untimed } as const;
  return (
    <section aria-label="Settings" className="flex h-full flex-col">
      {facts.state && facts.state.read.read.status === "Failed" ? <Banner variant="warn">The phone did not answer</Banner> : null}
      {facts.can(refresh) && page !== "Licences" ? <Button variant="ghost" size="sm" className="self-end" onClick={() => void facts.send(refresh)}>Refresh</Button> : null}
      {Shown ? <Shown runtime={runtime} alpha={alpha} common={common} /> : null}
    </section>
  );
}
