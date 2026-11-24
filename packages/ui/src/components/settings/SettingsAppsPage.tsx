import { Calendar, Camera, Globe, Folder, Image, KeyRound, Mail, MapPin, StickyNote, Workflow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type SettingsPageLink, SettingsPageLinks } from "./SettingsPageLinks.tsx";
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

const links: SettingsPageLink[] = [
  { page: "inbox", title: "Inbox", icon: <Mail /> },
  { page: "workflows", title: "Workflows", icon: <Workflow /> },
  { page: "calendar", title: "Calendar", icon: <Calendar /> },
  { page: "camera", title: "Camera", icon: <Camera /> },
  { page: "photos", title: "Photos", icon: <Image /> },
  { page: "maps", title: "Maps", icon: <MapPin /> },
  { page: "notes", title: "Notes", icon: <StickyNote /> },
];

/**
 * Apps: a page for each app with something to set, the password manager, and Browser and Files, which open the app
 * itself.
 * @model spec/app/settings/index.md
 */
export function SettingsAppsPage({ onBack, onOpen, onOpenApp, onHandOver, place, onPlace }: SettingsAppsPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="Apps" onBack={onBack}>
      <ListGroup>
        <SettingsPageLinks links={links} onOpen={onOpen} place={place} onPlace={onPlace} />
        <SettingsNavRow title="Password manager" icon={<KeyRound />} onOpen={onHandOver && (() => onHandOver("password-manager"))} {...at(7)} />
      </ListGroup>
      <ListGroup>
        <SettingsNavRow title="Browser" icon={<Globe />} onOpen={onOpenApp && (() => onOpenApp("browser"))} {...at(8)} />
        <SettingsNavRow title="Files" icon={<Folder />} onOpen={onOpenApp && (() => onOpenApp("files"))} {...at(9)} />
      </ListGroup>
    </SettingsPage>
  );
}
