import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Button } from "../Button.tsx";

export type BrowserAddressBarProps = {
  /** The control that leaves the Browser, shown first. */
  leading?: ReactNode;
  /** What is typed. */
  value: string;
  /** Told each change of what is typed. */
  onValueChange: (value: string) => void;
  /** Opens or searches what is typed. */
  onSubmit: () => void;
  /** Stops editing and uncovers the page. */
  onCancel?: () => void;
};

/** The Browser's bar while its address is typed: the field, focused with what it held selected, and a way to stop. */
export function BrowserAddressBar({ leading, value, onValueChange, onSubmit, onCancel }: BrowserAddressBarProps) {
  return (
    <header data-host-chrome="" className="relative z-10 flex h-13 shrink-0 items-center bg-background pr-2 in-data-[alpha-launcher]:mt-11 in-data-[alpha-launcher]:h-14 in-data-[alpha-launcher]:gap-0.5 in-data-[alpha-launcher]:px-1.5">
      <div className="flex shrink-0 in-data-[alpha-launcher]:hidden [&>button]:size-13 [&>button]:rounded-lg">{leading}</div>
      <form role="search" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
        className="ml-1.5 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-secondary pr-1.5 pl-3.5 ring-[1.5px] ring-primary ring-inset">
        <Search aria-hidden className="size-4 text-muted-foreground" />
        <input
          ref={(input) => { if (input && input.dataset.focused === undefined) { input.dataset.focused = ""; input.focus({ preventScroll: true }); input.select(); } }}
          aria-label="Address" placeholder="Search or type address" inputMode="url" enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off"
          value={value} onChange={(event) => onValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onCancel?.(); }}
          className="h-10.5 min-w-0 flex-1 border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button variant="ghost" size="icon" aria-label="Clear address" onClick={() => onValueChange("")}><X className="size-4.5" /></Button>
      </form>
      <Button variant="ghost" size="icon" aria-label="Cancel editing" className="h-13 w-11" onClick={onCancel} disabled={onCancel === undefined}><X className="size-5" /></Button>
    </header>
  );
}
