import type { ReactNode } from "react";
import { CalendarDays, Camera, Folder, Globe, Images, LockKeyhole, Mail, MapPin, MessageSquare, NotebookText, Workflow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type Neighbour, placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

type AppView = "browser" | "files" | "messages";
type Destination = { page: SettingsPageName } | { neighbour: Neighbour } | { view: AppView };
type AppRow = { title: string; icon: ReactNode; slot: number } & Destination;

export type SettingsAppsPageProps = SettingsPlaceProps & {
  /** Goes back to the first page. */
  onBack?: () => void;
  /** Opens the settings page of an app. */
  onOpen?: (page: SettingsPageName) => void;
  /** Opens the app itself, through the shell. */
  onOpenApp?: (app: AppView) => void;
  /** Hands over to the passwords area, which owns the password manager. */
  onHandOver?: (neighbour: Neighbour) => void;
  /** Messages is available on an Alpha image. */
  image?: boolean;
};

const apps: AppRow[] = [
  { view: "browser", title: "Browser", slot: 8, icon: <Globe /> },
  { page: "calendar", title: "Calendar", slot: 2, icon: <CalendarDays /> },
  { page: "camera", title: "Camera", slot: 3, icon: <Camera /> },
  { view: "files", title: "Files", slot: 9, icon: <Folder /> },
  { page: "inbox", title: "Inbox", slot: 0, icon: <Mail /> },
  { page: "maps", title: "Maps", slot: 5, icon: <MapPin /> },
  { view: "messages", title: "Messages", slot: 10, icon: <MessageSquare /> },
  { page: "notes", title: "Notes", slot: 6, icon: <NotebookText /> },
  { neighbour: "password-manager", title: "Passwords", slot: 7, icon: <LockKeyhole /> },
  { page: "photos", title: "Photos", slot: 4, icon: <Images /> },
  { page: "workflows", title: "Workflows", slot: 1, icon: <Workflow /> },
];

/**
 * Apps shows the phone's app catalog. Apps with their own settings open them and the rest open the app itself.
 * @model spec/app/settings/index.md
 */
export function SettingsAppsPage({ onBack, onOpen, onOpenApp, onHandOver, image = false, place, onPlace }: SettingsAppsPageProps) {
  const open = (app: AppRow) => {
    if ("page" in app) return onOpen && (() => onOpen(app.page));
    if ("view" in app) return onOpenApp && (() => onOpenApp(app.view));
    return onHandOver && (() => onHandOver(app.neighbour));
  };
  return (
    <SettingsPage title="Apps" onBack={onBack} backLabel="Back to Settings">
      <ListGroup>
        {apps.map((app) => ("view" in app && app.view === "messages" && !image) ? null : (
          <SettingsNavRow key={app.title} title={app.title} icon={app.icon} onOpen={open(app)} {...placed({ place, onPlace }, app.slot)} />
        ))}
      </ListGroup>
    </SettingsPage>
  );
}
