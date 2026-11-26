// spec/app/voice/index.md, "What voice asks the phone and the voice service to do"; spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "A page served by Alpha's development server talks through that server's own Cloud speech relay, and a page that names none offers no Talk"
import type { CloudSpeechListenerHandle, CloudSpeechStarted, CloudStreamEvent, CloudStreamPort, SpeechSessionId } from "@elizaos/os-bridges";
import { relaysPageSpeech } from "../../gen/app__voice.ts";

const RATE = 16_000;
const FRAME_BYTES = 3_200;
const PHRASE = 1_024;
const identity = /^[A-Za-z0-9_-]{1,64}$/;
const speechPath = "/api/v1/voice/speech";

type Listener = (event: CloudStreamEvent) => void;

interface Utterance {
  started: boolean;
  complete: boolean;
  playing: number;
  readonly sources: Set<AudioBufferSourceNode>;
}

interface Live {
  readonly sessionId: SpeechSessionId;
  readonly socket: WebSocket;
  readonly microphone: MediaStream;
  readonly capture: AudioContext;
  readonly output: AudioContext;
  readonly gain: GainNode;
  readonly utterances: Map<string, Utterance>;
  readonly serverId: string;
  muted: boolean;
  turn: boolean;
  heard: string;
  playhead: number;
  pending: Uint8Array;
  ended: boolean;
}

interface Minted {
  readonly version: number;
  readonly sessionId: string;
  readonly token: string;
}

/** The server's own /cloud relay, which the dev server names in the page's head; undefined where it names none or any other path. @throws {never} */
export function pageSpeechBase(): string | undefined {
  if (typeof document === "undefined" || typeof navigator === "undefined" || navigator.mediaDevices?.getUserMedia === undefined) return undefined;
  const named = document.querySelector<HTMLMetaElement>('meta[name="alpha-cloud-speech"]')?.content ?? "";
  return relaysPageSpeech(named) ? named : undefined;
}

/** The page's microphone permission, or prompt where the browser cannot say. */
export async function pageMicrophone(request: boolean): Promise<"granted" | "denied" | "prompt"> {
  if (request) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => undefined);
    for (const track of stream?.getTracks() ?? []) track.stop();
    return stream === undefined ? "denied" : "granted";
  }
  const status = await navigator.permissions?.query({ name: "microphone" as PermissionName }).catch(() => undefined);
  return status?.state ?? "prompt";
}

function int16(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, Number.isNaN(samples[i]) ? 0 : samples[i] ?? 0));
    view.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.round(value < 0 ? value * 0x8000 : value * 0x7fff))), true);
  }
  return out;
}

function floats(bytes: Uint8Array): Float32Array<ArrayBuffer> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength >> 1);
  for (let i = 0; i < out.length; i += 1) {
    const value = view.getInt16(i * 2, true);
    out[i] = value < 0 ? value / 0x8000 : value / 0x7fff;
  }
  return out;
}

function resampled(samples: Float32Array, from: number): Float32Array {
  if (from === RATE) return samples;
  const ratio = from / RATE;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += samples[j] ?? 0;
    out[i] = sum / (end - start);
  }
  return out;
}

function phrases(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + PHRASE);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end - 1);
      if (space < start) throw new Error("Speech word is too long");
      end = space + 1;
    }
    const part = text.slice(start, end);
    if (part.trim() !== "") parts.push(part);
    start = end;
  }
  return parts;
}

function joined(head: Uint8Array, tail: Uint8Array): Uint8Array {
  const out = new Uint8Array(head.length + tail.length);
  out.set(head);
  out.set(tail, head.length);
  return out;
}

/**
 * eliza's Cloud speech relay for a page, by the wire `CloudSpeechWire.java` speaks for the phone: consent and a minted
 * session at the page's own Cloud, whose server adds the account's key, then the relay socket with the browser's
 * microphone sent as 16 kHz PCM16 and each reply played as it arrives. The page holds no credential.
 * @throws {never}
 */
