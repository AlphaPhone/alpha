import type { ComponentProps } from "react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";

export type SettingsResetNoticeProps = Omit<ComponentProps<typeof Banner>, "variant" | "children" | "action"> & {
  /** What Alpha said about the reset, in its own words; "Erased" only once the phone confirmed it. */
  said:
    | "not-confirmed-its-you" | "erase-unavailable" | "review-expired" | "review-already-open" | "set-a-screen-lock" | "no-device-auth"
    | "may-still-go-ahead" | "not-erased" | "could-not-tell" | "erased";
  /** Starts another try of the pending reset; the button is shown only with it, when the phone may try. */
  onTryAgain?: () => void;
};

const words: Record<SettingsResetNoticeProps["said"], string> = {
  "not-confirmed-its-you": "The phone could not confirm it was you. Nothing was erased",
  "erase-unavailable": "Reset is not available right now. Nothing was erased",
  "review-expired": "The review expired. Nothing was erased",
  "review-already-open": "A review is already open",
  "set-a-screen-lock": "Set a screen lock in Android settings first. Nothing was erased",
  "no-device-auth": "Unlocking is unavailable. Nothing was erased",
  "may-still-go-ahead": "The reset you confirmed may still go ahead. Reopen Alpha to find out",
  "not-erased": "Nothing was erased",
  "could-not-tell": "Alpha cannot tell whether the data was erased",
  erased: "All data was erased",
};

/**
 * Says how a reset went, never that data was erased unless the phone confirmed it.
 * @model spec/app/settings/reset.md
 */
export function SettingsResetNotice({ said, onTryAgain, ...props }: SettingsResetNoticeProps) {
  return (
    <Banner variant={said === "erased" ? "info" : "warn"} action={onTryAgain ? <Button variant="outline" size="sm" onClick={onTryAgain}>Try again</Button> : undefined} {...props}>
      {words[said]}
    </Banner>
  );
}
