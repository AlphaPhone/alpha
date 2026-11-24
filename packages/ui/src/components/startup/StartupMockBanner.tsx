import { Banner } from "../Banner.tsx";
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
    <Banner variant="warn" action={onExit ? <Button variant="outline" size="sm" onClick={onExit}>Exit mock mode</Button> : undefined}>
      Mock mode
    </Banner>
  );
}
