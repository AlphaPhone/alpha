// spec/app/shell/index.md, "Story: Move between Home and the apps"
import { Alert, AppHeader, Button } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import { useMachine } from "../gen/app__shell.react.ts";
import type { Alpha } from "./runtime/area.tsx";
import { views } from "./shell/views.tsx";

export interface AppProps {
  /** Alpha as boot.tsx opened it: the root runtime, and every screen at its place. */
  alpha: Alpha;
}

/**
 * Alpha: Home, or the app on top of the trail under its title, with Back offered exactly when the rules allow it, and
 * over them Ask Alpha, whatever covers the screen, and the notices. Each screen is its area's, drawn at its place.
 * @model spec/app/shell/index.md
 */
export function App({ alpha }: AppProps) {
  const { state, cause, can } = useMachine(alpha.runtime);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const showing = state.trail.at(-1);
  const back = can({ type: "goBack" });
  return (
    // The phone hands Back to the page only while the page says it can go back (platform/device.vibe).
    <main ref={(page) => { if (page) page.ownerDocument.documentElement.dataset.alphaCanGoBack = String(back); }} className="mx-auto flex min-h-dvh max-w-md flex-col bg-background font-sans text-base text-foreground">
      {showing === undefined
        ? alpha.slot("home")
        : (
          <>
            <AppHeader
              title={views[showing].label}
              leading={back && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void alpha.back()}><ChevronLeft /></Button>}
            />
            {alpha.slot(`view:${showing}`)}
          </>
        )}
      {alpha.slot("assistant")}
      {alpha.slot("overlay")}
      {alpha.slot("notice")}
    </main>
  );
}
