import { Bell, CalendarDays, Link, ShieldCheck } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
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
  /** What the phone said about each access the app uses; one it did not report is unavailable. */
  grants?: Partial<Record<Access, AccessWord>>;
  /** How the phone's read of the device preferences stands, for Inbox's Load images. */
  read?: SettingsDeviceSwitchProps["read"];
  /** Whether Inbox loads images from the web, or the safe value when it could not be read. */
  images?: boolean;
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

/**
 * The page of one app with something to set: Inbox's Google account and image loading, Workflows' alerts, Calendar's
 * Google account, and for the others the accesses the app uses and the way into Android's permissions.
 * @model spec/app/settings/index.md
 */
export function SettingsAppPage({ app, grants = {}, read = "loaded", images = false, saving, recovering, onImagesChange, onRecover, told, onBack, onHandOver, starting, onAndroid }: SettingsAppPageProps) {
  const android = { starting, onAndroid };
  const used = accesses[app].flatMap((access) => {
    const grant = grants[access];
    return grant ? [{ access, grant }] : [];
  });
  return (
    <SettingsPage title={titles[app]} told={told} onBack={onBack} backLabel="Back to Apps">
      {app === "inbox" ? (
        <ListGroup>
          <SettingsNavRow title="Google & email" icon={<Link />} onOpen={onHandOver && (() => onHandOver("google-and-email"))} />
          <SettingsDeviceSwitch setting="images" read={read} checked={images} saving={saving} recovering={recovering} onChange={onImagesChange} onRecover={onRecover} />
        </ListGroup>
      ) : null}
      {app === "calendar" ? (
        <ListGroup>
          <SettingsNavRow title="Google Calendar" icon={<CalendarDays />} onOpen={onHandOver && (() => onHandOver("calendar-account"))} />
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
      ) : app !== "inbox" ? (
        <ListGroup>
          <SettingsAndroidRow target={app === "photos" ? "photo-permissions" : "app-permissions"} title={app === "photos" ? "Photo access" : "Permissions"} icon={<ShieldCheck />} {...android} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
