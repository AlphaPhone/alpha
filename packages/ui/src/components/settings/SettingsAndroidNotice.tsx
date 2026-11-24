import type { ComponentProps } from "react";
import { Banner } from "../Banner.tsx";
import type { AndroidTold } from "./vocabulary.ts";

export type SettingsAndroidNoticeProps = Omit<ComponentProps<typeof Banner>, "variant" | "children" | "action"> & {
  /** What Alpha tells about the last start of an Android page. */
  told: AndroidTold;
};

const words: Record<AndroidTold, { variant: "info" | "warn"; text: string }> = {
  nearby: { variant: "info", text: "Android opened a nearby page" },
  unavailable: { variant: "warn", text: "Android could not open that page" },
  "no-answer": { variant: "warn", text: "Android did not answer. Try again" },
};

/**
 * Says that Android opened a nearby page instead, or none, or did not answer; a page Android refused never falls back to
 * its settings home.
 * @model spec/app/settings/android.md
 */
export function SettingsAndroidNotice({ told, ...props }: SettingsAndroidNoticeProps) {
  const { variant, text } = words[told];
  return <Banner variant={variant} {...props}>{text}</Banner>;
}
