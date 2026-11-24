// spec/shell/index.md, "Story: Open an app from Home and keep my place"; spec/shell/recovery.md, "Story: Get my phone back when something breaks"; spec/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
import { Effect } from "effect";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { landingQuery, scrubLanding } from "../shell/page.ts";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
const returned = landingQuery();

if (returned !== undefined) {
  const [{ land }, { CallbackLanding }] = await Promise.all([import("../shell/landing.vibe"), import("./shell/CallbackLanding.tsx")]);
  const { landing, href } = Effect.runSync(land(returned, scrubLanding));
  root.render(<StrictMode><CallbackLanding message={landing.message} href={href} /></StrictMode>);
} else {
  const [{ Recovery }, { act, perform }, { ShellBoundary }, { RecoveryScreen }, { ShellRoot }] = await Promise.all([
    import("../shell/recovery.vibe"), import("./shell/services.ts"), import("./shell/ErrorBoundary.tsx"),
    import("./shell/RecoveryScreen.tsx"), import("./shell/ShellRoot.tsx"),
  ]);
  // Components read services synchronously (buildInfo, readNow), which needs the runtime's layers built; some build
  // asynchronously, so render once they are. A build that fails still renders, and the boundary shows recovery.
  await perform(Effect.void).catch(() => undefined);
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
