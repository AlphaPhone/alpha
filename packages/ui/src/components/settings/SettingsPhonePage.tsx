import type { ReactNode } from "react";
import { AppWindow } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsRoleRow, type SettingsRoleRowProps } from "./SettingsRoleRow.tsx";
import { SettingsSetAsHomeRow } from "./SettingsSetAsHomeRow.tsx";
import type { AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsPhonePageProps = SettingsAndroidProps & {
  /** Who holds the Home role, as the phone last said. */
  home: SettingsRoleRowProps["word"];
  /** Who holds the Assistant role, as the phone last said. */
  assistant: SettingsRoleRowProps["word"];
  /** Android's dialog for the Home role is open. */
  requesting?: boolean;
  /** Asks Android to make Alpha the Home app; offered when the phone reported a role Alpha can take and does not hold. */
  onRequestHome?: () => void;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
  /** The SIMs, carrier and telephony roles reported by the Phone app. */
  children?: ReactNode;
};

/**
 * Phone, on an Alpha image: who holds the Home and Assistant roles as the phone says, Set as Home, and Android's
 * default apps, where the Assistant is changed.
 * @model spec/app/settings/facts.md
 */
export function SettingsPhonePage({ home, assistant, requesting, onRequestHome, told, onBack, starting, onAndroid, children }: SettingsPhonePageProps) {
  return (
    <SettingsPage title="Phone" told={told} onBack={onBack} backLabel="Back to General">
      {children}
      <ListGroup>
        <SettingsRoleRow role="home" word={home} />
        <SettingsRoleRow role="assistant" word={assistant} />
        {requesting || onRequestHome ? <SettingsSetAsHomeRow requesting={requesting} onRequest={onRequestHome} /> : null}
        <SettingsAndroidRow target="default-apps" title="Default apps" icon={<AppWindow />} starting={starting} onAndroid={onAndroid} />
      </ListGroup>
    </SettingsPage>
  );
}
