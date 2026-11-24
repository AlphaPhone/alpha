import { SettingsPage } from "./SettingsPage.tsx";

export type SettingsLicenceDetailProps = {
  /** What the licence is for. */
  name: string;
  /** The licence it is under, such as MIT. */
  licence: string;
  /** What the licence obliges, each by Alpha's name for its flag, or as written where Alpha has none. */
  flags?: string[];
  /** The licence text, as shipped. */
  text: string;
  /** Goes back to the list, at the same search. */
  onBack?: () => void;
};

/**
 * One licence: what it is for, which it is, what it obliges, and its text.
 * @model spec/app/settings/licences.md
 */
export function SettingsLicenceDetail({ name, licence, flags = [], text, onBack }: SettingsLicenceDetailProps) {
  return (
    <SettingsPage title={name} onBack={onBack}>
      <p className="text-sm font-semibold text-muted-foreground">{licence}</p>
      {flags.length ? <ul aria-label="What it obliges" className="flex flex-col gap-1 text-sm">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">{text}</p>
    </SettingsPage>
  );
}