export function pageSpeechRelay(base: string): CloudStreamPort {
  const listeners = new Set<Listener>();
  let live: Live | undefined;

  const emit = (session: SpeechSessionId, event: Omit<CloudStreamEvent, "sessionId">) => {
    for (const listener of listeners) listener({ ...event, sessionId: session });
  };

  const post = async (route: string, body: unknown) => {
    const answer = await fetch(`${base}${speechPath}/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!answer.ok) throw Object.assign(new Error(`voice-http-${answer.status}`), { code: `voice-http-${answer.status}` });
    return { body: await answer.json() as Record<string, unknown>, extend: answer.headers.get("X-Eliza-Speech-Extend") === "1" };
  };

  const settle = (own: Live, id: string, utterance: Utterance) => {
    if (!utterance.complete || utterance.playing > 0 || own.utterances.get(id) !== utterance) return;
    own.utterances.delete(id);
    emit(own.sessionId, { type: "audio-end", utteranceId: id });
  };

  const play = (own: Live, frame: Uint8Array) => {
    const size = frame[1] ?? 0;
    const id = new TextDecoder().decode(frame.subarray(2, 2 + size));
    const utterance = own.utterances.get(id);
    const pcm = frame.subarray(2 + size);
    if (frame[0] !== 1 || utterance === undefined || pcm.byteLength < 2) return;
    const samples = floats(pcm);
    const buffer = own.output.createBuffer(1, samples.length, RATE);
    buffer.copyToChannel(samples, 0);
    const source = own.output.createBufferSource();
    source.buffer = buffer;
    source.connect(own.gain);
    const at = Math.max(own.playhead, own.output.currentTime + 0.02);
    own.playhead = at + buffer.duration;
    utterance.playing += 1;
    utterance.sources.add(source);
    source.onended = () => {
      utterance.sources.delete(source);
      utterance.playing -= 1;
      settle(own, id, utterance);
    };
    source.start(at);
    if (!utterance.started) {
      utterance.started = true;
      emit(own.sessionId, { type: "audio-start", utteranceId: id });
    }
  };

  const heard = (own: Live, type: string, transcript: string) => {
    if (type === "start-of-turn" && !own.turn) {
      own.turn = true;
      own.heard = "";
      emit(own.sessionId, { type: "speech-start" });
    } else if ((type === "transcript-update" || type === "eager-end-of-turn") && own.turn && transcript !== own.heard) {
      own.heard = transcript;
      emit(own.sessionId, { type: "transcript", text: transcript, final: false });
    } else if (type === "end-of-turn") {
      if (!own.turn) emit(own.sessionId, { type: "speech-start" });
      own.turn = false;
      own.heard = "";
      emit(own.sessionId, { type: "speech-end", text: transcript, final: true });
    }
  };

  const close = (own: Live, code?: string) => {
    if (own.ended) return;
    own.ended = true;
    if (live === own) live = undefined;
    for (const utterance of own.utterances.values()) for (const source of utterance.sources) source.stop();
    own.utterances.clear();
    for (const track of own.microphone.getTracks()) track.stop();
    if (own.socket.readyState === WebSocket.OPEN || own.socket.readyState === WebSocket.CONNECTING) own.socket.close(1000);
    void own.capture.close().catch(() => undefined);
    void own.output.close().catch(() => undefined);
    void fetch(`${base}${speechPath}/session/${encodeURIComponent(own.serverId)}/revoke`, { method: "POST" }).catch(() => undefined);
    if (code !== undefined) emit(own.sessionId, { type: "error", code });
  };

  const received = (own: Live, data: unknown) => {
    if (own.ended) return;
    if (data instanceof ArrayBuffer) return play(own, new Uint8Array(data));
    const frame = JSON.parse(String(data)) as { t?: string; id?: string; code?: string; event?: { type?: string; transcript?: string } };
    if (frame.t === "stt") return heard(own, frame.event?.type ?? "", frame.event?.transcript ?? "");
    if (frame.t === "complete" && frame.id !== undefined) {
      const utterance = own.utterances.get(frame.id);
      if (utterance === undefined) return;
      utterance.complete = true;
      return settle(own, frame.id, utterance);
    }
    if (frame.t === "error") close(own, frame.code ?? "protocol");
  };

  const uplink = async (own: Live) => {
    await own.capture.audioWorklet.addModule("/voice/uplink-worklet.js");
    const source = own.capture.createMediaStreamSource(own.microphone);
    const node = new AudioWorkletNode(own.capture, "eliza-voice-session-uplink");
    node.port.onmessage = (message: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
      if (own.ended || own.socket.readyState !== WebSocket.OPEN) return;
      const samples = resampled(message.data.pcm, message.data.sampleRate);
      own.pending = joined(own.pending, int16(own.muted ? new Float32Array(samples.length) : samples));
      while (own.pending.length >= FRAME_BYTES) {
        own.socket.send(own.pending.slice(0, FRAME_BYTES));
        own.pending = own.pending.slice(FRAME_BYTES);
      }
    };
    source.connect(node);
  };

  const opened = (socket: WebSocket, hello: string) => new Promise<void>((resolve, reject) => {
    const ready = (message: MessageEvent) => {
      if (typeof message.data !== "string") return;
      const frame = JSON.parse(message.data) as { t?: string; version?: number; sampleRate?: number; channels?: number; code?: string };
      socket.removeEventListener("message", ready);
      if (frame.t === "ready" && frame.version === 1 && frame.sampleRate === RATE && frame.channels === 1) resolve();
      else reject(Object.assign(new Error("Cloud speech refused the session"), { code: frame.code ?? "protocol" }));
    };
    socket.addEventListener("message", ready);
    socket.addEventListener("open", () => socket.send(hello), { once: true });
    socket.addEventListener("close", () => reject(Object.assign(new Error("Cloud speech closed"), { code: "connection-lost" })), { once: true });
  });

  return {
    async startCloudSpeech({ sessionId, muted }): Promise<CloudSpeechStarted> {
      if (live !== undefined) close(live);
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      try {
        const consent = await post("consent", {});
        const minted = await post("session", { consentNonce: consent.body.consentNonce });
        const session = minted.body as unknown as Minted;
        if (session.version !== 1 || typeof session.token !== "string" || typeof session.sessionId !== "string" || !identity.test(session.sessionId)) {
          throw Object.assign(new Error("Cloud speech minted no session"), { code: "connect" });
        }
        const socket = new WebSocket(`${location.origin.replace(/^http/, "ws")}${base}${speechPath}/ws?sessionId=${encodeURIComponent(session.sessionId)}`);
        socket.binaryType = "arraybuffer";
        const capture = new AudioContext();
        const output = new AudioContext();
        const gain = output.createGain();
        gain.connect(output.destination);
        const own: Live = {
          sessionId, socket, microphone, capture, output, gain, utterances: new Map(), serverId: session.sessionId,
          muted: muted === true, turn: false, heard: "", playhead: 0, pending: new Uint8Array(0), ended: false,
        };
        live = own;
        try {
          await opened(socket, JSON.stringify({ t: "hello", token: session.token, errorReasons: true, ...(minted.extend ? { extend: true } : {}) }));
          socket.addEventListener("message", (message: MessageEvent) => received(own, message.data));
          socket.addEventListener("close", () => close(own, "connection-lost"));
          await uplink(own);
          await output.resume();
        } catch (failure) {
          close(own);
          throw failure;
        }
        if (own.ended) throw Object.assign(new Error("Cloud speech stopped"), { code: "session-changed" });
        return { sessionId, sampleRate: RATE, echoCancelled: microphone.getAudioTracks()[0]?.getSettings().echoCancellation === true };
      } catch (failure) {
        for (const track of microphone.getTracks()) track.stop();
        throw failure;
      }
    },
    async stopCloudSpeech({ sessionId }) {
      if (live?.sessionId === sessionId) close(live);
    },
    async setCloudSpeechOutputMuted({ sessionId, muted }) {
      if (live?.sessionId === sessionId) live.gain.gain.value = muted ? 0 : 1;
    },
    async setCloudSpeechMuted({ sessionId, muted }) {
      if (live?.sessionId === sessionId) live.muted = muted;
    },
    async speakCloudSpeech({ sessionId, utteranceId, text }) {
      const own = live;
      if (own?.sessionId !== sessionId || own.ended) throw Object.assign(new Error("Cloud speech is not connected"), { code: "not-connected" });
      if (!identity.test(utteranceId)) throw new Error("Invalid speech identity");
      own.utterances.set(utteranceId, { started: false, complete: false, playing: 0, sources: new Set() });
      for (const phrase of phrases(text)) own.socket.send(JSON.stringify({ t: "tts", id: utteranceId, text: phrase, flush: true }));
      own.socket.send(JSON.stringify({ t: "finish", id: utteranceId }));
    },
    async cancelCloudSpeech({ sessionId, utteranceId }) {
      const own = live;
      if (own?.sessionId !== sessionId) return;
      const utterance = own.utterances.get(utteranceId);
      own.utterances.delete(utteranceId);
      for (const source of utterance?.sources ?? []) source.stop();
      own.playhead = 0;
      if (own.socket.readyState === WebSocket.OPEN) own.socket.send(JSON.stringify({ t: "cancel", id: utteranceId }));
    },
    async addListener(_event, callback): Promise<CloudSpeechListenerHandle> {
      listeners.add(callback);
      return { remove: async () => { listeners.delete(callback); } };
    },
  };
}
