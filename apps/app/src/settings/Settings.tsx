// spec/app/settings/index.md, "Story: Find a setting and come back"; spec/app/settings/facts.md, "Story: See what the phone says"; spec/app/settings/android.md, "Story: Change what only Android can change"
import { Alert, Button, ListGroup, ListRow, RadioGroup, RadioGroupItem, Spinner, Switch } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import * as AndroidGen from "../../gen/app__settings__android.ts";
import { useMachine as useAndroid } from "../../gen/app__settings__android.react.ts";
import type { Machine as AndroidMachine } from "../../gen/app__settings__android.effect.vibe";
import * as FactsGen from "../../gen/app__settings__facts.ts";
import { useMachine as useFacts } from "../../gen/app__settings__facts.react.ts";
import type { Machine as FactsMachine } from "../../gen/app__settings__facts.effect.vibe";
import * as PrefsGen from "../../gen/app__settings__preferences.ts";
import { useMachine as usePrefs } from "../../gen/app__settings__preferences.react.ts";
import type { Machine as PrefsMachine } from "../../gen/app__settings__preferences.effect.vibe";
import { useMachine as useReset } from "../../gen/app__settings__reset.react.ts";
import { useMachine as useUpdates } from "../../gen/app__settings__updates.react.ts";
import type { Machine as UpdatesMachine } from "../../gen/app__settings__updates.effect.vibe";
import type { Machine as ResetMachine } from "../../gen/app__settings__reset.effect.vibe";
import type { Neighbour, Page } from "../../gen/app__settings.ts";
import { useMachine as usePages } from "../../gen/app__settings.react.ts";
import type { Machine as PagesMachine } from "../../gen/app__settings.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";

/** What every Settings page reads: where the owner is, the phone's facts, the hand-overs to Android, the preferences and the reset. */
export type SettingsRuntime = ManagedRuntime.ManagedRuntime<PagesMachine | FactsMachine | AndroidMachine | PrefsMachine | ResetMachine | UpdatesMachine | ShellMachine | Time, unknown>;

export interface PageProps {
  runtime: SettingsRuntime;
  alpha: Alpha;
}

const titles: Record<Page, string> = {
  Top: "Settings", General: "General", Display: "Display", Sound: "Sound", Notifications: "Notifications", Battery: "Battery",
  NetworkPage: "Network", CarrierPage: "Carrier & SIM setup", PhonePage: "Phone", Privacy: "Privacy", Permissions: "Permissions", Apps: "Apps",
  InboxApp: "Inbox", WorkflowsApp: "Workflows", CalendarApp: "Calendar", CameraApp: "Camera", PhotosApp: "Photos", MapsApp: "Maps", NotesApp: "Notes",
  PasswordsPage: "Passwords", About: "About", Activity: "Agent activity", Licences: "Licences", Developer: "Developer", Problems: "Problem log",
};

const children: Partial<Record<Page, readonly Page[]>> = {
  Top: ["General", "Privacy", "Apps", "About", "Developer"],
  General: ["Display", "Sound", "Notifications", "Battery", "NetworkPage", "CarrierPage", "PhonePage"],
  Privacy: ["Permissions"],
  Apps: ["InboxApp", "WorkflowsApp", "CalendarApp", "CameraApp", "PhotosApp", "MapsApp", "NotesApp", "PasswordsPage"],
  About: ["Activity", "Licences"],
  Developer: ["Problems"],
};

const targets: Record<AndroidGen.Target, string> = {
  AndroidHome: "Android settings", AccountsSync: "Accounts and sync", WifiNetworks: "Wi-Fi networks", BluetoothDevices: "Bluetooth devices",
  MobileNetworks: "Mobile networks", AirplaneMode: "Airplane mode", ScreenLock: "Screen lock", DefaultApps: "Default apps",
  DisplaySettings: "Android display", Brightness: "Brightness", SoundSettings: "Android sound", DoNotDisturb: "Do Not Disturb",
  BatterySaver: "Battery saver", AlphaAlerts: "Alpha's alerts", AlertChannel: "Alert channel", NotificationAccess: "Notification access",
  WorkflowAlerts: "Workflow alerts", AppPermissions: "Alpha's permissions", PhotoPermissions: "Photo access", AllFilesAccess: "Access to all files",
  LocationSettings: "Location", InternetPanel: "Internet panel", SimCards: "SIMs", AccessPointNames: "Access point names", AboutPhone: "About phone",
  DeveloperOptions: "Developer options",
};

