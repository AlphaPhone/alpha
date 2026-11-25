import { Archive, Bug, FlaskConical, Wrench } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsExportRow, type SettingsExportRowProps } from "./SettingsExportRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type AndroidTold, type Neighbour, placed, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsDeveloperPageProps = SettingsAndroidProps &
  SettingsPlaceProps &
  Pick<SettingsExportRowProps, "exporting"> & {
    /** What Alpha tells about the last start of an Android page. */
    told?: AndroidTold;
    /** Goes back to the first page. */
    onBack?: () => void;
    /** Opens the Problem log. */
    onOpen?: (page: SettingsPageName) => void;
    /** Shares the problem log with Alpha's diagnostics. */
    onExport?: () => void;
    /** Switches to mock mode; shown only in a build that allows test mocks. */
    onTryMocks?: () => void;
    /** Hands over to the calendar area, which owns the calendar's saved-event backups. */
    onHandOver?: (neighbour: Neighbour) => void;
  };

/**
 * Developer, in a development build only: the Problem log, Export diagnostics, mock mode where the build allows it, the
 * calendar's backups and Android's developer options.
 * @model spec/app/settings/developer.md
 */
export function SettingsDeveloperPage({ exporting, told, onBack, onOpen, onExport, onTryMocks, onHandOver, starting, onAndroid, place, onPlace }: SettingsDeveloperPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="Developer" told={told} onBack={onBack} backLabel="Back to Settings">
      <ListGroup>
        <SettingsNavRow title="Problem log" icon={<Bug />} onOpen={onOpen && (() => onOpen("problems"))} {...at(0)} />
        <SettingsExportRow exporting={exporting} onExport={onExport} {...at(1)} />
        {onTryMocks ? <SettingsNavRow title="Try mock mode" icon={<FlaskConical />} onOpen={onTryMocks} {...at(2)} /> : null}
      </ListGroup>
      <ListGroup>
        <SettingsNavRow title="Calendar backups" icon={<Archive />} onOpen={onHandOver && (() => onHandOver("calendar-backups"))} {...at(3)} />
        <SettingsAndroidRow target="developer-options" title="Developer options" icon={<Wrench />} starting={starting} onAndroid={onAndroid} {...at(4)} />
      </ListGroup>
    </SettingsPage>
  );
}
