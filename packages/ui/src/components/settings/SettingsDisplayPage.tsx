import { Smartphone, SunMedium, Type } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsAppearancePicker, type SettingsAppearancePickerProps } from "./SettingsAppearancePicker.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsPreferencesNotice, type SettingsPreferencesNoticeProps } from "./SettingsPreferencesNotice.tsx";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import { SettingsTextSizePicker, type SettingsTextSizePickerProps } from "./SettingsTextSizePicker.tsx";
import type { AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsDisplayPageProps = SettingsAndroidProps & {
  /** The appearance shown. */
  theme: SettingsAppearancePickerProps["theme"];
  /** A choice is being kept on the phone. */
  keeping?: boolean;
  /** Whether text is drawn in the legible face, kept with the appearance. */
  legible?: boolean;
  /** Called with the owner's choice of legible text. */
  onLegibleChange?: (legible: boolean) => void;
  /** Called with the owner's choice of appearance. */
  onChooseTheme?: SettingsAppearancePickerProps["onChoose"];
  /** The size the phone says it applied, or 0 while it has reported none. */
  size: SettingsTextSizePickerProps["size"];
  /** The phone is applying a size or reading it. */
  sizing?: boolean;
  /** Called with the owner's choice of text size. */
  onChooseSize?: SettingsTextSizePickerProps["onChoose"];
  /** What a preference change did not do. */
  notice?: SettingsPreferencesNoticeProps["notice"];
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
};

/**
 * Display: the appearance, the size of the text and the way into Android's display settings.
 * @model spec/app/settings/preferences.md
 */
export function SettingsDisplayPage({ theme, keeping, onChooseTheme, legible = false, onLegibleChange, size, sizing, onChooseSize, notice, told, onBack, starting, onAndroid }: SettingsDisplayPageProps) {
  return (
    <SettingsPage title="Display" told={told} onBack={onBack} backLabel="Back to General">
      {notice ? <SettingsPreferencesNotice notice={notice} /> : null}
      <p aria-hidden className="px-2 pt-1 pb-2.5 font-display text-headline font-light">Aa</p>
      <SettingsAppearancePicker theme={theme} keeping={keeping} onChoose={onChooseTheme} />
      <SettingsTextSizePicker size={size} busy={sizing} onChoose={onChooseSize} />
      <ListGroup>
        <SettingsSwitchRow title="Legible text" icon={<Type />} checked={legible} saving={keeping} onCheckedChange={onLegibleChange} />
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="display-settings" title="Display settings" icon={<Smartphone />} starting={starting} onAndroid={onAndroid} />
        <SettingsAndroidRow target="brightness" title="Brightness" icon={<SunMedium />} starting={starting} onAndroid={onAndroid} />
      </ListGroup>
    </SettingsPage>
  );
}
