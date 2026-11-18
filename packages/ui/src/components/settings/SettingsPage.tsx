import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../Button.tsx";
import { Screen } from "../Screen.tsx";
import { SettingsAndroidNotice } from "./SettingsAndroidNotice.tsx";
import type { AndroidTold } from "./vocabulary.ts";

export type SettingsPageProps = {
  /** The page's one title. */
  title: string;
  /** Goes back to the parent page, at the row left; the Back button is shown only with it, so the first page has none. */
  onBack?: () => void;
  /** What Alpha tells about the last start of an Android page, above the rows. */
  told?: AndroidTold;
  /** The page's own actions, at the end of its header. */
  actions?: ReactNode;
  /** The page's rows. */
  children?: ReactNode;
};

/**
 * The frame of every Settings page: its title, the way back and the notice about Android, over a scrolling body.
 * @model spec/app/settings/index.md
 */
export function SettingsPage({ title, onBack, told, actions, children }: SettingsPageProps) {
  return (
    <Screen
      title={title}
      leading={onBack ? <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ChevronLeft /></Button> : undefined}
      actions={actions}
    >
      {told ? <SettingsAndroidNotice told={told} /> : null}
      {children}
    </Screen>
  );
}
