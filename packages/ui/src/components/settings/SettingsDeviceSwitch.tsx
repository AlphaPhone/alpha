import { Globe, ImageDown } from "lucide-react";
import { SettingsRecoverRow } from "./SettingsRecoverRow.tsx";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import type { DeviceRead } from "./vocabulary.ts";

export type SettingsDeviceSwitchProps = {
  /** Which device preference: whether Alpha asks before it acts, or whether Inbox loads images from the web. */
  setting: "ask-first" | "images";
  /** How the phone's read of the device preferences stands; they cannot be changed until it has read them. */
  read: DeviceRead;
  /** The value read, or the safe one (asking first, loading no images) when the phone could not read. */
  checked: boolean;
  /** A save is in flight. */
  saving?: boolean;
  /** A recovery is in flight. */
  recovering?: boolean;
  /** Called with the value the owner chose. */
  onChange?: (checked: boolean) => void;
  /** Resets the device preferences to the phone's defaults; the row is offered only when they cannot be read. */
  onRecover?: () => void;
};

const settings = {
  "ask-first": { title: "Ask before Alpha acts", detail: "Web, camera, photos", icon: <Globe /> },
  images: { title: "Load images", detail: "From the web, in Inbox", icon: <ImageDown /> },
};

/**
 * Ask before Alpha acts, or Load images in Inbox. Locked to the safe value when the device preferences cannot be read,
 * with the way to recover them.
 * @model spec/app/settings/preferences.md
 */
export function SettingsDeviceSwitch({ setting, read, checked, saving, recovering, onChange, onRecover }: SettingsDeviceSwitchProps) {
  return (
    <>
      <SettingsSwitchRow {...settings[setting]} checked={checked} onCheckedChange={onChange} reading={read === "reading"} locked={read === "failed"} saving={saving} />
      {onRecover || recovering ? <SettingsRecoverRow store="device-preferences" busy={recovering} onRecover={onRecover} /> : null}
    </>
  );
}
