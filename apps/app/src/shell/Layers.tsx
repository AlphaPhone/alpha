// spec/app/shell/index.md, "Story: Move between Home and the apps"
import { cn } from "@repo/ui";
import type { ComponentProps } from "react";

/**
 * An app's page with the pages opened over it, stacked as Alpha's earlier build stacked them (v119 45f6bed30
 * prototype/template.html:2573, 4156: each page `position:absolute;inset:0;display:flex;flex-direction:column`), so
 * the page underneath stays mounted and keeps its own scroll while another is open over it.
 */
export function Layers({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("relative flex min-h-0 flex-1 flex-col", className)} {...props} />;
}

/**
 * The page underneath: its own scroller, kept where the owner left it, inert and hidden from assistive technology while
 * a page covers it (v119 template.html:2573 `inert="{{notes.detailCovered}}" aria-hidden="{{notes.detailCovered}}"`).
 */
export function Under({ covered, className, ...props }: ComponentProps<"div"> & { covered: boolean }) {
  return <div inert={covered} aria-hidden={covered || undefined} className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain", className)} {...props} />;
}

/**
 * A page opened over another, on a background of its own, gone at once when it closes. It rises as v119's `.enter`
 * (prototype.css:29 `animation:rise .46s cubic-bezier(.19,1,.22,1) both`, the design system's `animate-rise`).
 */
export function Over({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("absolute inset-0 z-10 flex flex-col overflow-y-auto overscroll-contain bg-background motion-safe:animate-rise", className)} {...props} />;
}

/** A photo's layer fades in over its grid (v119 prototype.css:30 `.fadein{animation:fade .7s cubic-bezier(.19,1,.22,1) both}`; template.html:2103). */
export const fadeIn = "motion-safe:animate-[fade_700ms_cubic-bezier(0.19,1,0.22,1)_both]";
