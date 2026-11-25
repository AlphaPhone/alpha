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
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import type { Mount } from "../src/areas.ts";
import { dictate } from "../src/assistant/dictation.vibe";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, drawn, open, press, seen, underAct, until as drawnUntil } from "./alpha.tsx";
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

function speakUtterance(world: Scene, text: string): void {
  world.voice.emitLocal?.("liveCaptureTranscript", {
    captureId: world.voice.activeMicSession,
    final: { turnId: "test-turn", text, mode: "device" },
  });
}

underAct();
afterEach(closeAll);
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
    const world = { ...scene(), phone: true, signedIn: false };
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

    world.signedIn = true;
    world.voice.signedInHere?.();
    await until(runtime, Voice.Machine, (s) => s.route.account === "CloudAccount" && s.route.consent && s.warmed);
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

  it('returns quietly to idle when local Talk is unavailable before opening the microphone (spec/app/voice/index.md, "The microphone opens for the current session only, and a microphone that cannot open fails the conversation"; spec/app/voice/index.md, "A failed conversation ends quietly: why it failed is kept only until voice returns to idle, and nothing is shown")', async () => {
    const world = { ...scene(), phone: true };
    world.voice.nativeTransport = false;
    const runtime = bootVoice(world);
    await until(runtime, Voice.Machine, (s) => s.warmed);
    await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
    const before = (await getVoice(runtime)).session;
    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.session > before && s.phase === "Idle");
    const stopped = await getVoice(runtime);
    expect([stopped.mic, stopped.failure, stopped.engineHeld, world.voice.activeMicSession, world.voice.startLiveCaptureCalls]).toEqual(["Off", "NoFailure", false, undefined, 0]);
  });

  it('recognizes the same recorded clip after a failed attempt (spec/app/voice/index.md, "Story: Dictate into a field")', async () => {
    const world = { ...scene(), phone: true };
    world.voice.transcriptionFailures = 1;
    const runtime = bootVoice(world);
    await until(runtime, Voice.Machine, (s) => s.warmed);
    await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
    await sendVoice(runtime, { type: "openRecorder", target: "ComposerField" });
    await sendVoice(runtime, { type: "startRecording" });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recording");
    await sendVoice(runtime, { type: "stopRecording", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recorded");
    expect((await getVoice(runtime)).recorder.failure).toBe("Recognition");
    await sendVoice(runtime, { type: "transcribeAgain", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Review");
    const reviewed = await getVoice(runtime);
    expect([reviewed.recorder.words, reviewed.sent]).toEqual([true, 0]);
  });

  // spec/app/voice/index.md, "A clip is transcribed on the route speech takes now"
  it("recognizes one native completion even when a stale recording ID follows it before Start returns", async () => {
    const world = { ...scene(), phone: true };
    const runtime = bootVoice(world);
    await until(runtime, Voice.Machine, (s) => s.warmed);
    await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
    await sendVoice(runtime, { type: "openRecorder", target: "ComposerField" });
    await sendVoice(runtime, { type: "startRecording" });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recording");
    await sendVoice(runtime, { type: "closeRecorder" });

    world.voice.recordingStartGate = () => {
      world.voice.finishRecording?.();
      world.voice.emitLocal?.("recordingStopped", { recordingId: "retired-native-id", status: "failed" });
      return Promise.resolve();
    };
    await sendVoice(runtime, { type: "openRecorder", target: "ComposerField" });
    await sendVoice(runtime, { type: "startRecording" });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Review");
    expect(world.voice.dictationClips).toEqual(["rec-2"]);
    expect((await getVoice(runtime)).sent).toBe(0);
  });

  // spec/app/voice/index.md, "A clip is transcribed on the route speech takes now"
  it("keeps a confirmed clip when obscured and never offers a recognition retry for a refused stop", async () => {
    const world = { ...scene(), phone: true };
    world.voice.dictationInFront = false;
    const runtime = bootVoice(world);
    await until(runtime, Voice.Machine, (s) => s.warmed);
    await sendVoice(runtime, { type: "permissionChanged", grant: "Granted" });
    await sendVoice(runtime, { type: "openRecorder", target: "ComposerField" });
    await sendVoice(runtime, { type: "startRecording" });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recording");
    world.voice.finishRecording?.();
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recorded");
    expect(world.voice.dictationClips).toEqual([]);
    world.voice.dictationInFront = true;
    await sendVoice(runtime, { type: "transcribeAgain", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Review");
    expect(world.voice.dictationClips).toEqual(["rec-1"]);

    await sendVoice(runtime, { type: "recordAgain" });
    world.voice.refuseRecordingStop = true;
    await sendVoice(runtime, { type: "startRecording" });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Recording");
    await sendVoice(runtime, { type: "stopRecording", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.recorder.stage === "Closed");
    const closed = await getVoice(runtime);
    expect([closed.recorder.clip, Voice.canTranscribeAgain(closed, untimed)]).toEqual([false, false]);
    expect(world.voice.dictationClips).toEqual(["rec-1"]);
  });

  // spec/app/voice/index.md, "Alpha's reply is spoken a sentence at a time, sentences streamed before the reply is complete included, and only for the current turn"; spec/app/voice/index.md, "A spoken reply says a written date, clock time, range and percentage in words"
  it("streams multi-sentence replies incrementally with append chaining, says dates and times in words, and returns to listening", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.ask.nextReplyChunks = [
      "First sentence is ready. ",
      "Second sentence follows immediately! ",
      "Final sentence wraps up.",
    ];
    const runtime = await startListening(world);

    speakUtterance(world, "Give me an update");
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
    speakUtterance(world, "What is on my calendar");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 2 && s.turn === 3);
    expect(world.voice.spoken.slice(3).map((one) => one.text)).toEqual([
      "Sunday, November twenty-second.",
      "Dentist Monday, November twenty-third at three thirty P M, about 5 to 10 minutes.",
      "Then nine oh five to ten o'clock, and lunch at noon.",
      "Battery is at 80 percent.",
    ]);
    expect(world.ask.kept.get("c1")?.messages.at(-1)?.text).toBe("Sun, Nov 22:\nDentist Mon, Nov 23 at 3:30 pm, about 5–10 minutes. Then 9:05 to 10:00, and lunch at 12 pm. Battery is at 80%.");

    const withAbbreviations = ["Dentist Mon.", " Se", "pt. 0", "7 from 2 p.", " m. to", " 3 p.m. Bring 5–10.", " Call again at 4 P.M. ", "tomorrow!"];
    const spokenAbbreviations = ["Dentist Monday, September seventh from two P M to three P M.", "Bring 5 to 10.", "Call again at four P M tomorrow!"];
    for (const [index, provisional] of [false, true].entries()) {
      const from = world.voice.spoken.length;
      world.ask.nextReplyChunks = withAbbreviations;
      world.ask.nextReplyProvisional = provisional;
      speakUtterance(world, "Read me another day");
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
    speakUtterance(world, "Anything else");
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
    const world = { ...scene(), phone: true, signedIn: false };
    const runtime = await startListening(world);

    world.ask.refusal = { failureKind: "provider_issue" };
    speakUtterance(world, "What's the weather");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 1 && s.turn === 2);

    world.ask.refusal = { failureKind: "insufficient_credits", planAction: "funding" };
    speakUtterance(world, "And tomorrow");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 2 && s.turn === 3);

    world.ask.refusal = { failureKind: "insufficient_credits", cloudCode: "allowance_exhausted", planAction: "funding" };
    speakUtterance(world, "And Friday");
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const ended = await getVoice(runtime);
    expect([ended.phase, ended.mic, ended.failure, ended.engineHeld, ended.sent, world.voice.engineHeld, world.voice.activeMicSession, world.voice.startLiveCaptureCalls, world.voice.spoken]).toEqual([
      "Idle", "Off", "NoFailure", false, 3, false, undefined, 3, [],
    ]);
  });

  // spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"
  it("keeps voice active and the microphone open when an agent action needs review in chat, and settling review does not stop voice", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.ask.nextReplyChunks = ["[APPROVAL:send_email] Draft ready for your review in chat."];
    const runtime = await startListening(world);

    speakUtterance(world, "Send the draft email");
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
    const world = { ...scene(), phone: true, signedIn: false };
    const runtime = await startListening(world);
    await sendShell(runtime, { type: "raise", detent: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Calendar] Opening Calendar."];
    speakUtterance(world, "Open my calendar");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.followed === placeOf("Calendar") && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: ["Calendar"], assistant: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Home] Back on Home."];
    speakUtterance(world, "Go home");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.followed === placeOf(undefined) && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: [], assistant: "Sheet" });

    world.ask.nextReplyChunks = ["[NAVIGATE:Home] Refreshed Home."];
    speakUtterance(world, "Refresh home");
    await until(runtime, Voice.Machine, (s) => s.sent === 3 && s.phase === "Listening" && s.mic === "On" && s.claim === 0);
    expect(await getShell(runtime)).toMatchObject({ trail: [], assistant: "Sheet" });

    await sendShell(runtime, { type: "openView", view: "Notes" });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const ended = await getVoice(runtime);
    expect([ended.phase, ended.mic, ended.engineHeld, world.voice.engineHeld, world.voice.releaseEngineHoldCalls]).toEqual([
      "Idle", "Off", false, false, 1,
    ]);
  });
  // spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"; spec/app/voice/index.md, "Starting asks for the microphone the first time, opens it once it is allowed, and holds the speech engine while talking"; spec/app/voice/route.md, "Story: Choose where speech is processed"
  it("talks over Cloud speech on a phone with only the relay, under the signed-in key read again after a refused start, and warms the relay without waiting on it", async () => {
    const world = { ...scene(), phone: true };
    world.voice.onDevice = false;
    world.voice.relayWarmupHangs = true;
    world.voice.credentialId = "cred-owner-7";
    const runtime = bootVoice(world);
    expect(await runtime.runPromise(Effect.flatMap(VoiceBridge, (bridge) => bridge.available()))).toBe(true);

    await until(runtime, Voice.Machine, (s) => s.route.account === "CloudAccount" && s.route.consent && s.warmed);
    await untilCondition(runtime, () => world.voice.relayWarmups.length === 1 && world.ask.cloudWarmCalls >= 1, () => world.voice.relayWarmups);
    await sendVoice(runtime, { type: "returned" });
    await untilCondition(runtime, () => world.voice.relayWarmups.length === 2, () => world.voice.relayWarmups);
    expect(world.voice.relayWarmups).toEqual(["production", "production"]);

    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.network);
    expect(world.voice.cloudStarts).toEqual([{ environment: "production", credentialId: "cred-owner-7" }]);
    await sendVoice(runtime, { type: "stop", keyboard: false });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");

    world.voice.credentialId = "cred-owner-8";
    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.session === 2 && s.phase === "Idle" && s.failure === "NoFailure" && s.mic === "Off");
    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.network);
    expect(world.voice.cloudStarts.map((one) => one.credentialId)).toEqual(["cred-owner-7", "cred-owner-7", "cred-owner-8"]);
    await sendVoice(runtime, { type: "stop", keyboard: false });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");

    world.signedIn = false;
    await sendVoice(runtime, { type: "returned" });
    await untilCondition(runtime, () => world.voice.relayWarmups.length === 3, () => world.voice.relayWarmups);
    await sendVoice(runtime, { type: "startTalking", now: untimed });
    await until(runtime, Voice.Machine, (s) => s.session === 4 && s.phase === "Idle");
    expect([(await getVoice(runtime)).mic, world.voice.cloudStarts.length]).toEqual(["Off", 3]);
  });
});

