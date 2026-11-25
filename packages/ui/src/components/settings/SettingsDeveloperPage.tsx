import { Archive, FlaskConical, SlidersHorizontal } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsExportRow, type SettingsExportRowProps } from "./SettingsExportRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type AndroidTold, type Neighbour, placed, type Reading, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsDeveloperPageProps = SettingsAndroidProps &
  SettingsPlaceProps &
  Pick<SettingsExportRowProps, "exporting"> & {
    /** Alpha's version, as the phone last said. */
    version?: Reading;
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
 * Developer, in a development build only: Alpha's version, the Problem log, Export diagnostics, mock mode where the build allows it, the
 * calendar's backups and Android's developer options.
 * @model spec/app/settings/developer.md
 */
export function SettingsDeveloperPage({ version, exporting, told, onBack, onOpen, onExport, onTryMocks, onHandOver, starting, onAndroid, place, onPlace }: SettingsDeveloperPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="Developer" told={told} onBack={onBack} backLabel="Back to Settings">
      {version ? (
        <ListGroup>
          <SettingsFactRow title="App version" reading={version} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsNavRow title="Problem log" icon={<SlidersHorizontal />} onOpen={onOpen && (() => onOpen("problems"))} {...at(0)} />
        <SettingsExportRow icon={<SlidersHorizontal />} exporting={exporting} onExport={onExport} {...at(1)} />
        {onTryMocks ? <SettingsNavRow title="Try mock mode" icon={<FlaskConical />} onOpen={onTryMocks} {...at(2)} /> : null}
      </ListGroup>
      <ListGroup>
        <SettingsNavRow title="Calendar backups" icon={<Archive />} onOpen={onHandOver && (() => onHandOver("calendar-backups"))} {...at(3)} />
        <SettingsAndroidRow target="developer-options" title="Android developer settings" icon={<SlidersHorizontal />} starting={starting} onAndroid={onAndroid} {...at(4)} />
      </ListGroup>
    </SettingsPage>
  );
}
