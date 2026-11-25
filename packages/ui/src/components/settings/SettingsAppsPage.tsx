import type { ReactNode } from "react";
import { CalendarDays, Camera, Folder, Globe, Images, LockKeyhole, Mail, MapPin, NotebookText, Workflow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type Neighbour, placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsAppsPageProps = SettingsPlaceProps & {
  /** Goes back to the first page. */
  onBack?: () => void;
  /** Opens the settings page of an app. */
  onOpen?: (page: SettingsPageName) => void;
  /** Opens the app itself, through the shell: Browser and Files have nothing to set here. */
  onOpenApp?: (app: "browser" | "files") => void;
  /** Hands over to the passwords area, which owns the password manager. */
  onHandOver?: (neighbour: Neighbour) => void;
};

type AppRow = { title: string; icon: ReactNode; slot: number } & ({ page: SettingsPageName } | { app: "browser" | "files" } | { passwords: true });

/** Every app, in alphabetical order; each keeps its own slot, so Back returns to it. */
const rows: AppRow[] = [
  { title: "Browser", icon: <Globe />, slot: 8, app: "browser" },
  { title: "Calendar", icon: <CalendarDays />, slot: 2, page: "calendar" },
  { title: "Camera", icon: <Camera />, slot: 3, page: "camera" },
  { title: "Files", icon: <Folder />, slot: 9, app: "files" },
  { title: "Inbox", icon: <Mail />, slot: 0, page: "inbox" },
  { title: "Maps", icon: <MapPin />, slot: 5, page: "maps" },
  { title: "Notes", icon: <NotebookText />, slot: 6, page: "notes" },
  { title: "Passwords", icon: <LockKeyhole />, slot: 7, passwords: true },
  { title: "Photos", icon: <Images />, slot: 4, page: "photos" },
  { title: "Workflows", icon: <Workflow />, slot: 1, page: "workflows" },
];

/**
 * Apps: a page for each app with something to set, the password manager, and Browser and Files, which open the app
 * itself.
 * @model spec/app/settings/index.md
 */
export function SettingsAppsPage({ onBack, onOpen, onOpenApp, onHandOver, place, onPlace }: SettingsAppsPageProps) {
  const opens = (row: AppRow) =>
    "page" in row ? onOpen && (() => onOpen(row.page))
      : "app" in row ? onOpenApp && (() => onOpenApp(row.app))
        : onHandOver && (() => onHandOver("password-manager"));
  return (
    <SettingsPage title="Apps" onBack={onBack}>
      <ListGroup>
        {rows.map((row) => <SettingsNavRow key={row.title} title={row.title} icon={row.icon} onOpen={opens(row)} {...placed({ place, onPlace }, row.slot)} />)}
      </ListGroup>
    </SettingsPage>
  );
}
