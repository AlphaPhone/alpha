import { BellOff, Volume2 } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, Reading, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsSoundPageProps = SettingsAndroidProps & {
  /** The phone's sound, as it last said. */
  sound: Reading;
  /** The volume of each sound stream, independently as Android reported it. */
  media?: Reading;
  ring?: Reading;
  alarm?: Reading;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
};

/**
 * Sound: what the phone says its sound is, and the way into Android's sound and Do Not Disturb settings.
 * @model spec/app/settings/facts.md
 */
export function SettingsSoundPage({ sound, media, ring, alarm, told, onBack, starting, onAndroid }: SettingsSoundPageProps) {
  return (
    <SettingsPage title="Sound" told={told} onBack={onBack} backLabel="Back to General">
      {media || ring || alarm ? (
        <ListGroup>
          {media ? <SettingsFactRow title="Media" reading={media} /> : null}
          {ring ? <SettingsFactRow title="Ring" reading={ring} /> : null}
          {alarm ? <SettingsFactRow title="Alarm" reading={alarm} /> : null}
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsFactRow title="Do Not Disturb" icon={<BellOff />} reading={sound} />
        <SettingsAndroidRow target="sound-settings" title="Sound settings" icon={<Volume2 />} starting={starting} onAndroid={onAndroid} />
        <SettingsAndroidRow target="do-not-disturb" title="Do Not Disturb" icon={<BellOff />} starting={starting} onAndroid={onAndroid} />
      </ListGroup>
    </SettingsPage>
  );
}
