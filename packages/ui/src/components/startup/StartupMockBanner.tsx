import { Button } from "../Button.tsx";

export type StartupMockBannerProps = {
  /** Leaves mock mode; offered only while mock mode is on. */
  onExit?: () => void;
};

/**
 * Says that what is on screen is simulated, on every surface, with the way out of it.
 * @model spec/app/startup/index.md
 */
export function StartupMockBanner({ onExit }: StartupMockBannerProps) {
  return (
    <div role="status" className="flex min-h-8.5 shrink-0 items-center justify-between gap-2 bg-alpha px-2.5 text-xs font-semibold text-alpha-foreground">
      <span>Mock mode · simulated data and actions</span>
      {onExit ? <Button variant="ghost" size="sm" className="h-6 border border-alpha-foreground px-2.5 text-xs text-alpha-foreground hover:bg-alpha-foreground/10 active:bg-alpha-foreground/20" onClick={onExit}>Exit mock mode</Button> : null}
    </div>
  );
}
