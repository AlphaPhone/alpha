import type { ReactNode } from "react";
import { SettingsRecoverRow } from "./SettingsRecoverRow.tsx";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import type { DeviceRead } from "./vocabulary.ts";

export type SettingsDeviceSwitchProps = {
  /**
   * Which device preference: whether Alpha asks before it acts, whether Inbox loads images from the web, or what Alpha
   * may share with a chat turn or change: the phone's location, the Browser page open, Gmail and Calendar.
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
    {words.map((word) => <span key={word} className="rounded-full bg-background px-2.5 py-0.75 text-fine leading-normal text-muted-foreground">{word}</span>)}
  </span>
);

/** Each switch as Alpha's earlier build drew its toggles: a title and what it covers, with no icon. */
const settings: Record<SettingsDeviceSwitchProps["setting"], { title: string; detail: ReactNode }> = {
  "ask-first": { title: "Ask before Alpha acts", detail: tags(["Web", "Camera", "Photos", "Texter’s number", "Text drafts"]) },
  images: { title: "Load images", detail: undefined },
  "agent-location": { title: "Location for Alpha", detail: <span className="block leading-normal whitespace-normal">Alpha uses your last known location in chats. Hosted models can receive it.</span> },
  "browser-page": { title: "Browser page for Alpha", detail: <span className="block leading-normal whitespace-normal">When you chat with Browser open, Alpha gets the page’s address, title, visible text and links. Never private tabs or sign-in pages. Hosted models can receive it.</span> },
  "gmail-changes": { title: "Gmail changes", detail: "Drafts, labels and sending" },
  "calendar-edits": { title: "Calendar changes", detail: "Events Alpha adds or edits" },
  "telegram-context": { title: "Telegram screen", detail: "The open Telegram chat, when signed in" },
  "slack-context": { title: "Slack screen", detail: "The open Slack channel or thread, when signed in" },
};

/**
 * Ask before Alpha acts, Load images in Inbox, or what Alpha may share and change. Locked to the safe value when the device preferences cannot be read,
 * with the way to recover them.
 * @model spec/app/settings/preferences.md
 */
export function SettingsDeviceSwitch({ setting, read, checked, saving, recovering, onChange, onRecover }: SettingsDeviceSwitchProps) {
  const { title, detail } = settings[setting];
  return (
    <>
      <SettingsSwitchRow title={title} detail={setting === "ask-first" && read !== "loaded" ? undefined : detail} checked={checked} onCheckedChange={onChange} reading={read === "reading"} locked={read === "failed"} saving={saving} />
      {onRecover || recovering ? <SettingsRecoverRow store="device-preferences" busy={recovering} onRecover={onRecover} /> : null}
    </>
  );
}