const neighbours: Record<Neighbour, string> = {
  AccountAndPlan: "account", GoogleAndEmail: "google", CalendarAccount: "calendar", PasswordManager: "password-manager",
  NotificationCollection: "notifications", Listener: "listener", Conversations: "conversations", RestartDetails: "restart", CalendarBackups: "calendar-backups",
};

/** Neighbours whose own app the shell opens, where no row of theirs is drawn. */
const opened: Partial<Record<Neighbour, string>> = { GoogleAndEmail: "Google and email", CalendarAccount: "Google Calendar", Conversations: "Conversations", CalendarBackups: "Calendar backups" };

const facts: Record<FactsGen.Fact, string> = {
  Wifi: "Wi-Fi", Bluetooth: "Bluetooth", MobileData: "Mobile data", Battery: "Battery", Sound: "Sound", Alerts: "Alerts",
  DeviceLocation: "Location", Storage: "Storage", Roles: "Roles", Versions: "Version",
};

const accesses: Record<FactsGen.Access, string> = {
  CameraAccess: "Camera", MicrophoneAccess: "Microphone", LocationAccess: "Location", CalendarAccess: "Calendar", PhotosAccess: "Photos", FilesAccess: "Files", NotificationsAccess: "Notifications",
};

const accessWords: Record<FactsGen.AccessWord, string> = { AccessWaiting: "Reading", AccessUnavailable: "Unavailable", Allowed: "Allowed", Approximate: "Approximate", Off: "Off" };

const roleWords: Record<FactsGen.RoleWord, string> = {
  RoleWaiting: "Reading", RoleUnavailable: "Unavailable", NotOnThisPhone: "Not on this phone", HeldByAlpha: "Alpha", HeldByAnother: "Another app", NotHeldByAlpha: "Not Alpha",
};

const told: Record<Exclude<AndroidGen.Told, "Silent">, string> = {
  SaidNearby: "Android opened the closest page it has",
  SaidUnavailable: "That page isn't available on this phone",
  SaidNoAnswer: "Android didn't answer",
};

/** One row that opens a page of Settings, offered exactly when the rules let it open from here. */
function Opens({ runtime, page, detail }: { runtime: SettingsRuntime; page: Page; detail?: ReactNode }) {
  const { can, send } = usePages(runtime);
  const open = { type: "open", page } as const;
  if (!can(open)) return null;
  return <ListRow title={titles[page]} detail={detail} trailing={<ChevronRight aria-hidden />} onClick={() => void send(open)} />;
}

/** The row that hands the owner to one of Android's own pages, offered exactly when the rules allow a start from this page. */
function Hands({ runtime, target, channel = 0 }: { runtime: SettingsRuntime; target: AndroidGen.Target; channel?: number }) {
  const page = usePages(runtime).state?.page ?? "Top";
  const { can, send } = useTimed(runtime, useAndroid);
  const start = { type: "handOff", page, target, channel, at: untimed } as const;
  if (!AndroidGen.offers(page, target)) return null;
  return <ListRow title={targets[target]} trailing={<ExternalLink aria-hidden />} disabled={!can(start)} onClick={() => void send(start)} />;
}

/** What one fact says: reading, the phone's word, or unavailable. */
function Fact({ runtime, fact, show = (value) => value }: { runtime: SettingsRuntime; fact: FactsGen.Fact; show?: (value: string) => string }) {
  const state = useFacts(runtime).state;
  if (!state) return null;
  const word = FactsGen.word(state, fact);
  const value = state.reported.find((reading) => reading.fact === fact)?.value ?? "";
  return <ListRow title={facts[fact]} trailing={word === "Waiting" ? <Spinner size="sm" label="Reading" /> : word === "Unavailable" ? "Unavailable" : show(value)} />;
}

const onOff = (value: string) => (value === "on" ? "On" : value === "off" ? "Off" : value);
const sound = (value: string) => ({ all: "Ring", priority: "Priority only", alarms: "Alarms only", none: "Silent" })[value] ?? value;
const battery = (value: string) => `${value.replace(" charging", "")}%${value.endsWith(" charging") ? ", charging" : ""}`;

