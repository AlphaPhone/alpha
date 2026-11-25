import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export type AppHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The screen's one title; under large text it wraps rather than being cut, but for a `detail` title on the launcher. */
  title: string;
  /** The control that leaves the screen, usually a back `Button`; shown before the title. */
  leading?: ReactNode;
  /** An inline control that takes the place of the visible title, such as a search field. */
  titleControl?: ReactNode;
  /** The screen's own actions, at the end. */
  children?: ReactNode;
  /**
   * A screen under an app's first one, such as a folder, an album or a selection. On the launcher its title is the
   * smaller display title on one line, cut with an ellipsis, as Alpha's earlier build drew it on the phone.
   */
  detail?: boolean;
};

/**
 * The top of a screen: where the owner is, the way back and what can be done here. Its icon buttons are 52px. On the
 * launcher (`data-alpha-launcher`, the phone's Home) the title is the serif display title, as Alpha's earlier build drew
 * it on the phone: `3xl` on an app's first screen and `home-display` under it (`detail`).
 */
export function AppHeader({ title, leading, titleControl, detail = false, className, children, ...props }: AppHeaderProps) {
  return (
    <header data-host-chrome="" className={cn("flex min-h-13 items-center gap-0.5 px-2 [&_button[aria-label]]:size-13 [&_button[aria-label]]:min-w-13", className)} {...props}>
      {leading}
      <h1
        className={titleControl ? "sr-only" : cn(
          "min-w-0 flex-1 text-xl font-semibold break-words focus-visible:outline-none in-data-[alpha-launcher]:font-display in-data-[alpha-launcher]:font-light",
          detail ? "in-data-[alpha-launcher]:truncate in-data-[alpha-launcher]:text-home-display in-data-[alpha-launcher]:tracking-tight" : "in-data-[alpha-launcher]:text-3xl",
        )}
      >
        {title}
      </h1>
      {titleControl}
      {children}
    </header>
  );
}
