import { AppHeader } from "@repo/ui";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
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
import "../src/main.css";

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
  reactRoot.render(
    <div className="relative flex min-h-dvh w-full flex-col bg-background text-foreground">
      <AppHeader title={view} />
      <div className="flex-1 p-4 text-sm text-muted-foreground">Web page content</div>
      <Assistant runtime={assistantRuntime} />
    </div>,
  );
  closers.push(async () => {
    reactRoot.unmount();
    host.remove();
    await assistantRuntime.dispose();
  });
  if (view === "Browser") await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "openView", view: "Browser" })));
  await assistantRuntime.runPromise(Effect.flatMap(Composer, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.slot === "Open"))));
  return { assistantRuntime, host };
}

describe("Ask Alpha dock", () => {
  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("Browser input tap opens Sheet with focus (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    await page.viewport(390, 844);
    const { assistantRuntime } = await mountDock("Browser");

    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const beforeTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(section?.hasAttribute("data-host-chrome")).toBe(true);
    expect(document.querySelector("header[data-host-chrome]")).not.toBeNull();
    expect(beforeTextarea).not.toBeNull();

    let touchDefaultPrevented = true;
    let pointerDefaultPrevented = true;
    const onTouchStart = (event: Event) => { touchDefaultPrevented = event.defaultPrevented; };
    const onPointerDown = (event: Event) => { pointerDefaultPrevented = event.defaultPrevented; };
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("pointerdown", onPointerDown);
    try {
      beforeTextarea?.dispatchEvent(new Event("touchstart", { bubbles: true, cancelable: true }));
      beforeTextarea?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "touch", pointerId: 1 }));
    } finally {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("pointerdown", onPointerDown);
    }
    expect([touchDefaultPrevented, pointerDefaultPrevented]).toEqual([false, false]);

    const textarea = page.getByRole("textbox", { name: "Message Alpha" });
    await expect.element(textarea).toBeVisible();
    await textarea.click();

    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    await assistantRuntime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));

    const afterTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(afterTextarea).toBe(beforeTextarea);
    expect(document.activeElement).toBe(beforeTextarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("sheet");

    // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Calendar" })));
    const afterAgentNav = await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentNav.trail.at(-1), afterAgentNav.assistant]).toEqual(["Calendar", "Sheet"]);

    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    const afterAgentHome = await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentHome.trail, afterAgentHome.assistant]).toEqual([[], "Sheet"]);
  });

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "A press that did not move taps its control once"
  it("Open control and grabber tap focus Sheet (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    await page.viewport(390, 844);
    const { assistantRuntime } = await mountDock("Browser");

    await page.getByRole("button", { name: "Open conversation" }).click();
    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    (document.activeElement as HTMLElement | null)?.blur();

    const grabber = document.querySelector<HTMLButtonElement>("button[aria-label='Resize chat']");
    expect(grabber).not.toBeNull();
    grabber?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch" }));
    grabber?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch" }));
    await assistantRuntime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));
  });
});
