// @vitest-environment happy-dom
// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"; spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"; spec/app/voice/index.md, "Story: Go where the conversation takes me"; spec/app/voice/index.md, "A spoken reply says a written date, clock time, range and percentage in words"; spec/app/voice/index.md, "A turn Cloud refuses because the account is out of funds ends voice quietly, as Stop does"
import { type Context, Effect, Layer, ManagedRuntime, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import * as Shell from "../gen/app__shell.effect.vibe";
import * as Voice from "../gen/app__voice.effect.vibe";
import { VoiceBridge } from "../src/platform/voice.vibe";
import { together, untimed, whole } from "../src/runtime/reactor.vibe";
import { shell } from "../src/shell/shell.vibe";
import { placeOf, type VoiceWords, voicing } from "../src/voice/voice.vibe";
import { scene, type Scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

type VoiceRuntime = ManagedRuntime.ManagedRuntime<
  Voice.Machine | VoiceWords | VoiceBridge | Shell.Machine,
  unknown
>;

const opened: VoiceRuntime[] = [];

function bootVoice(world: Scene): VoiceRuntime {
  localStorage.clear();
  const appLayer = Layer.provideMerge(
    whole(together(shell, voicing)),
    fakeWorld(world),
  ) as unknown as Layer.Layer<Voice.Machine | VoiceWords | VoiceBridge | Shell.Machine>;
  const runtime = ManagedRuntime.make(appLayer);
  opened.push(runtime);
  return runtime;
}

async function until<I, S>(
  runtime: VoiceRuntime,
  key: Context.Key<I, { readonly changes: Stream.Stream<S> }>,
  ok: (state: S) => boolean,
): Promise<void> {
  await runtime.runPromise(
    Effect.flatMap(key as unknown as Context.Key<Voice.Machine, { readonly changes: Stream.Stream<S> }>, (machine) =>
      Stream.runHead(Stream.filter(machine.changes, ok))),
  );
}

async function untilCondition(runtime: VoiceRuntime, check: () => boolean, detail?: () => unknown): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    if (check()) return;
    await runtime.runPromise(Effect.yieldNow);
  }
  throw new Error(`Condition did not settle: ${JSON.stringify(detail?.())}`);
}

const getVoice = (runtime: VoiceRuntime) =>
  runtime.runPromise(Effect.flatMap(Voice.Machine, (m) => m.get()));

const sendVoice = (runtime: VoiceRuntime, event: Voice.Event) =>
  runtime.runPromise(Effect.flatMap(Voice.Machine, (m) => m.send(event)));

const getShell = (runtime: VoiceRuntime) =>
  runtime.runPromise(Effect.flatMap(Shell.Machine, (m) => m.get()));

const sendShell = (runtime: VoiceRuntime, event: Shell.Event) =>
  runtime.runPromise(Effect.flatMap(Shell.Machine, (m) => m.send(event)));

async function startListening(world: Scene): Promise<VoiceRuntime> {
  const runtime = bootVoice(world);
  await until(runtime, Voice.Machine, (s) => s.warmed);
  await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
  await sendVoice(runtime, { type: "startTalking", now: untimed });
  await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");
  return runtime;
}

async function speakUtterance(runtime: VoiceRuntime, world: Scene, text: string): Promise<void> {
  world.voice.emitLocal?.("liveCaptureTranscript", { text, final: false });
  await until(runtime, Voice.Machine, (s) => s.heard);
  world.voice.emitLocal?.("liveCaptureTranscript", { text, final: true });
}

afterEach(async () => {
  while (opened.length > 0) {
    const rt = opened.pop();
    if (rt !== undefined) await rt.dispose();
  }
  localStorage.clear();
});

