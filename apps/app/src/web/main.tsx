// spec/shell/index.md, "Story: Open an app from Home and keep my place"; spec/shell/recovery.md, "Story: Get my phone back when something breaks"; spec/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
import { Effect } from "effect";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { land } from "../shell/landing.vibe";
import { pageQuery, scrubAddress } from "../shell/page.ts";
import { Recovery } from "../shell/recovery.vibe";
import { act } from "./shell/services.ts";
import { CallbackLanding } from "./shell/CallbackLanding.tsx";
import { ShellBoundary } from "./shell/ErrorBoundary.tsx";
import { RecoveryScreen } from "./shell/RecoveryScreen.tsx";
import { ShellRoot } from "./shell/ShellRoot.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

if (location.pathname.endsWith("/delegation-return") || location.pathname.endsWith("/delegation-return.html")) {
  const { landing, href } = Effect.runSync(land(pageQuery(), scrubAddress));
  root.render(<StrictMode><CallbackLanding message={landing.message} href={href} /></StrictMode>);
} else {
  act(Effect.void);
  const reload = () => act(Effect.flatMap(Effect.service(Recovery), (recovery) => recovery.reload()));
  const switchHome = () => act(Effect.flatMap(Effect.service(Recovery), (recovery) => recovery.switchHome()));
  root.render(
    <StrictMode>
      <ShellBoundary fallback={<RecoveryScreen diagnostics="failure: render" onReload={reload} onSwitchHome={switchHome} />}>
        <ShellRoot />
      </ShellBoundary>
    </StrictMode>,
  );
}
