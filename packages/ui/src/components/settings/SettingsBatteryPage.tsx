import { Battery, BatteryLow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, Reading, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsBatteryPageProps = SettingsAndroidProps & {
  /** The battery, as the phone last said. */
  battery: Reading;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
};

/**
 * Battery: what the phone says its battery is, and the way into Android's battery saver.
 * @model spec/app/settings/facts.md
 */
export function SettingsBatteryPage({ battery, told, onBack, starting, onAndroid }: SettingsBatteryPageProps) {
  return (
    <SettingsPage title="Battery" told={told} onBack={onBack}>
      <ListGroup>
        <SettingsFactRow title="Battery" icon={<Battery />} reading={battery} />
        <SettingsAndroidRow target="battery-saver" title="Battery saver" icon={<BatteryLow />} starting={starting} onAndroid={onAndroid} />
      </ListGroup>
    </SettingsPage>
  );
}
