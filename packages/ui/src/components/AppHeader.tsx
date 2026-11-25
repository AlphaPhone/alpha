import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export type AppHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The screen's one title; under large text it wraps rather than being cut. */
  title: string;
  /** The control that leaves the screen, usually a back `Button`; shown before the title. */
  leading?: ReactNode;
  /** An inline control that takes the place of the visible title, such as a search field. */
  titleControl?: ReactNode;
  /**
   * A screen inside an app, such as a folder, an album, a selection or Recently deleted. On the launcher its title is
   * the smaller display size, on one line and cut with an ellipsis, until large text gives it a row of its own.
   */
  detail?: boolean;
  /** The screen's own actions, at the end. */
  children?: ReactNode;
};

/**
 * The top of a screen: where the owner is, the way back and what can be done here. Its icon buttons are 52px. On the
 * launcher (`data-alpha-launcher`, the phone's Home) the title is the serif display title, as Alpha's earlier build drew
 * it on the phone: `3xl` on an app's first page and `home-display` on a screen inside it. Above 150% text
 * (`data-alpha-title-row`) the title, on the launcher or not, takes a row of its own under the buttons and wraps there,
 * never cut; on the launcher a first page's title is drawn no larger than lets a 4.4em word fit that row, so one word is
 * never split. Android's text zoom multiplies that size, so
 * the room is divided by the measured scale (`--alpha-text-scale`) and multiplied back by Alpha's own text size
 * (`--alpha-own-text-scale`), which root-relative sizes already carry.
 */
export function AppHeader({ title, leading, titleControl, detail = false, className, children, ...props }: AppHeaderProps) {
  return (
    <header data-host-chrome="" className={cn(
      "flex min-h-13 items-center gap-0.5 px-2 [&_button[aria-label]]:size-13 [&_button[aria-label]]:min-w-13",
      !titleControl && "in-data-[alpha-title-row]:flex-wrap in-data-[alpha-title-row]:content-start in-data-[alpha-title-row]:gap-y-1 in-data-[alpha-title-row]:[&>h1+*]:ms-auto",
      !titleControl && !detail && "in-data-[alpha-title-row]:in-data-[alpha-launcher]:@container",
      className,
    )} {...props}>
      {leading}
      <h1 className={titleControl ? "sr-only" : cn(
        "min-w-0 flex-1 text-xl font-semibold break-words focus-visible:outline-none in-data-[alpha-launcher]:font-display in-data-[alpha-launcher]:font-light",
        "in-data-[alpha-title-row]:order-1 in-data-[alpha-title-row]:basis-full in-data-[alpha-title-row]:wrap-anywhere",
        detail
          ? "in-data-[alpha-launcher]:truncate in-data-[alpha-launcher]:text-home-display in-data-[alpha-launcher]:tracking-tight in-data-[alpha-title-row]:overflow-visible in-data-[alpha-title-row]:whitespace-normal"
          : "in-data-[alpha-launcher]:text-3xl in-data-[alpha-title-row]:in-data-[alpha-launcher]:[font-size:min(var(--text-3xl),calc((100cqi_-_30px)/4.4*var(--alpha-own-text-scale,1)/var(--alpha-text-scale,1)))]",
      )}>{title}</h1>
      {titleControl}
      {children}
    </header>
  );
}