describe("Voice Bug 1 & Bug 3 journeys", () => {
  // spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"; spec/app/voice/index.md, "Starting asks for the microphone the first time, opens it once it is allowed, and holds the speech engine while talking"
  it("prewarms on startup and foreground, coalesces concurrent probes, holds the speech engine while talking, and warms cloud after consent", async () => {
    const world = { ...scene(), phone: true };
    let releaseProbe: (() => void) | undefined;
    const probeWait = new Promise<void>((resolve) => { releaseProbe = resolve; });
    world.voice.probeGate = () => probeWait;

    const runtime = bootVoice(world);

    await until(runtime, Voice.Machine, (s) => s.warmed);
    await untilCondition(
      runtime,
      () => world.voice.warmSpeechOutputCalls === 1 && world.voice.localSpeechStatusCalls === 1 && world.voice.liveCaptureStatusCalls === 1,
      () => ({ warm: world.voice.warmSpeechOutputCalls, local: world.voice.localSpeechStatusCalls, live: world.voice.liveCaptureStatusCalls }),
    );
    const afterWarm = await getVoice(runtime);
    expect([afterWarm.phase, afterWarm.mic, afterWarm.prompting, world.voice.startLiveCaptureCalls, world.ask.cloudWarmCalls, world.voice.relayWarmups]).toEqual([
      "Idle", "Off", false, 0, 0, [],
    ]);

    const extraProbe = runtime.runPromise(Effect.flatMap(VoiceBridge, (b) => b.probeStatus(true)));
    releaseProbe?.();
    const probed = await extraProbe;
    expect(probed).toEqual({ ready: true, ttsReady: true, liveCapture: true });
    expect([world.voice.warmSpeechOutputCalls, world.voice.localSpeechStatusCalls, world.voice.liveCaptureStatusCalls]).toEqual([1, 1, 1]);

    const cached = await runtime.runPromise(Effect.flatMap(VoiceBridge, (b) => b.probeStatus(true)));
    expect(cached).toEqual({ ready: true, ttsReady: true, liveCapture: true });
    expect([world.voice.localSpeechStatusCalls, world.voice.liveCaptureStatusCalls]).toEqual([1, 1]);

    await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");
    const listening = await getVoice(runtime);
    expect([listening.engineHeld, world.voice.engineHeld, world.voice.holdEngineCalls, world.voice.liveCaptureStatusCalls, world.voice.startLiveCaptureCalls]).toEqual([
      true, true, 1, 1, 1,
    ]);

    await sendVoice(runtime, { type: "stop", keyboard: false });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const stopped = await getVoice(runtime);
    expect([stopped.engineHeld, world.voice.engineHeld, world.voice.releaseEngineHoldCalls]).toEqual([false, false, 1]);

    world.voice.probeGate = undefined;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    await untilCondition(runtime, () => world.voice.warmSpeechOutputCalls === 2 && world.voice.liveCaptureStatusCalls === 2);

    await sendVoice(runtime, { type: "accountChanged", account: "CloudAccount", key: 1 });
    await sendVoice(runtime, { type: "chooseNetworkSpeech", agree: true });
    await sendVoice(runtime, { type: "returned" });
    await untilCondition(runtime, () => world.ask.cloudWarmCalls >= 1 && world.voice.relayWarmups.length >= 1);
    expect([world.ask.cloudWarmCalls >= 1, [...new Set(world.voice.relayWarmups)], world.voice.startCloudSpeechCalls]).toEqual([true, ["production"], 0]);
  });

  // spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"
  it("warms the Cloud speech relay for an own-key account that agreed to network speech, as talking on it uses the relay", async () => {
    const world = { ...scene(), phone: true };
    const runtime = bootVoice(world);
    await until(runtime, Voice.Machine, (s) => s.warmed);
    await untilCondition(runtime, () => world.voice.warmSpeechOutputCalls === 1);
    expect(world.voice.relayWarmups).toEqual([]);

    await sendVoice(runtime, { type: "accountChanged", account: "OwnKey", key: 2 });
    await sendVoice(runtime, { type: "chooseNetworkSpeech", agree: true });
    await sendVoice(runtime, { type: "returned" });
    await untilCondition(runtime, () => world.voice.relayWarmups.length >= 1, () => world.voice.relayWarmups);
    const warm = await getVoice(runtime);
    expect([[...new Set(world.voice.relayWarmups)], warm.mic, world.voice.startCloudSpeechCalls, world.voice.startLiveCaptureCalls]).toEqual([["production"], "Off", 0, 0]);
  });

  // spec/app/voice/index.md, "Alpha's reply is spoken a sentence at a time, sentences streamed before the reply is complete included, and only for the current turn"; spec/app/voice/index.md, "A spoken reply says a written date, clock time, range and percentage in words"
  it("streams multi-sentence replies incrementally with append chaining, says dates and times in words, and returns to listening", async () => {
    const world = { ...scene(), phone: true };
    world.ask.nextReplyChunks = [
      "First sentence is ready. ",
      "Second sentence follows immediately! ",
      "Final sentence wraps up.",
    ];
    const runtime = await startListening(world);

    await speakUtterance(runtime, world, "Give me an update");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 1 && s.turn === 2);

    expect(world.voice.spoken.map((one) => ({ text: one.text, append: one.append }))).toEqual([
      { text: "First sentence is ready.", append: false },
      { text: "Second sentence follows immediately!", append: true },
      { text: "Final sentence wraps up.", append: true },
    ]);
    expect(world.voice.engineHeld).toBe(true);

    world.ask.nextReplyChunks = [
      "Sun, Nov 22:\n",
      "Dentist Mon, Nov 23 at 3:30 pm, about 5–10 minutes. ",
      "Then 9:05 to 10:00, and lunch at 12 pm. Battery is at 80%.",
    ];
    await speakUtterance(runtime, world, "What is on my calendar");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 2 && s.turn === 3);
    expect(world.voice.spoken.slice(3).map((one) => one.text)).toEqual([
      "Sunday, November twenty-second.",
      "Dentist Monday, November twenty-third at three thirty P M, about 5 to 10 minutes.",
      "Then nine oh five to ten o'clock, and lunch at noon.",
      "Battery is at 80 percent.",
    ]);
    expect(world.ask.kept.get("c1")?.messages.at(-1)?.text).toBe("Sun, Nov 22:\nDentist Mon, Nov 23 at 3:30 pm, about 5–10 minutes. Then 9:05 to 10:00, and lunch at 12 pm. Battery is at 80%.");

    const withAbbreviations = ["Dentist Mon.", " Se", "pt. 0", "7 from 2 p.", " m. to", " 3 p.m. Bring 5–10."];
    const spokenAbbreviations = ["Dentist Monday, September seventh from two P M to three P M.", "Bring 5 to 10."];
    for (const [index, provisional] of [false, true].entries()) {
      const from = world.voice.spoken.length;
      world.ask.nextReplyChunks = withAbbreviations;
      world.ask.nextReplyProvisional = provisional;
      await speakUtterance(runtime, world, "Read me another day");
      await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.sent === 3 + index && s.turn === 4 + index);
      expect(world.voice.spoken.slice(from).map((one) => one.text)).toEqual(spokenAbbreviations);
      expect(world.ask.kept.get("c1")?.messages.at(-1)?.text).toBe(withAbbreviations.join(""));
    }

    const written = [
      "Ages 8-12 welcome. Pages 10-20.\n",
      "Standup at 9:00\n- 10:00 Review.\n",
      "Items 3\n- 5 left. ",
      "Call 555-123-4567 on 2026-11-24 at UTC+01:00, if you may 3 times.",
    ];
    const from = world.voice.spoken.length;
    world.ask.nextReplyChunks = written;
    await speakUtterance(runtime, world, "Anything else");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.sent === 5 && s.turn === 6);
    expect(world.voice.spoken.slice(from).map((one) => one.text)).toEqual([
      "Ages 8 to 12 welcome.",
      "Pages 10 to 20.",
      "Standup at nine o'clock - ten o'clock Review.",
      "Items 3 - 5 left.",
      "Call 555-123-4567 on 2026-11-24 at UTC+01:00, if you may 3 times.",
    ]);
    expect(world.ask.kept.get("c1")?.messages.at(-1)?.text).toBe(written.join(""));
  });

  // spec/app/voice/index.md, "A turn Cloud refuses because the account is out of funds ends voice quietly, as Stop does"
  it("keeps listening after other refusals and ends quietly when Cloud refuses a spoken turn for spent funds", async () => {
    const world = { ...scene(), phone: true };
    const runtime = await startListening(world);

    world.ask.refusal = { failureKind: "provider_issue" };
    await speakUtterance(runtime, world, "What's the weather");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 1 && s.turn === 2);

    world.ask.refusal = { failureKind: "insufficient_credits", planAction: "funding" };
    await speakUtterance(runtime, world, "And tomorrow");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 2 && s.turn === 3);

    world.ask.refusal = { failureKind: "insufficient_credits", cloudCode: "allowance_exhausted", planAction: "funding" };
    await speakUtterance(runtime, world, "And Friday");
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const ended = await getVoice(runtime);
    expect([ended.phase, ended.mic, ended.failure, ended.engineHeld, ended.sent, world.voice.engineHeld, world.voice.activeMicSession, world.voice.startLiveCaptureCalls, world.voice.spoken]).toEqual([
      "Idle", "Off", "NoFailure", false, 3, false, undefined, 3, [],
    ]);
  });

  // spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"
  it("keeps voice active and the microphone open when an agent action needs review in chat, and settling review does not stop voice", async () => {
    const world = { ...scene(), phone: true };
    world.ask.nextReplyChunks = ["[APPROVAL:send_email] Draft ready for your review in chat."];
    const runtime = await startListening(world);

    await speakUtterance(runtime, world, "Send the draft email");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.reviewPending && s.sent === 1);

    const duringReview = await getVoice(runtime);
    expect([duringReview.phase, duringReview.mic, duringReview.reviewPending, duringReview.engineHeld, world.voice.activeMicSession !== undefined]).toEqual([
      "Listening", "On", true, true, true,
    ]);
    expect(world.voice.hushCalls).toBeGreaterThanOrEqual(1);
    expect(world.voice.spoken).toEqual([]);

    await sendVoice(runtime, { type: "reviewSettled" });
    const afterSettle = await getVoice(runtime);
    expect([afterSettle.phase, afterSettle.mic, afterSettle.reviewPending, afterSettle.engineHeld, world.voice.activeMicSession !== undefined]).toEqual([
      "Listening", "On", false, true, true,
    ]);
  });

  // spec/app/voice/index.md, "An active voice conversation may ask the shell to open Home or any admitted screen"; spec/app/voice/index.md, "Voice keeps talking after a navigation only when it is the one the conversation asked for; any other ends it"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("keeps voice, mic, and raised Sheet open across agent navigation to an app, to Home, and same-screen refresh, while owner navigation stops voice", async () => {
    const world = { ...scene(), phone: true };
    const runtime = await startListening(world);
    await sendShell(runtime, { type: "raise", detent: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Calendar] Opening Calendar."];
    await speakUtterance(runtime, world, "Open my calendar");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.followed === placeOf("Calendar") && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: ["Calendar"], assistant: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Home] Back on Home."];
    await speakUtterance(runtime, world, "Go home");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.followed === placeOf(undefined) && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: [], assistant: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Home] Refreshed Home."];
    await speakUtterance(runtime, world, "Refresh home");
    await until(runtime, Voice.Machine, (s) => s.sent === 3 && s.phase === "Listening" && s.mic === "On" && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: [], assistant: "Sheet" });

    await sendShell(runtime, { type: "openView", view: "Notes" });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const ended = await getVoice(runtime);
    expect([ended.phase, ended.mic, ended.engineHeld, world.voice.engineHeld, world.voice.releaseEngineHoldCalls]).toEqual([
      "Idle", "Off", false, false, 1,
    ]);
  });
});
