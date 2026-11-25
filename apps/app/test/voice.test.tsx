// @vitest-environment happy-dom
// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"; spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"; spec/app/voice/index.md, "Story: Go where the conversation takes me"; spec/app/voice/index.md, "A spoken reply says a written date, clock time, range and percentage in words"; spec/app/voice/index.md, "A turn Cloud refuses because the account is out of funds ends voice quietly, as Stop does"
import { type Context, Effect, Layer, ManagedRuntime, Stream } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Shell from "../gen/app__shell.effect.vibe";
import * as Voice from "../gen/app__voice.effect.vibe";
import { VoiceBridge } from "../src/platform/voice.vibe";
import { together, untimed, whole } from "../src/runtime/reactor.vibe";
import { shell } from "../src/shell/shell.vibe";
import { placeOf, VoiceWords, voicing } from "../src/voice/voice.vibe";
import { DictationClock } from "../src/voice/dictation-clock.vibe";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { Machine as Locator } from "../gen/app__assistant__context.effect.vibe";
import { Machine as Files } from "../gen/app__files.effect.vibe";
import { Machine as FilePreview } from "../gen/app__files__preview.effect.vibe";
import { Machine as Preferences } from "../gen/app__settings__preferences.effect.vibe";
import type { Mount } from "../src/areas.ts";
import { dictate } from "../src/assistant/dictation.vibe";
import assistant from "../src/assistant/index.tsx";
import files from "../src/files/index.tsx";
import { button, closeAll, drawn, fill, later, open, press, seen, underAct, until as drawnUntil } from "./alpha.tsx";
import { scene, type Scene } from "./fakes/scene.ts";
import { prepared } from "./fakes/notes.ts";
import { textReview } from "./fakes/text-review.ts";
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
  const { alpha } = await open(world, talkMounts);
  const runtime = assistant.runtime(alpha);
  await drawnUntil(alpha, runtime, Conversation, (s) => s.ready);
  await drawnUntil(alpha, runtime, Composer, (s) => s.slot === "Open" && s.binding.owner > 0);
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
    // spec/app/voice/index.md, "On-device Talk audio stays in the current owner's native capture and resident recognizer": opening the microphone checks the resident route again, beside the warm-up's cached probe.
    expect([listening.engineHeld, world.voice.engineHeld, world.voice.holdEngineCalls, world.voice.liveCaptureStatusCalls, world.voice.startLiveCaptureCalls]).toEqual([
      true, true, 1, 2, 1,
    ]);

    await sendVoice(runtime, { type: "stop", keyboard: false });
    await until(runtime, Voice.Machine, (s) => s.phase === "Idle");
    const stopped = await getVoice(runtime);
    expect([stopped.engineHeld, world.voice.engineHeld, world.voice.releaseEngineHoldCalls]).toEqual([false, false, 1]);

    world.voice.probeGate = undefined;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    await untilCondition(runtime, () => world.voice.warmSpeechOutputCalls === 2 && world.voice.liveCaptureStatusCalls === 3);

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
    expect(runtime.runSync(VoiceWords).memory.dictatedDurationMs).toBe(59_000);
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
    expect(world.ask.opened).toBe(0);

    speakUtterance(world, "Give me an update");
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 1 && s.turn === 2);

    expect(world.voice.spoken.map((one) => ({ text: one.text, append: one.append }))).toEqual([
      { text: "First sentence is ready.", append: false },
      { text: "Second sentence follows immediately!", append: true },
      { text: "Final sentence wraps up.", append: true },
    ]);
    expect(world.voice.engineHeld).toBe(true);
    expect([...world.ask.kept.values()].map((chat) => chat.title)).toEqual(["Ask Alpha"]);

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

    // spec/app/assistant/reply.md, "The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one"
    const tagged = [[["Sure.\n[answer] Paris"], ["Sure.", "Paris"]], [["Paris. [answer]"], ["Paris."]], [["<promise> One sec."], ["One sec."]], [["[ans", "wer] Paris"], ["Paris"]], [["[answer", "](https://example.com) is a link."], ["answer is a link."]]] as const;
    for (const [index, [chunks, heard]] of tagged.entries()) {
      const before = world.voice.spoken.length;
      world.ask.nextReplyChunks = chunks;
      speakUtterance(world, "Capital of France");
      await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.sent === 6 + index && s.turn === 7 + index);
      expect(world.voice.spoken.slice(before).map((one) => one.text)).toEqual(heard);
    }
  });

  // spec/app/assistant/reply.md, "A spoken acknowledgment starts at once; a reply ready before it is audible drops it, and an audible one finishes before the reply, within 2.5 s"
  it("says the agent's acknowledgment at once, before the reply it was waiting for, and only once", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.ask.acknowledgment = "Let me check your calendar.";
    world.ask.holdAfterTools = true;
    world.ask.nextReplyChunks = ["You're clear tomorrow. ", "Nothing is booked."];
    const runtime = await startListening(world);

    speakUtterance(world, "What's on tomorrow");
    await untilCondition(runtime, () => world.voice.spoken.length === 1, () => world.voice.spoken);
    expect(world.voice.spoken.map((one) => ({ text: one.text, append: one.append }))).toEqual([{ text: "Let me check your calendar.", append: false }]);
    for (const release of [...world.ask.turns.values()]) release();
    await until(runtime, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On" && s.sent === 1 && s.turn === 2);
    expect(world.voice.spoken.map((one) => ({ text: one.text, append: one.append }))).toEqual([
      { text: "Let me check your calendar.", append: false },
      { text: "You're clear tomorrow.", append: true },
      { text: "Nothing is booked.", append: true },
    ]);
    expect(world.ask.kept.get("c1")?.messages.at(-1)?.text).toBe("You're clear tomorrow. Nothing is booked.");
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
  it.each([
    { name: "Home", view: undefined },
    { name: "Calendar", view: "Calendar" },
    { name: "Browser", view: "Browser" },
  ] as const)("draws the compact Talk waveform over $name during on-device speech", async ({ view }) => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    if (view !== undefined) await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "openView", view }))));
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Listening" && state.mic === "On");
    const waveform = () => document.querySelector("[data-alpha-pill-voice] [data-alpha-voice-animation]");
    expect(waveform()?.getAttribute("data-phase")).toBe("Listening");
    expect(waveform()?.children.length).toBe(5);

    await press("Mute microphone");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.muted && state.mic === "Off");
    expect(waveform()?.getAttribute("data-phase")).toBe("Muted");
    expect(world.voice.activeMicSession).toBeUndefined();

    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Idle");
    expect(waveform()).toBeNull();
  });

  it("restores the local speaker before unrelated playback when Talk stops during a mute (spec/app/voice/index.md, \"Speaker mute is offered after the current speech bridge confirms gain control\")", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.speaker === "SpeakerOn");
    expect(world.voice.speakerGainRequests).toEqual([false]);

    await press("Mute speaker");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.speaker === "SpeakerOff");
    expect(button("Unmute speaker")?.getAttribute("aria-pressed")).toBe("true");
    expect(world.voice.speakerMuted).toBe(true);
    expect(world.voice.activeMicSession).toBeDefined();
    await press("Unmute speaker");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.speaker === "SpeakerOn");

    const pending = Promise.withResolvers<void>();
    const began = Promise.withResolvers<void>();
    world.voice.speakerGainGate = async (muted) => {
      if (muted) {
        began.resolve();
        await pending.promise;
      }
    };
    try {
      await press("Mute speaker");
      await began.promise;
      expect(button("Mute speaker")?.disabled).toBe(true);
      await press("Stop voice conversation");
      await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Stopping");
      expect(world.voice.speakerGainRequests).toEqual([false, true, false, true]);
    } finally {
      pending.resolve();
    }
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Idle");
    expect(world.voice.speakerGainRequests).toEqual([false, true, false, true, false]);

    await area.runPromise(Effect.flatMap(VoiceBridge, (bridge) => Stream.runCollect(bridge.readAloud(1, "Another reading."))));
    expect(world.voice.speakerMutedAtPlayback).toEqual([false]);
  });

  // spec/app/voice/index.md, "Stop and switch to keyboard shut the conversation down; the keyboard then takes over"
  it.each(["confirmed", "view changed", "unconfirmed"] as const)("returns focus after Switch to keyboard only for the current confirmed Talk (%s)", async (outcome) => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    await drawnUntil(alpha, area, Composer, (state) => state.slot === "Open");
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Listening" && state.speaker === "SpeakerOn");
    await press("Open conversation");
    const editor = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(editor).not.toBeNull();
    await press("Mute speaker");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.speaker === "SpeakerOff");

    const restoring = Promise.withResolvers<void>();
    const settled = Promise.withResolvers<void>();
    world.voice.speakerGainGate = async (muted) => {
      if (muted) return;
      restoring.resolve();
      await settled.promise;
      if (outcome === "unconfirmed") throw new Error("Speaker gain did not restore");
    };
    try {
      await drawn(() => button("Switch to keyboard")?.focus());
      await press("Switch to keyboard");
      await restoring.promise;
      await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Stopping");
      expect(document.activeElement).not.toBe(editor);
      if (outcome === "view changed") {
        await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "openView", view: "Notes" }))));
      }
    } finally {
      settled.resolve();
    }
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Idle");
    expect(world.voice.activeMicSession).toBeUndefined();
    if (outcome === "confirmed") expect(document.activeElement).toBe(editor);
    else expect(document.activeElement).not.toBe(editor);
  });

  it("keeps the speaker control hidden when the live bridge refuses gain (spec/app/voice/index.md, \"Speaker mute is offered after the current speech bridge confirms gain control\")", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.voice.speakerGainGate = () => Promise.reject(new Error("Output gain unavailable"));
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.speaker === "SpeakerUnavailable");
    expect(button("Mute speaker")).toBeUndefined();
    expect(button("Mute microphone")).toBeDefined();
    expect(world.voice.activeMicSession).toBeDefined();
  });

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

  // spec/app/assistant/context.md, "A spoken turn carries what a typed turn sent at that moment would, the view claim included"
  it("a spoken turn tells the agent the same screen as typing and follows the current prepared view with Talk still open", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Conversation, (s) => s.ready && s.observing);
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.warmed);
    world.ask.metadata = [];

    await fill("Message Alpha", "What is on my screen?");
    await press("Send");
    await drawnUntil(alpha, area, Conversation, (s) => s.turn.send.id === 1 && s.turn.reply === "Complete");
    await drawnUntil(alpha, area, Locator, (s) => s.gpsAt >= 0);
    await fill("Message Alpha", "And now?");
    await press("Send");
    await drawnUntil(alpha, area, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    const typed = world.ask.metadata.at(-1);
    expect(typed).toMatchObject({ observation: { view: "home", sensitive: false, location: { latitude: 43.73, longitude: 7.42 } }, viewDelivery: "completed-action" });

    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");
    speakUtterance(world, "And now?");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.sent === 1 && s.phase === "Listening");
    expect([world.ask.said.at(-1), world.ask.metadata.length, world.ask.metadata.at(-1)]).toEqual(["And now?", 3, typed]);
    // spec/app/voice/index.md, "Talk keeps what it sends in the selected Ask Alpha conversation"
    expect(world.ask.opened).toBe(1);
    expect(world.ask.kept.get("c1")?.messages.slice(-2).map(({ role, text }) => ({ role, text }))).toEqual([
      { role: "user", text: "And now?" },
      { role: "assistant", text: "You said: And now?" },
    ]);

    // spec/app/voice/index.md, "An active voice conversation may ask the shell to open Home or any admitted screen"
    const shellState = () => alpha.runtime.runSync(Shell.Machine.use((machine) => machine.get()));
    const preparedFor = (view: string) => (metadata: unknown) => [
      prepared(String((metadata as { viewClientId?: unknown }).viewClientId), view, false),
    ];
    const client = (typed as { viewClientId: string }).viewClientId;
    const binding = (viewId: string) => ({ requestId: `request-${viewId}`, clientId: client, viewId, viewType: "gui", installationId: "alpha" });
    world.ask.nextReplyChunks = ["[NAVIGATE:Notes] Opening Calendar."];
    world.ask.nextActions = preparedFor("calendar");
    speakUtterance(world, "Open my calendar");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.sent === 2 && s.phase === "Listening" && s.mic === "On");
    expect(shellState().trail).toEqual(["Calendar"]);
    expect(world.notes.views).toEqual([
      { path: "claim", body: binding("calendar") },
      { path: "result", body: { ...binding("calendar"), claimId: "claim-1", success: true, result: { switched: true } } },
    ]);

    // spec/app/voice/index.md, "Voice keeps talking after a navigation only when it is the one the conversation asked for; any other ends it"
    const gate = Promise.withResolvers<void>();
    world.notes.viewClaimGate = gate.promise;
    try {
      await drawnUntil(alpha, area, Conversation, (s) => s.observing && s.context.showing.tag === "App" && s.context.showing.view === "Calendar");
      world.ask.nextReplyChunks = ["Opening Notes."];
      world.ask.nextActions = preparedFor("notes");
      speakUtterance(world, "Open Notes");
      await drawn(() => vi.waitFor(() => expect(world.notes.views.at(-1)).toEqual({ path: "claim", body: binding("notes") })));
      await drawn(() => alpha.runtime.runPromise(Shell.Machine.use((machine) => machine.send({ type: "openView", view: "Notes" }))));
      await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Idle");
    } finally {
      gate.resolve();
    }
    await drawn(() => vi.waitFor(() => expect(world.notes.views.at(-1)).toEqual({
      path: "result", body: { ...binding("notes"), claimId: "claim-3", success: false, result: { switched: false } },
    })));
    expect(shellState()).toMatchObject({ trail: ["Calendar", "Notes"], assistant: "Bar" });
  });

  // spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"
  it("accepts one spoken confirmation of the entire current text review without asking the agent again", async () => {
    const world = { ...scene(), phone: true, image: true, signedIn: false };
    const operation = { type: "sms_send", recipients: ["+14155550100"], body: "Meet upstairs.\nBring the keys.", subscriptionId: 1 } as const;
    const review = textReview(world.notes.owner, "spoken-reviewed-sms", operation);
    world.telephony.textReview = review;
    world.ask.metadata = [];
    const { alpha } = await open(world, [...talkMounts, { at: "view:Messages", load: () => import("../src/messages/index.tsx") }]);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Conversation, (state) => state.ready && state.observing);
    await fill("Message Alpha", "Start this chat");
    await press("Send");
    await drawnUntil(alpha, area, Conversation, (state) => state.turn.reply === "Complete");
    await drawnUntil(alpha, area, Chats, (state) => state.chosen > 0 && state.page.status === "Loaded");
    const room = [...world.ask.kept.values()].find((one) => one.messages.some((line) => line.text === "Start this chat"));
    if (room === undefined) throw new Error("The visible chat was not saved");

    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "openView", view: "Messages" }))));
    await drawnUntil(alpha, alpha.runtime, Messages, (state) => state.front && state.sms.grant === "Granted" && state.list.status === "Loaded");
    await drawnUntil(alpha, alpha.runtime, Phone, (state) => state.telecom === "NoCall");
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "raise", detent: "Sheet" }))));
    await drawnUntil(alpha, area, Conversation, (state) => state.context.showing.tag === "App" && state.context.showing.view === "Messages");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Listening" && state.mic === "On");

    world.ask.nextReplyChunks = ["Review the text on your phone."];
    world.ask.nextActions = () => [{ action: "PROPOSE_DEVICE_ACTION", data: {
      proposalId: review.proposal.id, state: "pending", executed: false, approvalRequired: true, awaitingUserInput: true,
    } }];
    const text = "Text +14155550100 saying Meet upstairs. Bring the keys.";
    speakUtterance(world, text);
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.sent === 1 && state.reviewPending && state.phase === "Listening" && state.mic === "On");
    expect(room.messages.some((line) => line.role === "user" && line.text === text)).toBe(true);
    expect(world.ask.metadata.at(-1)).toMatchObject({ observation: { selectedObject: { kind: "sms-subscription", id: "1" } } });
    expect(button("Approve")).toBeDefined();
    expect(document.body.textContent).toContain(operation.body);
    expect([review.decisions, review.claims, world.telephony.sent]).toEqual([[], [], []]);

    const send = button("Approve");
    const card = send?.closest<HTMLElement>("[data-alpha-review]");
    const viewport = card?.closest<HTMLElement>("[role='log']");
    if (send === undefined || !card || !viewport) throw new Error("The addressed text was not drawn in the conversation");
    const bounds = new DOMRect(8, 8, 300, 92);
    const hit = vi.spyOn(document, "elementFromPoint").mockReturnValue(send);
    const cardBounds = vi.spyOn(card, "getBoundingClientRect").mockReturnValue(bounds);
    const sendBounds = vi.spyOn(send, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 58, 60, 30));
    const viewportBounds = vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 320, 120));
    try {
      speakUtterance(world, "Send this text.");
      await drawnUntil(alpha, area, Voice.Machine, (state) => state.sent === 2 && !state.reviewPending && state.phase === "Listening" && state.mic === "On");
      speakUtterance(world, "Send this text.");
      await drawnUntil(alpha, area, Voice.Machine, (state) => state.sent === 3 && state.phase === "Listening" && state.mic === "On");
    } finally {
      hit.mockRestore();
      cardBounds.mockRestore();
      sendBounds.mockRestore();
      viewportBounds.mockRestore();
    }
    expect(world.ask.said).toEqual(["Start this chat", text]);
    expect(button("Approve")).toBeUndefined();
    expect([review.decisions, review.claims, world.telephony.sent]).toEqual([
      [review.proposal.id], [review.proposal.id], [{ operationId: review.proposal.id, recipients: [...operation.recipients], body: operation.body }],
    ]);
  });

  // spec/app/files/index.md, "An explicit request to open or filter Files may act directly on the same idle Files view"
  it("runs the agent's own terminal Files action from compact Talk, and nothing for a turn that proposes none", async () => {
    const world = { ...scene(), phone: true, image: true, signedIn: false };
    world.ask.metadata = [];
    world.ask.spokenFiles = [];
    const filter = { type: "files_filter", kind: "pdf", folder: "Download" } as const;
    const review = textReview(world.notes.owner, "other-filter", filter);
    world.telephony.textReview = review;
    const { alpha } = await open(world, [...talkMounts, { at: "view:Files", load: () => import("../src/files/index.tsx") }]);
    const area = assistant.runtime(alpha);
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "openView", view: "Files" }))));
    await drawnUntil(alpha, area, Conversation, (s) => s.ready && s.observing && s.context.showing.tag === "App" && s.context.showing.view === "Files");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.warmed);
    await drawnUntil(alpha, files.runtime(alpha), Files, (s) => s.access === "Granted" && s.storage.status === "Loaded");
    await drawnUntil(alpha, alpha.runtime, Preferences, (s) => s.document.read.status === "Loaded" && !s.askFirst);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");

    const speak = async (id: string, text: string, sent: number, proposes = true) => {
      review.proposal.id = id;
      review.proposal.state = "pending";
      review.proposal.payload.requestMessageId = `m${world.ask.said.length + 1}u`;
      world.ask.nextReplyChunks = [proposes ? "There is a Files action for this turn." : "It is a quarter past two."];
      world.ask.nextActions = () => proposes ? [{ action: "PROPOSE_DEVICE_ACTION", data: {
        proposalId: id, state: "pending", executed: false, awaitingDeviceExecution: true, directRequest: true, approvalRequired: false,
      } }] : [];
      speakUtterance(world, text);
      await drawnUntil(alpha, area, Voice.Machine, (s) => s.sent === sent && s.phase === "Listening" && s.mic === "On");
    };

    await speak("no-files-request", "What time is it?", 1, false);
    expect([review.claims, world.files.calls.includes("storageQuery")]).toEqual([[], false]);
    expect(world.ask.metadata.at(-1)).toMatchObject({ voiceUi: { agentActionMode: "direct-files-only-v1" } });
    expect(world.voice.spoken.some((said) => said.text.includes("quarter past two"))).toBe(true);
    await speak("asked-filter", "only the pdfs in my downloads", 2);
    expect(review.receipts).toEqual([expect.objectContaining({ outcome: "applied", operationId: "asked-filter" })]);
    expect(world.ask.spokenFiles.at(-1)).toEqual({ channel: "VOICE_DM", images: undefined });
    expect(world.voice.spoken.some((said) => said.text.includes("Showing 1 item in Files"))).toBe(true);

    // spec/app/assistant/context.md, "A turn an agent refuses whole for a direct-request mode it does not know is sent once more without it"
    world.ask.knowsNoActionMode = true;
    const posted = world.ask.metadata.length;
    await speak("older-agent", "What time is it now?", 3, false);
    expect(world.ask.metadata.slice(posted).map((one) => (one as { voiceUi?: { agentActionMode?: string } } | undefined)?.voiceUi?.agentActionMode)).toEqual(["direct-files-only-v1", undefined]);
    expect(world.voice.spoken.filter((said) => said.text.includes("quarter past two"))).toHaveLength(2);
    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Idle");
  });

  // spec/app/voice/index.md, "An exact spoken Files request may follow its own leased navigation once"
  it("follows a named Files request from Home and leaves an unpublished ordinal there", async () => {
    const world = { ...scene(), phone: true, image: true, signedIn: false };
    world.ask.metadata = [];
    const filter = { type: "files_filter", kind: "pdf", folder: "Download" } as const;
    const review = textReview(world.notes.owner, "ordinal", { type: "files_open", shown: 1 });
    world.telephony.textReview = review;
    const { alpha } = await open(world, [...talkMounts, { at: "view:Files", load: () => import("../src/files/index.tsx") }]);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Conversation, (s) => s.ready && s.observing && s.context.showing.tag === "Home");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.warmed);
    await drawnUntil(alpha, alpha.runtime, Preferences, (s) => s.document.read.status === "Loaded" && !s.askFirst);
    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Listening" && s.mic === "On");

    const speak = async (id: string, text: string, sent: number) => {
      review.proposal.id = id;
      review.proposal.state = "pending";
      review.proposal.payload.requestMessageId = `m${world.ask.said.length + 1}u`;
      world.ask.nextReplyChunks = ["There is a Files request."];
      world.ask.nextActions = () => [{ action: "PROPOSE_DEVICE_ACTION", data: {
        proposalId: id, state: "pending", executed: false, awaitingDeviceExecution: true, directRequest: true, approvalRequired: false,
      } }];
      speakUtterance(world, text);
      await drawnUntil(alpha, area, Voice.Machine, (s) => s.sent === sent && s.phase === "Listening" && s.mic === "On");
    };

    await speak("ordinal", "Open result 1", 1);
    expect(review.claims).toEqual([]);
    expect(alpha.runtime.runSync(Shell.Machine.use((machine) => machine.get())).trail).toEqual([]);
    expect(world.ask.metadata.at(-1)).toMatchObject({ voiceUi: { agentActionMode: "direct-files-only-v1" } });

    review.proposal.payload.operation = filter;
    await speak("named-filter", "Show PDFs in Download", 2);
    expect(review.receipts).toEqual([expect.objectContaining({ outcome: "applied", operationId: "named-filter" })]);
    expect(alpha.runtime.runSync(Shell.Machine.use((machine) => machine.get()))).toMatchObject({ trail: ["Files"], assistant: "Bar" });
    expect(world.voice.spoken.some((said) => said.text.includes("Showing 1 item in Files"))).toBe(true);
    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (s) => s.phase === "Idle");
  });

  // spec/app/assistant/context.md, "A turn asked while Files shows a readable document attaches it for that turn"
  it.each([
    { text: "The shipment arrives on Wednesday", secret: false },
    { text: "Your verification code is 482913", secret: true },
  ])("attaches the open document's safe text to every spoken turn, whatever the words, and never its secret text ($secret)", async ({ text, secret }) => {
    const world = { ...scene(), phone: true, signedIn: false };
    world.ask.metadata = [];
    world.ask.spokenFiles = [];
    world.files.texts["Documents/notes.txt"] = text;
    const at = world.files.stored.findIndex((file) => file.path === "Documents/notes.txt");
    const record = world.files.stored[at];
    if (record === undefined) throw new Error("no text document");
    world.files.stored[at] = { ...record, size: text.length };
    const { alpha } = await open(world, [...talkMounts, { at: "view:Files", load: () => import("../src/files/index.tsx") }]);
    const area = assistant.runtime(alpha);
    const storage = files.runtime(alpha);
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "openView", view: "Files" }))));
    await drawnUntil(alpha, area, Conversation, (state) => state.ready && state.observing && state.context.showing.tag === "App" && state.context.showing.view === "Files");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.warmed);
    await drawnUntil(alpha, storage, Files, (state) => state.storage.status === "Loaded");
    await press("Internal storage");
    await drawnUntil(alpha, storage, Files, (state) => state.listing.status === "Loaded" && state.trail.length === 1);
    await press("Documents");
    await drawnUntil(alpha, storage, Files, (state) => state.listing.status === "Loaded" && state.trail.length === 2);
    await press("notes.txt");
    await drawnUntil(alpha, storage, FilePreview, (state) => state.content.status === "Loaded" && state.secret === secret);

    await press("Talk");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Listening" && state.mic === "On");
    const attached = { channel: "VOICE_DM", images: secret ? undefined : [{ data: btoa(text), mimeType: "text/plain", name: "notes.txt" }] };
    speakUtterance(world, "What should I do now?");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.sent === 1 && state.phase === "Listening" && state.mic === "On");
    expect(world.ask.spokenFiles?.at(-1)).toEqual(attached);
    if (!secret) expect(world.ask.metadata.at(-1)).toMatchObject({ observation: { view: "files", selectedObject: { kind: "document" } } });
    if (!secret) expect(world.ask.metadata.at(-1)).not.toMatchObject({ voiceUi: { agentActionMode: "direct-files-only-v1" } });

    speakUtterance(world, "Please summarize this file");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.sent === 2 && state.phase === "Listening");
    expect(world.ask.spokenFiles?.at(-1)).toEqual(attached);
    expect(JSON.stringify(world.ask.metadata)).not.toContain(text);
    await press("Stop voice conversation");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.phase === "Idle");
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

  // spec/app/voice/dictation.md, "Recording starts from ready, and only the answer to that start opens it"; spec/app/voice/dictation.md, "A transcript with words is shown for review; no speech, an unavailable agent or a failed recognition keeps the clip"
  it("times the admitted composer recording and keeps the confirmed clip's length through a failed transcription", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, talkMounts);
    const area = assistant.runtime(alpha);
    await drawnUntil(alpha, area, Composer, (state) => state.slot === "Open");
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (machine) => machine.send({ type: "raise", detent: "Sheet" }))));
    await drawn(() => area.runPromise(dictate()));
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Ready");

    const confirmed = Promise.withResolvers<void>();
    world.voice.recordingStartGate = () => confirmed.promise;
    const clock = () => document.querySelector('[aria-label="Voice transcription"] .tabular-nums')?.textContent;
    const marks = () => document.querySelector('[aria-label="Recording activity"]')?.children.length ?? 0;
    try {
      await press("Start recording");
      await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Starting");
      await later(alpha, 1000);
      expect([clock(), marks()]).toEqual(["0:00", 0]);
    } finally {
      confirmed.resolve();
    }

    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Recording");
    await drawn(async () => {
      const observed = area.runSync(DictationClock);
      for (let turn = 0; turn < 400 && observed.snapshot().ticket === undefined; turn += 1) await area.runPromise(Effect.yieldNow);
      expect(observed.snapshot().ticket).toBeDefined();
    });
    expect(marks()).toBe(44);
    await later(alpha, 2000);
    expect(clock()).toBe("0:02");

    world.voice.transcriptionFailures = 1;
    await press("Stop recording");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Recorded");
    expect([clock(), marks()]).toEqual(["0:59", 0]);
    await press("Record again");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Ready");
    expect([clock(), marks()]).toEqual(["0:00", 0]);
    await press("Start recording");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Recording");
    expect(area.runSync(VoiceWords).memory.dictatedDurationMs).toBeUndefined();
    await press("Discard transcription");
    await drawnUntil(alpha, area, Voice.Machine, (state) => state.recorder.stage === "Closed");
    expect(world.ask.said).toEqual([]);
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
