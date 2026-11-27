// @vitest-environment happy-dom
// spec/app/voice/index.md, "When the owner finishes speaking, the microphone closes, and only then is the turn sent, once and automatically"; spec/app/voice/index.md, "A page served by Alpha's development server talks through that server's own Cloud speech relay, and a page that names none offers no Talk"
import { Effect, Fiber, ManagedRuntime, Stream } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_TURN_GAP_MS } from "../src/platform/turnGap.ts";
import { browserVoiceBridge, type VoiceEvent, VoiceBridge } from "../src/platform/voice.vibe";

/** The relay socket of the page's own server, as the browser opens it: ready on hello, and the relay's turn events the test sends. */
class RelaySocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static last: RelaySocket | undefined;
  readyState = RelaySocket.CONNECTING;
  binaryType = "blob";
  /** @throws {never} */
  constructor(readonly url: string) {
    super();
    RelaySocket.last = this;
    void Promise.resolve().then(() => {
      this.readyState = RelaySocket.OPEN;
      this.dispatchEvent(new Event("open"));
    });
  }
  /** @throws {never} */
  send(data: unknown) {
    if (typeof data === "string" && (JSON.parse(data) as { t?: string }).t === "hello") void Promise.resolve().then(() => this.frame({ t: "ready", version: 1, sampleRate: 16000, channels: 1 }));
  }
  /** @throws {never} */
  frame(frame: unknown) {
    this.dispatchEvent(Object.assign(new Event("message"), { data: JSON.stringify(frame) }));
  }
  /** @throws {never} */
  close() {
    this.readyState = 3;
  }
}

/** The browser's audio graph, which the page's relay only wires and never reads back here. */
class PageAudio {
  readonly audioWorklet = { addModule: () => Promise.resolve() };
  readonly destination = {};
  readonly currentTime = 0;
  /** @throws {never} */
  createMediaStreamSource() { return { connect: () => undefined }; }
  /** @throws {never} */
  createGain() { return { gain: { value: 1 }, connect: () => undefined }; }
  /** @throws {never} */
  resume() { return Promise.resolve(); }
  /** @throws {never} */
  close() { return Promise.resolve(); }
}

/** The uplink worklet the page's relay feeds the microphone through. */
class PageUplink {
  readonly port = { onmessage: null };
}

const track = { stop: () => undefined, getSettings: () => ({ echoCancellation: true }) };
const devices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

beforeEach(() => {
  document.head.append(Object.assign(document.createElement("meta"), { name: "alpha-cloud-speech", content: "/cloud" }));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => Promise.resolve({ getTracks: () => [track], getAudioTracks: () => [track] }) } });
  vi.stubGlobal("WebSocket", RelaySocket);
  vi.stubGlobal("AudioContext", PageAudio);
  vi.stubGlobal("AudioWorkletNode", PageUplink);
  vi.stubGlobal("fetch", (url: string) => Promise.resolve(Response.json(
    url.endsWith("/consent") ? { consentNonce: "nonce-1" } : url.endsWith("/session") ? { version: 1, sessionId: "relay-1", token: "token-1" } : {},
  )));
});

