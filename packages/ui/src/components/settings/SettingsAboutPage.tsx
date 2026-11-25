import type { ReactNode } from "react";
import { Clock, SlidersHorizontal } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { Mark } from "../Mark.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import { type AndroidTold, placed, type Reading, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsAboutPageProps = SettingsAndroidProps &
  SettingsPlaceProps & {
    /** Alpha's version, as the phone last said. */
    alphaVersion: Reading;
    /** Android's version, as the phone last said. */
    androidVersion: Reading;
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
 * About as Alpha's earlier build drew it: Alpha's mark, name and version, then on a phone Android's version, Agent
 * activity and the licences.
 * @model spec/app/settings/index.md
 */
export function SettingsAboutPage({ alphaVersion, androidVersion, onPhone = true, agent, told, onBack, onOpen, place, onPlace, children }: SettingsAboutPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="About" told={told} onBack={onBack} backLabel="Back to Settings">
      <div className="flex flex-col items-center gap-2.5 px-6 pt-5.5 pb-4.5 text-center">
        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground">
          <Mark aria-hidden className="size-[118%] shrink-0" />
        </span>
        <h2 className="font-display text-title font-light">Alpha Phone</h2>
        <p className="text-caption text-muted-foreground">
          {alphaVersion.word === "reported" ? `Version ${alphaVersion.value}` : !onPhone && alphaVersion.word === "unavailable" ? "Development preview" : <SettingsReading reading={alphaVersion} />}
        </p>
      </div>
      {onPhone ? (
        <ListGroup>
          <SettingsFactRow title="Android version" reading={androidVersion} />
        </ListGroup>
      ) : null}
      <ListGroup>
        {onPhone ? <SettingsNavRow title="Agent activity" value={agent === "running" ? "Running" : agent === "starting" ? "Starting" : agent === "needs-you" ? "Needs attention" : agent === "stopped" ? "Stopped" : undefined} icon={<Clock />} onOpen={onOpen && (() => onOpen("activity"))} {...at(0)} /> : null}
        <SettingsNavRow title="Licenses" icon={<SlidersHorizontal />} onOpen={onOpen && (() => onOpen("licences"))} {...at(1)} />
      </ListGroup>
      {children}
    </SettingsPage>
  );
}
