// @vitest-environment happy-dom
import { AppHeader, Toast } from "@repo/ui";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { Assistant } from "../src/assistant/Assistant.tsx";
import { assisting } from "../src/assistant/assistant.vibe";
import { agentAt } from "../src/platform/agent.vibe";
import { cloudAt } from "../src/platform/cloud.vibe";
import { pagePlatform } from "../src/platform/platform.vibe";
import { together, whole } from "../src/runtime/reactor.vibe";
import { canvas } from "../src/shell/canvas.vibe";
import { haptics } from "../src/shell/haptics.vibe";
import { shell } from "../src/shell/shell.vibe";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const closers: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  localStorage.clear();
});

function stubPlatform() {
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
  return pagePlatform(Layer.provide(agentAt("http://agent.test"), client), Layer.provide(cloudAt("http://cloud.test"), client));
}

async function mountDock(view: "Browser" | "Home" = "Browser") {
  const assistantRuntime = ManagedRuntime.make(Layer.provideMerge(whole(together(shell, canvas, haptics, assisting)), stubPlatform()));
  const host = document.body.appendChild(document.createElement("div"));
  const reactRoot = createRoot(host);
  await act(async () => {
    reactRoot.render(
      <div>
        <AppHeader title={view} />
        <Toast>Saved</Toast>
        <Assistant runtime={assistantRuntime} />
      </div>,
    );
    await assistantRuntime.runPromise(Effect.void);
  });
  closers.push(async () => {
    act(() => { reactRoot.unmount(); });
    host.remove();
    await assistantRuntime.dispose();
  });
  if (view === "Browser") {
    await act(async () => {
      await assistantRuntime.runPromise(Shell.use((m) => m.send({ type: "openView", view: "Browser" })));
    });
  }
  await act(async () => {
    await assistantRuntime.runPromise(Composer.use((m) => Stream.runHead(Stream.filter(m.changes, (s) => s.slot === "Open"))));
  });
  return { assistantRuntime, host };
}

describe("Ask Alpha dock and shell navigation", () => {
  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"
  it("focusing the composer on the Browser bar opens half-open Sheet without reparenting and marks host chrome (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { assistantRuntime } = await mountDock("Browser");
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(document.querySelectorAll("[data-host-chrome]").length).toBeGreaterThanOrEqual(3);
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea?.focus();
      await assistantRuntime.runPromise(Shell.use((m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    await act(async () => {
      await assistantRuntime.runPromise(Canvas.use((m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));
    });

    expect(document.querySelector("textarea[data-alpha-composer]")).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("sheet");
  });

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "Ask Alpha put away forgets the height its sheet was left at"
  it("tapping Open conversation focuses the composer and Back lowers Sheet to Bar clearing kept height (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { assistantRuntime } = await mountDock("Home");
    const openBtn = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(openBtn).not.toBeNull();

    await act(async () => {
      openBtn?.click();
      await assistantRuntime.runPromise(Shell.use((m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    await act(async () => {
      await assistantRuntime.runPromise(Dock.use((m) => m.send({ type: "press", detent: "Sheet", now: 100 })));
      await assistantRuntime.runPromise(Dock.use((m) => m.send({ type: "drag" })));
      await assistantRuntime.runPromise(Dock.use((m) => m.send({ type: "release", direction: "Up", flick: false, height: 420, floor: 80, full: 800, now: 200 })));
    });
    expect((await assistantRuntime.runPromise(Dock.use((m) => m.get()))).kept).toBe(420);

    await act(async () => {
      await assistantRuntime.runPromise(Shell.use((m) => m.send({ type: "goBack" })));
      await assistantRuntime.runPromise(Dock.use((m) => Stream.runHead(Stream.filter(m.changes, (s) => s.kept === 0))));
    });
    expect((await assistantRuntime.runPromise(Shell.use((m) => m.get()))).assistant).toBe("Bar");
  });

  // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("agent navigation moves between admitted apps and Home while keeping Ask Alpha raised (spec/app/shell/index.md, \"Agent navigation shows an admitted app or Home without lowering Ask Alpha\")", async () => {
    const { assistantRuntime } = await mountDock("Home");
    await act(async () => {
      await assistantRuntime.runPromise(Shell.use((m) => m.send({ type: "raise", detent: "Sheet" })));
      await assistantRuntime.runPromise(Shell.use((m) => m.send({ type: "agentOpenView", view: "Browser" })));
    });
    expect(await assistantRuntime.runPromise(Shell.use((m) => m.get()))).toMatchObject({ trail: ["Browser"], assistant: "Sheet", drawer: false });

    await act(async () => {
      await assistantRuntime.runPromise(Shell.use((m) => m.send({ type: "agentGoHome" })));
    });
    expect(await assistantRuntime.runPromise(Shell.use((m) => m.get()))).toMatchObject({ trail: [], assistant: "Sheet", drawer: false });
  });
});
