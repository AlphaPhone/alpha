import type { ReactNode } from "react";
import { CalendarCog, Hash, MailCheck, MapPin, PanelTop, Send } from "lucide-react";
import { SettingsRecoverRow } from "./SettingsRecoverRow.tsx";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import type { DeviceRead } from "./vocabulary.ts";

export type SettingsDeviceSwitchProps = {
  /**
   * Which device preference: whether Alpha asks before it acts, whether Inbox loads images from the web, or what Alpha
   * may share with a chat turn or change: the phone's location, the Browser page open, Gmail, Calendar, Telegram and Slack.
   */
  setting: "ask-first" | "images" | "agent-location" | "browser-page" | "gmail-changes" | "calendar-edits" | "telegram-context" | "slack-context";
  /** How the phone's read of the device preferences stands; they cannot be changed until it has read them. */
  read: DeviceRead;
  /** The value read, or the safe one (asking first, loading no images, sharing nothing) when the phone could not read. */
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

const tags = (words: string[]) => (
  <span className="mt-1 flex flex-wrap gap-1.5 whitespace-normal">
    {words.map((word) => <span key={word} className="rounded-sm bg-background px-2.5 py-0.75 text-fine text-muted-foreground">{word}</span>)}
  </span>
);

const settings: Record<SettingsDeviceSwitchProps["setting"], { title: string; detail: ReactNode; icon?: ReactNode }> = {
  "ask-first": { title: "Ask before Alpha acts", detail: tags(["Web", "Camera", "Photos"]) },
  images: { title: "Load images", detail: undefined },
  "agent-location": { title: "Location", detail: "With each message to Alpha", icon: <MapPin /> },
  "browser-page": { title: "Browser page", detail: "The page open, with each message", icon: <PanelTop /> },
  "gmail-changes": { title: "Gmail changes", detail: "Drafts, labels and sending", icon: <MailCheck /> },
  "calendar-edits": { title: "Calendar changes", detail: "Events Alpha adds or edits", icon: <CalendarCog /> },
  "telegram-context": { title: "Telegram screen", detail: "Open chat and recent messages", icon: <Send /> },
  "slack-context": { title: "Slack screen", detail: "Open channel or thread, with each message", icon: <Hash /> },
};

/**
 * Ask before Alpha acts, Load images in Inbox, or what Alpha may share and change. Locked to the safe value when the device preferences cannot be read,
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
