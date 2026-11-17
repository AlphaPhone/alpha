// spec/app/shell/index.md, "Story: Move between Home and the apps"
import { Alert, AppHeader, Button } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ChevronLeft } from "lucide-react";
import type { Machine } from "../gen/app__shell.effect.vibe";
import { useMachine } from "../gen/app__shell.react.ts";
import { Home } from "./shell/Home.tsx";
import { views } from "./shell/views.tsx";

export interface AppProps {
  /** Provides the shell: `shell` of shell/shell.vibe over a store. */
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

/**
 * Alpha: Home, or the app on top of the trail under its title, with Back offered exactly when the rules allow it.
 * @model spec/app/shell/index.md
 */
export function App({ runtime }: AppProps) {
  const { state, cause, can, send } = useMachine(runtime);
  if (cause) return <Alert variant="destructive" className="m-6">Alpha could not read where you were</Alert>;
  if (!state) return null;
  const showing = state.trail.at(-1);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background font-sans text-base text-foreground">
      {showing === undefined
        ? <Home offered={(view) => can({ type: "openView", view })} onOpen={(view) => void send({ type: "openView", view })} />
        : (
          <AppHeader
            title={views[showing].label}
            leading={can({ type: "goBack" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "goBack" })}><ChevronLeft /></Button>}
          />
        )}
    </main>
  );
}
