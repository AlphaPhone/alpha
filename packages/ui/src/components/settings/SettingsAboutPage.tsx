import type { ReactNode } from "react";
import { History, Scale, Smartphone } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { Mark } from "../Mark.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type AndroidTold, placed, type Reading, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsAboutPageProps = SettingsAndroidProps &
  SettingsPlaceProps & {
    /** Alpha's version, as the phone last said. */
    alphaVersion: Reading;
    /** Android's version, as the phone last said. */
    androidVersion: Reading;
    /** The storage used, as the phone last said. */
    storage?: Reading;
    /** Alpha runs on the phone, where it has an agent and an Android Settings page. */
    onPhone?: boolean;
    /** What the resident agent last reported. */
    agent?: "running" | "starting" | "needs-you" | "stopped";
    /** What Alpha tells about the last start of an Android page. */
    told?: AndroidTold;
    /** Goes back to the first page. */
    onBack?: () => void;
    /** Opens a page that hangs from this one. */
    onOpen?: (page: SettingsPageName) => void;
    /** The rows other areas own on this page, such as the update rows. */
    children?: ReactNode;
  };

/**
 * About: Alpha and its version, Android's version, Agent activity, the licences, and the way into Android's About phone.
 * @model spec/app/settings/index.md
 */
export function SettingsAboutPage({ alphaVersion, androidVersion, storage, onPhone = true, agent, told, onBack, onOpen, starting, onAndroid, place, onPlace, children }: SettingsAboutPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="About" told={told} onBack={onBack}>
      <div className="flex justify-center py-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-alpha text-alpha-foreground">
          <Mark aria-hidden className="size-8" />
        </span>
      </div>
      <ListGroup>
        <SettingsFactRow title="Alpha" reading={alphaVersion} />
        <SettingsFactRow title="Android" reading={androidVersion} />
        {storage ? <SettingsFactRow title="Storage" reading={storage} /> : null}
      </ListGroup>
      <ListGroup>
        {onPhone ? <SettingsNavRow title="Agent activity" value={agent === "running" ? "Running" : agent === "starting" ? "Starting" : agent === "needs-you" ? "Needs attention" : agent === "stopped" ? "Stopped" : undefined} icon={<History />} onOpen={onOpen && (() => onOpen("activity"))} {...at(0)} /> : null}
        <SettingsNavRow title="Licences" icon={<Scale />} onOpen={onOpen && (() => onOpen("licences"))} {...at(1)} />
        {onPhone ? <SettingsAndroidRow target="about-phone" title="About phone" icon={<Smartphone />} starting={starting} onAndroid={onAndroid} {...at(2)} /> : null}
      </ListGroup>
      {children}
    </SettingsPage>
  );
}