/** What another area draws on this page, at `settings/<neighbour>`, or a row that opens it where the shell can. */
function Neighbourly({ runtime, alpha, neighbour, micMayBeOn = false }: PageProps & { neighbour: Neighbour; micMayBeOn?: boolean }) {
  const { can, send } = usePages(runtime);
  const hand = { type: "handOver", neighbour, micMayBeOn } as const;
  if (!can(hand)) return null;
  const label = opened[neighbour];
  return (
    <>
      {alpha.slot(`settings/${neighbours[neighbour]}`)}
      {label !== undefined && <ListRow title={label} trailing={<ChevronRight aria-hidden />} onClick={() => void send(hand)} />}
    </>
  );
}

function Top(props: PageProps) {
  const { runtime } = props;
  return (
    <>
      <Neighbourly {...props} neighbour="AccountAndPlan" />
      <ListGroup>{(children.Top ?? []).map((page) => <Opens key={page} runtime={runtime} page={page} />)}</ListGroup>
      <ListGroup heading="Android">
        <Hands runtime={runtime} target="AndroidHome" />
        <Hands runtime={runtime} target="AccountsSync" />
      </ListGroup>
    </>
  );
}

// spec/app/settings/facts.md, "Set as Home is offered when the newest answer reported a Home role that Alpha can take and does not hold, one request at a time"
function HomeRole({ runtime }: { runtime: SettingsRuntime }) {
  const { state, can, send } = useTimed(runtime, useFacts);
  if (!state) return null;
  const request = { type: "requestHome", at: untimed } as const;
  return (
    <ListGroup heading="Roles">
      <ListRow title="Home app" trailing={state.request.read.status === "Loading" ? <Spinner size="sm" label="Waiting for Android" /> : roleWords[FactsGen.roleWord(state, state.home)]} />
      {can(request) && <ListRow title="Set Alpha as Home" onClick={() => void send(request)} />}
      <ListRow title="Assistant" trailing={roleWords[FactsGen.roleWord(state, state.assistant)]} />
    </ListGroup>
  );
}

// spec/app/settings/reset.md, "Erase all data, on the phone, asks the phone to show its disclosure and check the device credential, one review at a time"
const resetWords: Partial<Record<string, string>> = {
  NotConfirmedItsYou: "Android couldn't confirm it's you. Nothing was erased.",
  EraseUnavailable: "Reset isn't available right now. Nothing was erased.",
  ReviewExpired: "The review expired. Nothing was erased.",
  ReviewAlreadyOpen: "A review is already open.",
  SetAScreenLock: "Set a screen lock in Android's settings first.",
  NoDeviceAuth: "Unlocking with your screen lock isn't available. Nothing was erased.",
  MayStillGoAhead: "The reset you confirmed may still go ahead. Open Alpha again to find out.",
  NotErased: "Nothing was erased.",
  CouldNotTell: "Alpha can't tell whether your data was erased.",
  Erased: "Your data was erased.",
};

function Erase({ runtime }: { runtime: SettingsRuntime }) {
  const pages = usePages(runtime).state;
  const { state, can, send } = useTimed(runtime, useReset);
  if (!state || !pages?.phone) return null;
  const erase = { type: "erase", at: untimed, onPhone: pages.phone } as const;
  const said = resetWords[state.said];
  return (
    <ListGroup>
      {said !== undefined && <Alert variant="warn">{said}</Alert>}
      <ListRow title="Erase all data" disabled={!can(erase)} onClick={() => void send(erase)} trailing={state.review.read.status === "Loading" ? <Spinner size="sm" label="Waiting for Android" /> : undefined} />
    </ListGroup>
  );
}

const outcomes: Partial<Record<string, string>> = {
  NoneOffered: "Alpha is up to date", CheckFailed: "Alpha couldn't check for updates", InstallStarted: "The update is installing", InstallRefused: "That update is no longer offered",
};

