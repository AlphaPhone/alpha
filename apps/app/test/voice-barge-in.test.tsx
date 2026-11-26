// @vitest-environment happy-dom
// spec/app/voice/index.md, "The owner speaking over Alpha interrupts it and starts the next turn, but Alpha's own voice never does"
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import * as Voice from "../gen/app__voice.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { closeAll, open, press, underAct, until } from "./alpha.tsx";
import { scene, type Scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const talkMounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

/** The phone's recognizer hearing the owner say `text`, on the capture that is open. */
function say(world: Scene, text: string) {
  world.voice.emitLocal?.("liveCaptureTranscript", { captureId: world.voice.activeMicSession, final: { turnId: "test-turn", text, mode: "device" } });
}

describe("Talk on the phone's own recognizer (spec/app/voice/index.md, \"Story: Hold a spoken conversation\")", () => {
  it("hushes Alpha when the owner speaks over its reply, and takes what they said as the next turn, as v119's on-device open mic did", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await until(alpha, area, Conversation, (s) => s.ready && s.observing);
    await until(alpha, area, Voice.Machine, (s) => s.warmed);
    await press("Talk");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && !s.network);
    expect(world.voice.liveCaptureBargeIn).toEqual([true]);

    world.ask.acknowledgment = "Let me think of one.";
    world.ask.holdAfterTools = true;
    world.ask.nextReplyChunks = ["Once there was a lighthouse."];
    say(world, "Tell me a story");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Speaking" && s.mic === "On" && s.queued > 0);
    const hushed = world.voice.hushCalls;

    // spec/app/voice/index.md, "The owner speaking over Alpha interrupts it and starts the next turn, but Alpha's own voice never does": the recognizer hears the owner over Alpha (45f6bed30 prototype/voice-adapter.ts:885-889), and Alpha stops speaking at once.
    world.voice.emitLocal?.("liveCaptureBargeIn", { captureId: world.voice.activeMicSession });
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.heard);
    expect(world.voice.hushCalls).toBeGreaterThan(hushed);

    world.ask.holdAfterTools = false;
    world.ask.acknowledgment = undefined;
    for (const release of [...world.ask.turns.values()]) release();
    world.ask.nextReplyChunks = ["It is noon."];
    say(world, "What time is it");
    await until(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.sent === 2);
    expect(world.ask.said).toEqual(["Tell me a story", "What time is it"]);
  });
});
