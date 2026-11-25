import type { ReactNode } from "react";
import { Code, Info, LayoutGrid, Mic, RefreshCw, Settings, Shield, UserRound } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { SettingsPageLink } from "./SettingsPageLinks.tsx";
import { type AndroidTold, type Neighbour, placed, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsTopPageProps = SettingsAndroidProps &
  SettingsPlaceProps & {
    /** This is a development build, which has the Developer page. */
    developer?: boolean;
    /** The voice area could not confirm the microphone stopped: the listener is linked from here. */
    micMayBeOn?: boolean;
    /** What Alpha tells about the last start of an Android page. */
    told?: AndroidTold;
    /** Opens a page that hangs from this one. */
    onOpen?: (page: SettingsPageName) => void;
    /** Hands over to the area that owns the account and plan, or the listener. */
    onHandOver?: (neighbour: Neighbour) => void;
    /** The rows other areas own on this page, such as the update rows. */
    children?: ReactNode;
    /** The shell's Back control when it offers one. */
    leading?: ReactNode;
  };

const links: SettingsPageLink[] = [
  { page: "general", title: "General", icon: <Settings /> },
  { page: "privacy", title: "Privacy", icon: <Shield /> },
  { page: "apps", title: "Apps", icon: <LayoutGrid /> },
  { page: "about", title: "About", icon: <Info /> },
];

/**
 * The first page of Settings: the account, General, Privacy, Apps and About, Android's own settings, and in a
 * development build the Developer page, each on a card of its own. Rows are numbered by slot, so a row keeps its place
 * whether or not the ones above it are shown.
 * @model spec/app/settings/index.md
 */
export function SettingsTopPage({ developer = false, micMayBeOn = false, told, onOpen, onHandOver, starting, onAndroid, place, onPlace, children, leading }: SettingsTopPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="Settings" leading={leading} top told={told}>
      {micMayBeOn ? (
        <ListGroup>
          <SettingsNavRow title="Microphone may be on" icon={<Mic />} value={<StatusDot status="error" label="Needs attention" />} onOpen={onHandOver && (() => onHandOver("listener"))} {...at(0)} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsNavRow title="Account" icon={<UserRound />} onOpen={onHandOver && (() => onHandOver("account-and-plan"))} {...at(1)} />
      </ListGroup>
      {links.map(({ page, title, icon }, index) => (
        <ListGroup key={page}>
          <SettingsNavRow title={title} icon={icon} onOpen={onOpen && (() => onOpen(page))} {...at(2 + index)} />
        </ListGroup>
      ))}
      {developer ? (
        <ListGroup>
          <SettingsNavRow title="Developer" icon={<Code />} onOpen={onOpen && (() => onOpen("developer"))} {...at(6)} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsAndroidRow target="android-home" title="Android settings" icon={<Settings />} {...android} {...at(7)} />
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="accounts-sync" title="Accounts and sync" icon={<RefreshCw />} {...android} {...at(8)} />
      </ListGroup>
      {children}
    </SettingsPage>
  );
}
