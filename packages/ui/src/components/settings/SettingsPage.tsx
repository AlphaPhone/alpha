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
export function SettingsPage({ title, top = false, leading, onBack, told, actions, children }: SettingsPageProps) {
  return (
    <Screen
      title={title}
      leading={leading ?? (onBack ? <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ChevronLeft /></Button> : undefined)}
      actions={actions}
      className={cn(
        "pt-[max(--spacing(11),env(safe-area-inset-top))] [&>main]:touch-pan-y [&>main]:pb-[calc(--spacing(32.5)+env(safe-area-inset-bottom))] [&>main>div]:gap-3 [&>main>div]:pt-1",
        top ? "[&>header]:pl-5 [&>header>h1]:pl-0" : "[&>header]:pr-4 [&>header>h1]:text-home-display",
      )}
    >
      {told ? <SettingsAndroidNotice told={told} /> : null}
      {children}
    </Screen>
  );
}