const opened: Array<ManagedRuntime.ManagedRuntime<VoiceBridge, never>> = [];
afterEach(async () => {
  for (const runtime of opened.splice(0)) await runtime.dispose();
  vi.unstubAllGlobals();
  RelaySocket.last = undefined;
  document.head.querySelectorAll('meta[name="alpha-cloud-speech"]').forEach((meta) => meta.remove());
  if (devices) Object.defineProperty(navigator, "mediaDevices", devices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
});

const pause = (ms: number) => Effect.runPromise(Effect.sleep(ms));

/** The relay's turn events for what the owner says, on the socket the page opened. */
const relay = {
  speechStarts: () => RelaySocket.last?.frame({ t: "stt", event: { type: "start-of-turn" } }),
  speechEnds: (transcript: string) => RelaySocket.last?.frame({ t: "stt", event: { type: "end-of-turn", transcript } }),
};

/** The page's voice bridge over its own relay, and every turn it sends from now on. */
async function pageBridge() {
  const runtime = ManagedRuntime.make(browserVoiceBridge);
  opened.push(runtime);
  const events: VoiceEvent[] = [];
  const bridge = await runtime.runPromise(Effect.map(VoiceBridge, (service) => service));
  const fiber = runtime.runFork(Stream.runForEach(bridge.events, (event) => Effect.sync(() => void events.push(event))));
  await pause(0);
  const run = <A>(work: Effect.Effect<A, unknown, unknown>) => runtime.runPromise(work as Effect.Effect<A>);
  return {
    sent: () => events.flatMap((event) => event.kind === "speechEnd" ? [event.text] : []),
    openMic: (session: number) => run(bridge.openMic(session, true)),
    closeMic: (session: number) => run(bridge.closeMic(session)),
    stop: async () => {
      await run(bridge.shut(1));
      await runtime.runPromise(Fiber.interrupt(fiber));
    },
  };
}

describe("Talk in a page over its own relay (spec/app/voice/index.md, \"Story: Hold a spoken conversation\")", () => {
  it("Mute within the gap shuts the page's microphone and still sends the finished sentence once when the gap ends, as v119 did", async () => {
    const page = await pageBridge();
    await page.openMic(1);
    const asked = "What is on my calendar tomorrow?";
    relay.speechStarts();
    relay.speechEnds(asked);
    await pause(100);
    // spec/app/voice/index.md, "When the owner finishes speaking, the microphone closes, and only then is the turn sent, once and automatically": v119's setMuted closed the capture, then still sent the utterance at its long gap (voice-assistant-session.ts:596-611).
    await page.closeMic(1);
    expect(page.sent()).toEqual([]);
    await pause(CLOUD_TURN_GAP_MS);
    expect(page.sent()).toEqual([asked]);
    await pause(CLOUD_TURN_GAP_MS);
    expect(page.sent()).toEqual([asked]);
    await page.stop();
  });

  it("Mute and then Unmute within the gap keep the page's finished sentence, and it is sent once when the gap ends, as v119 did", async () => {
    const page = await pageBridge();
    await page.openMic(1);
    const asked = "What is on my calendar tomorrow?";
    relay.speechStarts();
    relay.speechEnds(asked);
    await pause(100);
    await page.closeMic(1);
    await pause(50);
    // spec/app/voice/index.md, "When the owner finishes speaking, the microphone closes, and only then is the turn sent, once and automatically": v119 kept the utterance and its timer across the capture Unmute opened (voice-assistant-session.ts:612-622 and 722-735).
    await page.openMic(1);
    expect(page.sent()).toEqual([]);
    await pause(CLOUD_TURN_GAP_MS);
    expect(page.sent()).toEqual([asked]);
    await pause(CLOUD_TURN_GAP_MS);
    expect(page.sent()).toEqual([asked]);
    await page.stop();
  });

  it("Mute pressed while the owner is still speaking keeps what the page heard, and sends it once when the gap after its final ends, as v119 did", async () => {
    const page = await pageBridge();
    await page.openMic(1);
    const asked = "What is on my calendar tomorrow?";
    relay.speechStarts();
    await pause(50);
    // spec/app/voice/index.md, "When the owner finishes speaking, the microphone closes, and only then is the turn sent, once and automatically": v119's Mute finalized the speech up to then and sent it (voice-assistant-session.ts:593-611); the relay gives its final as the microphone shuts.
    const closing = page.closeMic(1);
    await pause(0);
    relay.speechEnds(asked);
    await closing;
    expect(page.sent()).toEqual([]);
    await pause(CLOUD_TURN_GAP_MS + 50);
    expect(page.sent()).toEqual([asked]);
    await pause(CLOUD_TURN_GAP_MS);
    expect(page.sent()).toEqual([asked]);
    await page.stop();
  });
});
