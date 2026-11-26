// spec/app/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
import { Alert } from "@repo/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { boot } from "./boot.tsx";
import { native } from "./platform/device.vibe";
import { browserPlatform, phonePlatform } from "./platform/platform.vibe";
import { single } from "./runtime/single.ts";
import "./main.css";

const root = createRoot(document.getElementById("root")!);
const mark = "#delegation-return";

if (location.hash === mark || location.hash.startsWith(`${mark}?`)) {
  const [{ Effect }, { land }, { LandingPage }] = await Promise.all([import("effect"), import("./shell/landing.vibe"), import("./shell/Landing.tsx")]);
  const { landing, href } = Effect.runSync(land(location.hash.slice(mark.length), () => history.replaceState(null, "", `${location.pathname}${mark}`)));
  root.render(<StrictMode><LandingPage message={landing.message} href={href} /></StrictMode>);
} else if (await single()) root.render(<StrictMode><App alpha={boot(native() ? phonePlatform() : browserPlatform(location.origin), undefined, native())} /></StrictMode>);
else root.render(
  <StrictMode>
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 pt-[max(--spacing(6),var(--alpha-safe-top))] pb-[max(--spacing(6),var(--alpha-safe-bottom))] text-foreground">
      <Alert variant="warn" className="max-w-sm">Alpha is open in another window</Alert>
    </main>
  </StrictMode>,
);
