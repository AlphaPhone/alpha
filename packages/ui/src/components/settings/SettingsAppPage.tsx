import { Bell, CalendarDays, Link, ShieldCheck } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { InboxWatchStatus, type InboxWatchStatusProps } from "../inbox/InboxWatchStatus.tsx";
import { SettingsAccessRow } from "./SettingsAccessRow.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsDeviceSwitch, type SettingsDeviceSwitchProps } from "./SettingsDeviceSwitch.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { Access, AccessWord, AndroidTold, Neighbour, SettingsAndroidProps } from "./vocabulary.ts";

type App = "inbox" | "workflows" | "calendar" | "camera" | "photos" | "maps" | "notes";

export type SettingsAppPageProps = SettingsAndroidProps & {
  /** Which app's page. */
  app: App;
  /** Android-specific Calendar permissions follow the native host. */
  onPhone?: boolean;
  /** The actual Google grant reported for Calendar on this visit. */
  calendarStatus?: "checking" | "not-connected" | "read-only" | "connected" | "unchecked";
  /** What the phone said about each access the app uses; one it did not report is unavailable. */
  grants?: Partial<Record<Access, AccessWord>>;
  /** How the phone's read of the device preferences stands, for Inbox's Load images. */
  read?: SettingsDeviceSwitchProps["read"];
  /** Whether Inbox loads images from the web, or the safe value when it could not be read. */
  images?: boolean;
  /** What the phone reports about the Inbox notification channel and its watched account. */
  inboxWatch?: InboxWatchStatusProps;
  /** A save of the device preferences is in flight. */
  saving?: boolean;
  /** A recovery of the device preferences is in flight. */
  recovering?: boolean;
  /** Called with the owner's choice of Load images. */
  onImagesChange?: (images: boolean) => void;
  /** Resets the device preferences to the phone's defaults; offered only when they cannot be read. */
  onRecover?: () => void;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to Apps. */
  onBack?: () => void;
  /** Hands over to the area that owns Google accounts and email, or Google Calendar. */
  onHandOver?: (neighbour: Neighbour) => void;
};

const titles: Record<App, string> = { inbox: "Inbox", workflows: "Workflows", calendar: "Calendar", camera: "Camera", photos: "Photos", maps: "Maps", notes: "Notes" };
const accesses: Record<App, Access[]> = { inbox: [], workflows: [], calendar: ["calendar"], camera: ["camera", "microphone"], photos: ["photos"], maps: ["location"], notes: ["microphone"] };

const calendarDetails = {
  "not-connected": { label: "Not connected", status: "off" },
  "read-only": { label: "Finish setup", status: "warn" },
  connected: { label: "Connected", status: "ok" },
  unchecked: { label: "Couldn’t check", status: "error" },
} as const;

/**
 * The page of one app with something to set: Inbox's Google account and image loading, Workflows' alerts, Calendar's
 * Google account, and for the others the accesses the app uses and the way into Android's permissions.
 * @model spec/app/settings/index.md
 */
export function SettingsAppPage({ app, onPhone = true, calendarStatus, grants = {}, read = "loaded", images = false, inboxWatch, saving, recovering, onImagesChange, onRecover, told, onBack, onHandOver, starting, onAndroid }: SettingsAppPageProps) {
  const android = { starting, onAndroid };
  const deviceSettings = app !== "calendar" || onPhone;
  const detail = calendarStatus === undefined || calendarStatus === "checking" ? undefined : calendarDetails[calendarStatus];
  const used = (deviceSettings ? accesses[app] : []).map((access) => ({ access, grant: grants[access] ?? ("unavailable" as const) }));
  return (
    <SettingsPage title={titles[app]} told={told} onBack={onBack} backLabel="Back to Apps">
      {app === "inbox" ? (
        <ListGroup>
          <SettingsNavRow title="Google & email" icon={<Link />} onOpen={onHandOver && (() => onHandOver("google-and-email"))} />
          <SettingsDeviceSwitch setting="images" read={read} checked={images} saving={saving} recovering={recovering} onChange={onImagesChange} onRecover={onRecover} />
          {inboxWatch && <InboxWatchStatus {...inboxWatch} />}
        </ListGroup>
      ) : null}
      {app === "calendar" ? (
        <ListGroup>
          <SettingsNavRow title="Google Calendar" icon={<CalendarDays />}
            detail={detail && <StatusDot {...detail} showLabel className="gap-1.5 text-caption text-muted-foreground [&_svg]:size-2 [&_svg]:rounded-full [&_svg]:bg-current [&_svg>*]:hidden" />}
            value={calendarStatus === "checking" ? <Spinner size="sm" label="Checking Google Calendar" /> : undefined}
            onOpen={onHandOver && (() => onHandOver("calendar-account"))} />
        </ListGroup>
      ) : null}
      {used.length ? (
        <ListGroup>
          {used.map(({ access, grant }) => <SettingsAccessRow key={access} access={access} grant={grant} />)}
        </ListGroup>
      ) : null}
      {app === "workflows" ? (
        <ListGroup>
          <SettingsAndroidRow target="workflow-alerts" title="Alerts" icon={<Bell />} {...android} />
        </ListGroup>
      ) : app !== "inbox" && deviceSettings ? (
        <ListGroup>
          <SettingsAndroidRow target={app === "photos" ? "photo-permissions" : "app-permissions"} title={app === "photos" ? "Photo access" : "Permissions"} icon={<ShieldCheck />} {...android} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