/** Ask Alpha alone: the screen a spoken conversation from the composer draws. */
const talkMounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

describe("Talk from Ask Alpha's composer (spec/app/voice/index.md, \"Story: Hold a spoken conversation\")", () => {
  it("keeps the resting Talk control visible but unavailable on a browser without speech", async () => {
    const world = scene();
    const { alpha } = await open(world, talkMounts);
    await drawnUntil(alpha, assistant.runtime(alpha), Voice.Machine, (state) => state.warmed);
    const talk = button("Talk");
    expect(talk?.disabled).toBe(true);
    await drawn(() => talk?.click());
    expect([world.voice.startLiveCaptureCalls, world.voice.startCloudSpeechCalls]).toEqual([0, 0]);
  });

  // spec/app/voice/index.md, "Starting asks for the microphone the first time, opens it once it is allowed, and holds the speech engine while talking"; spec/app/voice/index.md, "Signing in, out or to another account changes the route, invalidates warmup, and ends a running conversation"; spec/app/voice/index.md, "Stop and switch to keyboard shut the conversation down; the keyboard then takes over"; spec/app/assistant/dock.md, "While voice owns Ask Alpha its open sheet is not dragged, a drag under way is let go, and the sheet is dragged again once voice ends"
  it("a signed-in owner taps Talk and talks over the relay under the account's key, Stop ends it, and after signing in to another account the first Talk speaks under the new key", async () => {
    const world = { ...scene(), phone: true };
    world.voice.onDevice = false;
    world.voice.credentialId = "cred-owner-9";
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    const settled = async (check: () => boolean) => {
      for (let turn = 0; turn < 400 && !check(); turn += 1) await drawn(() => alpha.runtime.runPromise(Effect.yieldNow));
      expect(check()).toBe(true);
    };
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.route.account === "CloudAccount" && s.route.consent && s.warmed);
    await settled(() => world.voice.relayWarmups.length === 1);

    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.network);
    await drawnUntil(alpha, area, Dock, (s) => s.voice);
    expect([world.voice.cloudStarts, world.voice.activeMicSession !== undefined, button("Talk")]).toEqual([
      [{ environment: "production", credentialId: "cred-owner-9" }], true, undefined,
    ]);

    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Idle" && s.mic === "Off");
    await drawnUntil(alpha, area, Dock, (s) => !s.voice);
    expect([world.voice.activeMicSession, world.voice.stopCloudSpeechCalls > 0, button("Talk") !== undefined]).toEqual([undefined, true, true]);

    world.voice.credentialId = "cred-owner-10";
    const before = (await area.runPromise(Effect.flatMap(Voice.Machine, (m) => m.get()))).route.key;
    await drawn(() => world.voice.signedInHere?.());
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.route.key !== before && s.route.consent && s.warmed);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.network);
    expect(world.voice.cloudStarts.map((one) => one.credentialId)).toEqual(["cred-owner-9", "cred-owner-10"]);
    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Idle");

    world.signedIn = false;
    await seen(false);
    await seen(true);
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.route.account === "SignedOut" && !s.route.consent);
  });

  // spec/app/voice/index.md, "Starting asks for the microphone the first time, opens it once it is allowed, and holds the speech engine while talking"; spec/app/voice/index.md, "Audio leaves the phone only on a route the owner agreed to"; spec/app/voice/index.md, "A failed conversation ends quietly: why it failed is kept only until voice returns to idle, and nothing is shown"
  it("a signed-out owner's Talk ends quietly: voice returns to idle, nothing leaves the phone, nothing is shown, and Talk is offered again", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.voice.onDevice = false;
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.warmed);

    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.session > 0 && s.phase === "Idle");
    const after = await area.runPromise(Effect.flatMap(Voice.Machine, (m) => m.get()));
    expect([after.mic, after.network, world.voice.cloudStarts, world.voice.relayWarmups, document.querySelector("[role=alertdialog], [role=alert], [role=note], [role=status]"), button("Talk") !== undefined]).toEqual([
      "Off", false, [], [], null, true,
    ]);
  });

  // spec/app/voice/index.md, "Story: Dictate into a field"; spec/app/voice/index.md, "Recording asks for the microphone the first time, like a conversation"; spec/app/voice/dictation.md, "A microphone failure ends dictation quietly and a failed transcription keeps its clip"
  it("a dictation the microphone refuses closes quietly and restores the composer's microphone control", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.voice.permission = "prompt";
    world.voice.grantOnRequest = false;
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    const settled = async (check: () => boolean) => {
      for (let turn = 0; turn < 400 && !check(); turn += 1) await drawn(() => alpha.runtime.runPromise(Effect.yieldNow));
      expect(check()).toBe(true);
    };
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.warmed);
    await settled(() => button("Talk") !== undefined);

    await drawn(() => document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]")?.focus());
    await drawn(() => area.runPromise(dictate()));
    await settled(() => button("Start recording") !== undefined);
    await press("Start recording");
    await settled(() => button("Talk") !== undefined);
    const after = await area.runPromise(Effect.flatMap(Voice.Machine, (m) => m.get()));
    expect([after.recorder.stage, after.permission.asked]).toEqual(["Closed", true]);
    expect([document.querySelector("[role=alertdialog], [role=alert], [role=note], [role=status], section[aria-label='Voice transcription']"), world.voice.permission]).toEqual([null, "denied"]);
  });
});
