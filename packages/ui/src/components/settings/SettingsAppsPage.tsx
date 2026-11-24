import type { ReactNode } from "react";
import { Calendar, Camera, Folder, Globe, Image, KeyRound, Mail, MapPin, MessageSquare, StickyNote, Workflow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type Neighbour, placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

type AppView = "browser" | "files" | "messages";
type Destination = { page: SettingsPageName } | { neighbour: Neighbour } | { view: AppView };
type AppRow = { title: string; icon: ReactNode } & Destination;

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
  { view: "browser", title: "Browser", icon: <Globe /> },
  { page: "calendar", title: "Calendar", icon: <Calendar /> },
  { page: "camera", title: "Camera", icon: <Camera /> },
  { view: "files", title: "Files", icon: <Folder /> },
  { page: "inbox", title: "Inbox", icon: <Mail /> },
  { page: "maps", title: "Maps", icon: <MapPin /> },
  { view: "messages", title: "Messages", icon: <MessageSquare /> },
  { page: "notes", title: "Notes", icon: <StickyNote /> },
  { neighbour: "password-manager", title: "Passwords", icon: <KeyRound /> },
  { page: "photos", title: "Photos", icon: <Image /> },
  { page: "workflows", title: "Workflows", icon: <Workflow /> },
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
        {apps.map((app, row) => ("view" in app && app.view === "messages" && !image) ? null : (
          <SettingsNavRow key={app.title} title={app.title} icon={app.icon} onOpen={open(app)} {...placed({ place, onPlace }, row)} />
        ))}
      </ListGroup>
    </SettingsPage>
  );
}
