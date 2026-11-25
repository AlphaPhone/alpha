import type { ReactNode } from "react";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold } from "./vocabulary.ts";

export type SettingsPhonePageProps = {
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
  /** The SIMs, carrier and telephony roles reported by the Phone app. */
  children?: ReactNode;
};

/**
 * Phone, on an Alpha image: the SIMs, carrier, number and the apps that handle calls and texts, as the Phone app reports
 * them. Who holds the Home and Assistant roles is on General.
 * @model spec/app/settings/facts.md
 */
export function SettingsPhonePage({ told, onBack, children }: SettingsPhonePageProps) {
  return (
    <SettingsPage title="Phone" told={told} onBack={onBack} backLabel="Back to General">
      {children}
    </SettingsPage>
  );
}
