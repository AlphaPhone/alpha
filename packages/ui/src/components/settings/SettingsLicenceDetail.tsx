import { SettingsPage } from "./SettingsPage.tsx";

export type SettingsLicenceDetailProps = {
  /** What the licence is for. */
  name: string;
  /** The licence it is under, such as MIT. */
  licence: string;
  /** The licence text, as shipped. */
  text: string;
  /** Goes back to the list, at the same search. */
  onBack?: () => void;
};

/**
 * One licence: what it is for, which it is, and its text.
 * @model spec/app/settings/licences.md
 */
export function SettingsLicenceDetail({ name, licence, text, onBack }: SettingsLicenceDetailProps) {
  return (
    <SettingsPage title={name} onBack={onBack}>
      <p className="text-sm font-semibold text-muted-foreground">{licence}</p>
      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">{text}</p>
    </SettingsPage>
  );
}
