// @vitest-environment happy-dom
// spec/app/assistant/context.md, "A turn reports the assistant overlay height from the shell detent and dock state, only when the screen is not sensitive and the peer takes optional fields"
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import * as Prefs from "../gen/app__settings__preferences.effect.vibe";
import { Machine as Shell, type View } from "../gen/app__shell.effect.vibe";
import * as Voice from "../gen/app__voice.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { Talk } from "../src/assistant/talk.vibe";
import { MessagingBridge } from "../src/messaging/bridge.vibe";
import { closeAll, drawn, fill, open, press, underAct, until } from "./alpha.tsx";
import { scene, type Scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const mounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

type ObservedMeta = {
  readonly observation?: {
    readonly view?: string;
    readonly sensitive?: boolean;
    readonly chatHeight?: string;
  };
};

function metaAt(world: Scene, index: number): ObservedMeta | undefined {
  return world.ask.metadata?.[index] as ObservedMeta | undefined;
}

function speakUtterance(world: Scene, text: string, turnId: string): void {
  world.voice.emitLocal?.("liveCaptureTranscript", {
    captureId: world.voice.activeMicSession,
    final: { turnId, text, mode: "device" },
  });
}

async function speakAndWait(
  alpha: Awaited<ReturnType<typeof open>>["alpha"],
  area: ReturnType<typeof assistant.runtime>,
  world: Scene,
  text: string,
  turnId: string,
) {
  const before = (await area.runPromise(Effect.flatMap(Voice.Machine, (m) => m.get()))).sent;
  speakUtterance(world, text, turnId);
  await until(alpha, area, Voice.Machine, (s) => s.sent > before && s.phase === "Listening" && s.mic === "On");
}

async function sendFromCurrentHeight(
  alpha: Awaited<ReturnType<typeof open>>["alpha"],
  area: ReturnType<typeof assistant.runtime>,
  text: string,
  expectedTurn: number,
) {
  await until(alpha, area, Composer, (s) => s.slot === "Open" && s.away === "Free" && s.draft.sync !== "Saving");
  await until(alpha, area, Conversation, (s) => s.ready && s.observing && s.turn.reply !== "Streaming");
  await drawn(() => area.runPromise(Effect.flatMap(Talk, ({ board }) => Effect.sync(() => {
    board.hold(text);
    board.type("");
  }))));
  await drawn(() => area.runPromise(Effect.flatMap(Composer, (m) => m.send({ type: "edit", blank: false, long: false }))));
  await until(alpha, area, Composer, (s) => s.away === "Free" && s.editor.text && s.draft.sync !== "Saving");
  await drawn(() => area.runPromise(Effect.flatMap(Composer, (m) => m.send({ type: "hold", askable: true }))));
  await until(alpha, area, Conversation, (s) => s.turn.send.id === expectedTurn && s.turn.reply === "Complete");
  await until(alpha, area, Composer, (s) => s.away === "Free" && s.draft.sync !== "Saving");
}

async function setShell(
  alpha: Awaited<ReturnType<typeof open>>["alpha"],
  view: View | undefined,
  detent: "Bar" | "Typing" | "Sheet" | "Full",
) {
  await drawn(() => alpha.runtime.runPromise(Effect.ignore(Effect.flatMap(Shell, (m) => m.send({ type: "goHome" })))));
  await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0 && s.assistant === "Bar");
  if (view !== undefined) {
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "openView", view }))));
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === view && s.assistant === "Bar");
  }
  if (detent !== "Bar") {
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "raise", detent }))));
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === detent);
  }
}

async function tuckBar(
  alpha: Awaited<ReturnType<typeof open>>["alpha"],
  area: ReturnType<typeof assistant.runtime>,
) {
  await drawn(() => area.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "press", detent: "Bar", now: 100 }))));
  await drawn(() => area.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "drag" }))));
  await drawn(() => area.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "release", direction: "Down", flick: false, height: 100, floor: 80, full: 800, now: 200 }))));
  await until(alpha, area, Dock, (s) => s.tucked);
}

