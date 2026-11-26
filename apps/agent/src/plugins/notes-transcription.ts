// spec/agent/index.md, "The local browser can request a private transcription of a reviewed note"
import { encodeMonoPcm16WavChunks } from "@elizaos/agent";
import type { ModuleContext } from "@elizaos/agent-host";
import { Effect, Option, Schema } from "effect";
import type { AgentRoute } from "./types.ts";

const path = "/api/alpha/notes/transcription";
const sampleRate = 16_000;
const maxSamples = 25 * sampleRate;
const bodyLimit = 1_100_000;
const decode = Schema.decodeUnknownOption(Schema.Struct({
  pcm: Schema.Uint8ArrayFromBase64.check(Schema.isMinLength(2), Schema.isMaxLength(maxSamples * 2)),
}), { onExcessProperty: "error" });

/** A separate local-browser capability keeps the native voice stream and its events out of Notes. */
export function notesTranscriptionRoutes(
  context: ModuleContext,
  provider: string,
  ready: (signal: AbortSignal) => Promise<boolean>,
): readonly AgentRoute[] {
  const { account, environment } = context.launch;
  if (account === undefined || environment?.ALPHA_LOCAL_SPEECH_SOCKET !== undefined) return [];
  const { runtime } = context;
  const registered = () => {
    const models = runtime.getModelRegistrations().filter((model) => model.modelType === "TRANSCRIPTION" && model.provider === provider);
    return models.length > 0 && models.every((model) => model.metadata?.local === true);
  };
  const available = async (signal: AbortSignal) =>
    !signal.aborted && registered() && await ready(signal).catch(() => false) && !signal.aborted && registered();
  let busy = false;
  return [
    { method: "GET", path, async handler({ signal }) { return { status: 200, body: { local: await available(signal) } }; } },
    { method: "POST", path, maxBodyBytes: bodyLimit, async handler({ body, signal }) {
      if (busy) return { status: 429, body: { error: "LOCAL_TRANSCRIPTION_BUSY" } };
      const found = decode(body);
      if (Option.isNone(found) || found.value.pcm.byteLength % 2 !== 0 || signal.aborted) {
        return { status: 400, body: { error: "INVALID_NOTE_AUDIO" } };
      }
      const pcm = found.value.pcm;
      const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      const frames = new Float32Array(pcm.byteLength / 2);
      for (let index = 0; index < frames.length; index++) frames[index] = view.getInt16(index * 2, true) / 32_768;
      busy = true;
      try {
        if (!(await available(signal))) return { status: 503, body: { error: "LOCAL_TRANSCRIPTION_UNAVAILABLE" } };
        const audio = await Effect.runPromise(encodeMonoPcm16WavChunks([frames], sampleRate), { signal });
        if (signal.aborted || !registered()) return { status: 503, body: { error: "LOCAL_TRANSCRIPTION_UNAVAILABLE" } };
        const answer = await runtime.useModel("TRANSCRIPTION", {
          audioUrl: "", audio, mimeType: "audio/wav", signal, transcriptionPurpose: "final",
        }, provider);
        const text = typeof answer === "string" ? answer.trim() : "";
        if (signal.aborted || !registered() || typeof answer !== "string" || text.length > 8_000) {
          return { status: 503, body: { error: "LOCAL_TRANSCRIPTION_UNCONFIRMED" } };
        }
        return { status: 200, body: { text, local: true } };
      } catch {
        return { status: 503, body: { error: "LOCAL_TRANSCRIPTION_UNAVAILABLE" } };
      } finally {
        busy = false;
      }
    } },
  ];
}