// spec/app/settings/updates.md, "Story: Update Alpha when I choose"; spec/app/settings/updates.md, "The owner continues an install only where Android paused it and allows it"
function UpdateRows({ runtime }: { runtime: SettingsRuntime }) {
  const { state, can, send } = useTimed(runtime, useUpdates);
  if (!state || state.installed === 0) return null;
  const check = { type: "check", at: untimed } as const;
  const install = { type: "install", at: untimed } as const;
  const said = outcomes[state.outcome];
  return (
    <ListGroup heading="Updates">
      {said !== undefined && <Alert variant={state.outcome === "CheckFailed" ? "warn" : "info"}>{said}</Alert>}
      {state.offer > state.installed && <ListRow title={state.offerName === "" ? `Version ${state.offer}` : `Alpha ${state.offerName}`} detail={String(state.offer)} />}
      <ListRow title="Check for updates" disabled={!can(check)} onClick={() => void send(check)} trailing={state.checking.read.status === "Loading" ? <Spinner size="sm" label="Checking" /> : undefined} />
      {can(install) && <ListRow title="Install update" onClick={() => void send(install)} />}
      {state.permission === "PermissionRequired" && <Hands runtime={runtime} target="AppPermissions" />}
      {can({ type: "continueInstall" }) && <ListRow title="Continue update" onClick={() => void send({ type: "continueInstall" })} />}
    </ListGroup>
  );
}

function General(props: PageProps) {
  const { runtime } = props;
  return (
    <>
      <ListGroup>{(children.General ?? []).map((page) => <Opens key={page} runtime={runtime} page={page} />)}</ListGroup>
      <ListGroup heading="Connections">
        <Fact runtime={runtime} fact="Wifi" show={onOff} />
        <Hands runtime={runtime} target="WifiNetworks" />
        <Fact runtime={runtime} fact="Bluetooth" show={onOff} />
        <Hands runtime={runtime} target="BluetoothDevices" />
        <Fact runtime={runtime} fact="MobileData" show={onOff} />
        <Hands runtime={runtime} target="MobileNetworks" />
        <Hands runtime={runtime} target="AirplaneMode" />
      </ListGroup>
      <HomeRole runtime={runtime} />
      <ListGroup heading="Android">
        <Hands runtime={runtime} target="ScreenLock" />
        <Hands runtime={runtime} target="DefaultApps" />
      </ListGroup>
      <UpdateRows runtime={runtime} />
      <Erase runtime={runtime} />
    </>
  );
}

const themes: Record<PrefsGen.Theme, string> = { System: "Same as phone", Light: "Light", Dark: "Dark" };
const sizes = [75, 100, 115, 130, 150];
const prefNotices: Partial<Record<PrefsGen.Notice, string>> = {
  NotSaved: "That wasn't saved",
  SizeNotConfirmed: "The phone didn't confirm the text size",
  SizeUnavailable: "Text size isn't available on this phone",
  NotRecovered: "Your preferences couldn't be recovered",
};

// spec/app/settings/preferences.md, "Story: Choose how Alpha looks"; spec/app/settings/preferences.md, "Story: Make the text larger or smaller"
function Display({ runtime }: PageProps) {
  const { state, can, send } = useTimed(runtime, usePrefs);
  if (!state) return null;
  const notice = prefNotices[state.notice];
  return (
    <>
      {notice !== undefined && <Alert variant="warn">{notice}</Alert>}
      <ListGroup heading="Appearance">
        <RadioGroup aria-label="Appearance" value={state.theme} onValueChange={(theme) => void send({ type: "chooseTheme", theme: theme as PrefsGen.Theme, at: untimed }, "Owner")}>
          {(Object.keys(themes) as PrefsGen.Theme[]).map((theme) => (
            <ListRow key={theme} asChild title={themes[theme]} trailing={<RadioGroupItem value={theme} aria-label={themes[theme]} disabled={!can({ type: "chooseTheme", theme, at: untimed }, "Owner")} />}>
              <label />
            </ListRow>
          ))}
        </RadioGroup>
        <ListRow asChild title="Legible text" trailing={<Switch id="legible" aria-label="Legible text" checked={state.legible} disabled={!can({ type: "setLegible", legible: !state.legible, at: untimed }, "Owner")} onCheckedChange={(legible) => void send({ type: "setLegible", legible, at: untimed }, "Owner")} />}>
          <label htmlFor="legible" />
        </ListRow>
      </ListGroup>
      <ListGroup heading="Text size">
        <ListRow title="Size" trailing={state.size === 0 ? (state.sizing.read.status === "Loading" ? <Spinner size="sm" label="Reading" /> : "Unavailable") : `${state.size}%`} />
        <div role="group" aria-label="Text sizes" className="flex flex-wrap gap-2 p-4">
          {sizes.map((percent) => {
            const choose = { type: "chooseSize", percent, at: untimed } as const;
            return <Button key={percent} size="sm" variant={state.size === percent ? "primary" : "outline"} aria-label={`Text at ${percent}%`} disabled={!can(choose, "Owner")} onClick={() => void send(choose, "Owner")}>{`${percent}%`}</Button>;
          })}
        </div>
      </ListGroup>
      <ListGroup heading="Android">
        <Hands runtime={runtime} target="DisplaySettings" />
        <Hands runtime={runtime} target="Brightness" />
      </ListGroup>
    </>
  );
}