describe("observation.chatHeight", () => {
  // spec/app/assistant/context.md, "A turn reports the assistant overlay height from the shell detent and dock state, only when the screen is not sensitive and the peer takes optional fields"
  it("reports bar, typing, sheet, full, and hidden across typed turns", async () => {
    const world = { ...scene(), phone: true };
    world.ask.metadata = [];
    const { alpha } = await open(world, mounts);
    const area = assistant.runtime(alpha);
    await until(alpha, area, Conversation, (s) => s.ready && s.observing);
    await until(alpha, area, Composer, (s) => s.slot === "Open");

    await fill("Message Alpha", "Open the sheet from Home");
    await press("Send");
    await until(alpha, area, Conversation, (s) => s.turn.send.id === 1 && s.turn.reply === "Complete");
    await until(alpha, area, Chats, (s) => s.chosen > 0);
    expect(metaAt(world, 0)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "sheet" });

    await setShell(alpha, undefined, "Bar");
    await until(alpha, area, Dock, (s) => !s.tucked);
    await sendFromCurrentHeight(alpha, area, "From resting Home bar", 2);
    expect(metaAt(world, 1)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "bar" });

    await setShell(alpha, undefined, "Typing");
    await sendFromCurrentHeight(alpha, area, "While typing on Home", 3);
    expect(metaAt(world, 2)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "typing" });

    await setShell(alpha, undefined, "Full");
    await sendFromCurrentHeight(alpha, area, "From full screen chat", 4);
    expect(metaAt(world, 3)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "full" });

    await setShell(alpha, undefined, "Bar");
    await tuckBar(alpha, area);
    await sendFromCurrentHeight(alpha, area, "From tucked Home pill", 5);
    expect(metaAt(world, 4)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "hidden" });

    await setShell(alpha, "Notes", "Bar");
    await until(alpha, area, Conversation, (s) => s.context.showing.tag === "App" && s.context.showing.view === "Notes");
    await sendFromCurrentHeight(alpha, area, "From Notes pill", 6);
    expect(metaAt(world, 5)?.observation).toMatchObject({ view: "notes", sensitive: false, chatHeight: "hidden" });

    await setShell(alpha, "Browser", "Bar");
    await until(alpha, area, Conversation, (s) => s.context.showing.tag === "App" && s.context.showing.view === "Browser");
    await until(alpha, area, Dock, (s) => !s.tucked);
    await sendFromCurrentHeight(alpha, area, "From Browser resting bar", 7);
    expect(metaAt(world, 6)?.observation).toMatchObject({ view: "browser", sensitive: false, chatHeight: "bar" });

    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "admit", image: true, contacts: true }))));
    await setShell(alpha, "Phone", "Bar");
    await until(alpha, area, Conversation, (s) => s.context.showing.tag === "App" && s.context.showing.view === "Phone");
    await sendFromCurrentHeight(alpha, area, "From Phone bar app", 8);
    expect(metaAt(world, 7)?.observation).toMatchObject({ view: "phone", sensitive: false, chatHeight: "hidden" });
  });

  // spec/app/assistant/context.md, "A turn reports the assistant overlay height from the shell detent and dock state, only when the screen is not sensitive and the peer takes optional fields"; spec/app/assistant/context.md, "A spoken turn carries what a typed turn sent at that moment would, the view claim included"
  it("reports the live overlay height on spoken turns across bar, tucked hidden, notes hidden, typing, sheet, and full", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.ask.metadata = [];
    const { alpha } = await open(world, mounts);
    const area = assistant.runtime(alpha);
    await until(alpha, area, Conversation, (s) => s.ready && s.observing);
    await until(alpha, area, Composer, (s) => s.slot === "Open");
    await until(alpha, area, Voice.Machine, (s) => s.warmed);

    await press("Talk");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");

    await speakAndWait(alpha, area, world, "Spoken at resting bar", "turn-1");
    expect(metaAt(world, 0)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "bar" });

    await setShell(alpha, undefined, "Typing");
    await speakAndWait(alpha, area, world, "Spoken while typing", "turn-2");
    expect(metaAt(world, 1)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "typing" });

    await setShell(alpha, undefined, "Sheet");
    await speakAndWait(alpha, area, world, "Spoken over sheet", "turn-3");
    expect(metaAt(world, 2)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "sheet" });

    await setShell(alpha, undefined, "Full");
    await speakAndWait(alpha, area, world, "Spoken in full chat", "turn-4");
    expect(metaAt(world, 3)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "full" });

    await setShell(alpha, "Notes", "Bar");
    await until(alpha, area, Conversation, (s) => s.context.showing.tag === "App" && s.context.showing.view === "Notes");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Idle");
    await press("Talk");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");
    await speakAndWait(alpha, area, world, "Spoken from Notes pill", "turn-5");
    expect(metaAt(world, 4)?.observation).toMatchObject({ view: "notes", sensitive: false, chatHeight: "hidden" });

    await setShell(alpha, undefined, "Bar");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Idle");
    await until(alpha, area, Dock, (s) => !s.voice);
    await tuckBar(alpha, area);
    await press("Talk");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");
    await speakAndWait(alpha, area, world, "Spoken from tucked Home pill", "turn-6");
    expect(metaAt(world, 5)?.observation).toMatchObject({ view: "home", sensitive: false, chatHeight: "hidden" });
  });

  // spec/app/assistant/context.md, "A turn reports the assistant overlay height from the shell detent and dock state, only when the screen is not sensitive and the peer takes optional fields"
  it("omits chatHeight on sensitive screens and omits observation for unsupported peers", async () => {
    const sensitiveWorld = scene();
    sensitiveWorld.ask.metadata = [];
    const { alpha: sensitiveAlpha } = await open(sensitiveWorld, mounts);
    const sensitiveArea = assistant.runtime(sensitiveAlpha);
    const bridge = sensitiveAlpha.runtime.runSync(MessagingBridge);
    await until(sensitiveAlpha, sensitiveArea, Conversation, (s) => s.ready && s.observing);
    await until(sensitiveAlpha, sensitiveArea, Composer, (s) => s.slot === "Open");
    await until(sensitiveAlpha, sensitiveAlpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");
    await setShell(sensitiveAlpha, "Telegram", "Full");
    await drawn(() => {
      bridge.publishContext("Telegram", {
        platform: "telegram",
        authenticated: true,
        sensitive: false,
        pane: "conversation",
        accountLabel: "@owner",
        conversation: { id: "chat-1", title: "Alex", kind: "direct", muted: false, unreadCount: 1 },
        recentMessages: [{ id: "m1", sender: "Alex", at: 1000, text: "See you at 5", isOwn: false }],
      });
    });
    await until(sensitiveAlpha, sensitiveArea, Conversation, (s) => s.context.showing.tag === "App" && s.context.showing.view === "Telegram" && !s.context.sensitive && s.context.selected);
    await drawn(() => sensitiveAlpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (m) => m.send({ type: "setShare", share: "TelegramContext", on: false, at: 0 }, "Owner"))));
    await until(sensitiveAlpha, sensitiveAlpha.runtime, Prefs.Machine, (s) => !Prefs.allows(s, "TelegramContext"));
    await fill("Message Alpha", "Hello from private Telegram");
    await press("Send");
    await until(sensitiveAlpha, sensitiveArea, Conversation, (s) => s.turn.send.id === 1 && s.turn.reply === "Complete");
    await until(sensitiveAlpha, sensitiveArea, Composer, (s) => s.away === "Free" && s.draft.sync !== "Saving");
    const sensitiveObs = metaAt(sensitiveWorld, 0)?.observation;
    expect(sensitiveObs).toMatchObject({ view: "telegram", sensitive: true });
    expect(sensitiveObs?.chatHeight).toBeUndefined();

    await drawn(() => sensitiveAlpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (m) => m.send({ type: "setShare", share: "TelegramContext", on: true, at: 1 }, "Owner"))));
    await until(sensitiveAlpha, sensitiveAlpha.runtime, Prefs.Machine, (s) => Prefs.allows(s, "TelegramContext"));
    await fill("Message Alpha", "Hello from shared Telegram");
    await press("Send");
    await until(sensitiveAlpha, sensitiveArea, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    expect(metaAt(sensitiveWorld, 1)?.observation).toMatchObject({ view: "telegram", sensitive: false, chatHeight: "full" });
    await closeAll();

    const unsupportedWorld = scene();
    unsupportedWorld.ask.metadata = [];
    unsupportedWorld.ask.noOptionalFields = true;
    const { alpha: unsupportedAlpha } = await open(unsupportedWorld, mounts);
    const unsupportedArea = assistant.runtime(unsupportedAlpha);
    await until(unsupportedAlpha, unsupportedArea, Conversation, (s) => s.ready && s.support.status === "Loaded" && !s.observing);
    await until(unsupportedAlpha, unsupportedArea, Composer, (s) => s.slot === "Open");
    await setShell(unsupportedAlpha, undefined, "Full");
    await fill("Message Alpha", "Hello older peer");
    await press("Send");
    await until(unsupportedAlpha, unsupportedArea, Conversation, (s) => s.turn.send.id === 1 && s.turn.reply === "Complete");
    expect(metaAt(unsupportedWorld, 0)?.observation).toBeUndefined();
  });
});
