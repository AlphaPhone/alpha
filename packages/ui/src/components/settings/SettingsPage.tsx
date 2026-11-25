import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Screen } from "../Screen.tsx";
import { SettingsAndroidNotice } from "./SettingsAndroidNotice.tsx";
import type { AndroidTold } from "./vocabulary.ts";

export type SettingsPageProps = {
  /** The page's one title. */
  title: string;
  /** The top-level Settings page has the full-size title and the shell's Back control. */
  top?: boolean;
  /** Kind of navigation the owner reached before opening Settings. */
  leading?: ReactNode;
  /** Goes back to the parent page, at the row left; the Back button is shown only with it, so the first page has none. */
  onBack?: () => void;
  /** The parent page Back returns to. */
  backLabel?: string;
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
export function SettingsPage({ title, top = false, leading, onBack, backLabel = "Back", told, actions, children }: SettingsPageProps) {
  return (
    <Screen
      data-settings-page={title}
      title={title}
      leading={leading ?? (onBack ? <Button variant="ghost" size="icon" aria-label={backLabel} onClick={onBack}><ChevronLeft /></Button> : undefined)}
      actions={actions}
      className={cn(
        "[&>main]:touch-pan-y [&>main]:pb-[calc(--spacing(32.5)+env(safe-area-inset-bottom))] [&>header>h1]:truncate",
        "in-data-[alpha-launcher]:pt-[max(--spacing(11),env(safe-area-inset-top))] in-data-[alpha-launcher]:[&>header]:min-h-14 in-data-[alpha-launcher]:[&>header>h1]:font-display in-data-[alpha-launcher]:[&>header>h1]:font-light",
        top
          ? "in-data-[alpha-launcher]:[&>header]:pl-5 in-data-[alpha-launcher]:[&>header>h1]:pl-0 in-data-[alpha-launcher]:[&>header>h1]:text-3xl"
          : "in-data-[alpha-launcher]:[&>header]:pr-4 in-data-[alpha-launcher]:[&>header>h1]:text-home-display",
      )}
    >
      {told ? <SettingsAndroidNotice told={told} /> : null}
      {children}
    </Screen>
  );
}