const shares: Record<PrefsGen.Share, string> = { AgentLocation: "Location for Alpha", BrowserPage: "Browser page for Alpha", GmailChanges: "Gmail changes", CalendarEdits: "Calendar edits" };

/** A switch of the device preferences, offered while the phone has read them and nothing is being saved. */
function Choice({ runtime, id, label, checked, event }: { runtime: SettingsRuntime; id: string; label: string; checked: boolean; event: (on: boolean) => PrefsGen.Event }) {
  const { can, send } = useTimed(runtime, usePrefs);
  return (
    <ListRow asChild title={label} trailing={<Switch id={id} aria-label={label} checked={checked} disabled={!can(event(!checked), "Owner")} onCheckedChange={(on) => void send(event(on), "Owner")} />}>
      <label htmlFor={id} />
    </ListRow>
  );
}

// spec/app/settings/preferences.md, "Story: Decide whether Alpha asks before it acts"
function Privacy(props: PageProps) {
  const { runtime } = props;
  const { state, can, send } = useTimed(runtime, usePrefs);
  if (!state) return null;
  const readable = state.document.read.status === "Loaded";
  const recover = { type: "recover", at: untimed } as const;
  return (
    <>
      {state.document.read.status === "Failed" && <Alert variant="warn">Your preferences can't be read, so Alpha asks before it acts and shares nothing</Alert>}
      {can(recover, "Owner") && <Button variant="outline" onClick={() => void send(recover, "Owner")}>Recover preferences</Button>}
      <ListGroup>
        <Choice runtime={runtime} id="ask-first" label="Ask before Alpha acts" checked={!readable || state.askFirst} event={(on) => ({ type: "setAskFirst", askFirst: on, at: untimed })} />
        {(Object.keys(shares) as PrefsGen.Share[]).map((share) => (
          <Choice key={share} runtime={runtime} id={share} label={shares[share]} checked={readable && state.shares.includes(share)} event={(on) => ({ type: "setShare", share, on, at: untimed })} />
        ))}
      </ListGroup>
      <ListGroup>
        <Opens runtime={runtime} page="Permissions" />
        <Neighbourly {...props} neighbour="Listener" />
        {props.alpha.slot("settings/access")}
      </ListGroup>
    </>
  );
}

function Permissions({ runtime }: PageProps) {
  const state = useFacts(runtime).state;
  if (!state) return null;
  return (
    <>
      <ListGroup>
        {(Object.keys(accesses) as FactsGen.Access[]).map((access) => <ListRow key={access} title={accesses[access]} trailing={accessWords[FactsGen.accessWord(state, access)]} />)}
      </ListGroup>
      <ListGroup heading="Android">
        <Hands runtime={runtime} target="AppPermissions" />
        <Hands runtime={runtime} target="AllFilesAccess" />
        <Hands runtime={runtime} target="LocationSettings" />
      </ListGroup>
    </>
  );
}

function Apps(props: PageProps) {
  const { runtime } = props;
  const shell = useShell(runtime);
  return (
    <ListGroup>
      {(children.Apps ?? []).map((page) => <Opens key={page} runtime={runtime} page={page} />)}
      {(["Browser", "Files"] as const).map((view) => shell.can({ type: "openView", view }) && <ListRow key={view} title={view} trailing={<ChevronRight aria-hidden />} onClick={() => void shell.send({ type: "openView", view })} />)}
    </ListGroup>
  );
}

function InboxApp(props: PageProps) {
  const { state } = useTimed(props.runtime, usePrefs);
  if (!state) return null;
  return (
    <ListGroup>
      <Choice runtime={props.runtime} id="images" label="Load images" checked={state.document.read.status === "Loaded" && state.images} event={(on) => ({ type: "setImages", images: on, at: untimed })} />
      <Neighbourly {...props} neighbour="GoogleAndEmail" />
    </ListGroup>
  );
}

/** The pages that hold nothing but what the phone reports and the pages of Android that go with them. */
const plain: Partial<Record<Page, (props: PageProps) => ReactNode>> = {
  Sound: ({ runtime }) => <ListGroup><Fact runtime={runtime} fact="Sound" show={sound} /><Hands runtime={runtime} target="SoundSettings" /><Hands runtime={runtime} target="DoNotDisturb" /></ListGroup>,
  Notifications: (props) => <ListGroup><Fact runtime={props.runtime} fact="Alerts" show={onOff} /><Hands runtime={props.runtime} target="AlphaAlerts" /><Hands runtime={props.runtime} target="NotificationAccess" /><Neighbourly {...props} neighbour="NotificationCollection" /></ListGroup>,
  Battery: ({ runtime }) => <ListGroup><Fact runtime={runtime} fact="Battery" show={battery} /><Hands runtime={runtime} target="BatterySaver" /></ListGroup>,
  PhonePage: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="DefaultApps" /></ListGroup>,
  WorkflowsApp: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="WorkflowAlerts" /></ListGroup>,
  CalendarApp: (props) => <ListGroup><Neighbourly {...props} neighbour="CalendarAccount" /><Hands runtime={props.runtime} target="AppPermissions" /></ListGroup>,
  CameraApp: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="AppPermissions" /></ListGroup>,
  PhotosApp: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="PhotoPermissions" /></ListGroup>,
  MapsApp: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="AppPermissions" /></ListGroup>,
  NotesApp: ({ runtime }) => <ListGroup><Hands runtime={runtime} target="AppPermissions" /></ListGroup>,
  About: ({ runtime }) => <><ListGroup><Fact runtime={runtime} fact="Versions" /><Fact runtime={runtime} fact="Storage" /></ListGroup><ListGroup>{(children.About ?? []).map((page) => <Opens key={page} runtime={runtime} page={page} />)}<Hands runtime={runtime} target="AboutPhone" /></ListGroup></>,
  Activity: (props) => <ListGroup><Neighbourly {...props} neighbour="Conversations" /><Neighbourly {...props} neighbour="RestartDetails" /></ListGroup>,
  Developer: (props) => <ListGroup><Opens runtime={props.runtime} page="Problems" /><Hands runtime={props.runtime} target="DeveloperOptions" /><Neighbourly {...props} neighbour="CalendarBackups" /></ListGroup>,
};

/** The pages each further screen of the area draws: Network, Carrier & SIM setup, Passwords, Licences and the Problem log. */
export type Further = Partial<Record<Page, (props: PageProps) => ReactNode>>;

/**
 * Settings: the page showing, its rows each offered exactly when its event is, what Android said about the last page
 * it was asked to open, and Refresh of the phone's facts.
 * @model spec/app/settings/index.md
 */
export function Settings({ runtime, alpha, further }: PageProps & { further: Further }) {
  const { state, cause } = usePages(runtime);
  const facts = useTimed(runtime, useFacts);
  const android = useAndroid(runtime).state;
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Settings</Alert>;
  if (!state) return null;
  const pages: Partial<Record<Page, (props: PageProps) => ReactNode>> = { Top, General, Display, Privacy, Permissions, Apps, InboxApp, ...plain, ...further };
  const Shown = pages[state.page];
  const refresh = { type: "refresh", at: untimed } as const;
  return (
    <section aria-label={titles[state.page]} className="flex flex-col gap-4 p-4">
      {state.page !== "Top" && <h2 className="px-4 text-lg font-semibold">{titles[state.page]}</h2>}
      {android !== undefined && android.told !== "Silent" && <Alert variant="warn">{told[android.told]}</Alert>}
      {facts.state?.read.read.status === "Failed" && <Alert variant="warn">The phone didn't answer</Alert>}
      {Shown && <Shown runtime={runtime} alpha={alpha} />}
      {facts.can(refresh) && state.page !== "Licences" && <Button variant="ghost" onClick={() => void facts.send(refresh)}>Refresh</Button>}
    </section>
  );
}
