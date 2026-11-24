import type { ComponentProps } from "react";
import { Banner } from "../Banner.tsx";

export type SettingsPreferencesNoticeProps = Omit<ComponentProps<typeof Banner>, "variant" | "children" | "action"> & {
  /** What did not go through: a choice that was not saved, a text size the phone did not confirm or has none of, a recovery that failed. */
  notice: "not-saved" | "size-not-confirmed" | "size-unavailable" | "not-recovered";
};

const words: Record<SettingsPreferencesNoticeProps["notice"], string> = {
  "not-saved": "Not saved. Nothing changed",
  "size-not-confirmed": "The phone did not confirm the text size",
  "size-unavailable": "This phone gives no text size",
  "not-recovered": "Device settings were not recovered",
};

/**
 * Says what a preference change did not do, in the flow of the page; Alpha never shows a change the phone did not keep.
 * @model spec/app/settings/preferences.md
 */
export function SettingsPreferencesNotice({ notice, ...props }: SettingsPreferencesNoticeProps) {
  return <Banner variant="warn" {...props}>{words[notice]}</Banner>;
}
