import { AppHeader, Toast } from "@repo/ui";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { createRoot } from "react-dom/client";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Assistant } from "../src/assistant/Assistant.tsx";
import { assisting } from "../src/assistant/assistant.vibe";
import { agentAt } from "../src/platform/agent.vibe";
import { cloudAt } from "../src/platform/cloud.vibe";
import { pagePlatform } from "../src/platform/platform.vibe";
import { resident } from "../src/resident.vibe";
import { whole } from "../src/runtime/reactor.vibe";

const closers: (() => Promise<void>)[] = [];

export async function closeAllDocks() {
  for (const close of closers.splice(0)) await close();
  localStorage.clear();
}

export async function mountDock({ view = "Browser", withToast = false, flush }: { view?: "Browser" | "Home"; withToast?: boolean; flush?: (work: () => Promise<void> | void) => Promise<void> } = {}) {
  const run = flush ?? (async (work: () => Promise<void> | void) => { await work(); });
  const client = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => {
      const body = url.pathname === "/api/health"
        ? { ready: true }
        : url.pathname === "/api/status"
          ? { version: "1", optionalFields: true }
          : url.pathname === "/api/conversations"
            ? { conversations: [] }
            : {};
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })));
    }),
  );
  const platform = pagePlatform(Layer.provide(agentAt("http://agent.test"), client), Layer.provide(cloudAt("http://cloud.test"), client));
  const runtime = ManagedRuntime.make(Layer.provideMerge(Layer.provideMerge(whole(assisting), resident), platform));
  const host = document.body.appendChild(document.createElement("div"));
  const reactRoot = createRoot(host);
  await run(async () => {
    reactRoot.render(
      <div className="relative flex min-h-dvh w-full flex-col bg-background text-foreground">
        <AppHeader title={view} />
        {withToast ? <Toast>Saved</Toast> : <div className="flex-1 p-4 text-sm text-muted-foreground">Web page content</div>}
        <Assistant runtime={runtime} />
      </div>,
    );
    await runtime.runPromise(Effect.void);
  });
  closers.push(async () => {
    await run(() => { reactRoot.unmount(); });
    host.remove();
    await runtime.dispose();
  });
  await run(async () => {
    if (view === "Browser") await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "openView", view: "Browser" })));
    await runtime.runPromise(Effect.flatMap(Composer, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.slot === "Open"))));
  });
  return { runtime, host };
}
