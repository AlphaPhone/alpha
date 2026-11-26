// Android inference socket client for the mobile resident agent bundle.
// Matches @elizaos/os's inference socket wire protocol without importing the @elizaos/os root barrel
// (whose browser component performs a top-level readFile("../upstream.json") unsuitable for agent.mjs).
import { Buffer } from 'node:buffer';
import { connect } from 'node:net';
import { Effect, Option, Schema } from 'effect';
import {
  EngineFailed,
  EngineUnavailable,
  type Capability,
  type EndOfTurnScore,
  type InferenceEngine,
  type InstalledModel,
  type Pcm,
} from '@elizaos/plugin-local-inference';

const END_OF_TURN_COMMIT_MILLI = 500;
const POOLING: Readonly<Record<'MeanPooling' | 'ClsPooling' | 'LastTokenPooling', number>> = {
  MeanPooling: 1,
  ClsPooling: 2,
  LastTokenPooling: 3,
};

const Refused = Schema.Struct({ ok: Schema.Literal(false), code: Schema.String, error: Schema.String });
const Done = Schema.Struct({ ok: Schema.Literal(true) });
const Ready = Schema.Struct({ ok: Schema.Literal(true), synthesis: Schema.Boolean, transcription: Schema.Boolean });
const Vector = Schema.Struct({ ok: Schema.Literal(true), embedding: Schema.Array(Schema.Number) });
const Speech = Schema.Struct({ ok: Schema.Literal(true), sampleRate: Schema.Number, pcmBase64: Schema.String });
const Transcript = Schema.Struct({ ok: Schema.Literal(true), text: Schema.String });
const Score = Schema.Union([
  Schema.Struct({ ok: Schema.Literal(true), available: Schema.Literal(true), milli: Schema.Number }),
  Schema.Struct({ ok: Schema.Literal(true), available: Schema.Literal(false), reason: Schema.String }),
]);

class HostUnreachable extends Error {}

function socketPath(name: string): string {
  return name.startsWith('/') ? name : `\0${name}`;
}

function exchange(socket: string, request: object, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('Inference request was cancelled', { cause: signal.reason }));
      return;
    }
    if (!socket) {
      reject(new HostUnreachable('inference socket is not configured'));
      return;
    }
    const body = Buffer.from(JSON.stringify(request), 'utf8');
    const head = Buffer.alloc(4);
    head.writeInt32BE(body.length);
    const connection = connect({ path: socketPath(socket) });
    const parts: Buffer[] = [];
    let received = 0;
    let settled = false;
    const done = (fail: Error | undefined, value?: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      connection.destroy();
      if (fail === undefined) resolve(value);
      else reject(fail);
    };
    const abort = () => done(signal?.reason instanceof Error ? signal.reason : new HostUnreachable('cancelled'));
    signal?.addEventListener('abort', abort, { once: true });
    connection.on('connect', () => connection.write(Buffer.concat([head, body])));
    connection.on('data', (chunk: Buffer) => {
      parts.push(chunk);
      received += chunk.length;
      const all = Buffer.concat(parts, received);
      if (all.length < 4) return;
      const length = all.readInt32BE(0);
      if (length <= 0) return done(new HostUnreachable('the host answered an empty frame'));
      if (all.length < 4 + length) return;
      try {
        done(undefined, JSON.parse(all.subarray(4, 4 + length).toString('utf8')));
      } catch {
        done(new HostUnreachable('the host answered a frame that is not JSON'));
      }
    });
    connection.on('error', (error) => done(new HostUnreachable(error.message)));
    connection.on('close', () => done(new HostUnreachable('the host closed the connection without an answer')));
  });
}

function floatsToBase64(samples: Float32Array): string {
  const bytes = Buffer.alloc(samples.length * 4);
  samples.forEach((sample, index) => bytes.writeFloatLE(sample, index * 4));
  return bytes.toString('base64');
}

function floatsFromBase64(text: string): Float32Array | undefined {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return undefined;
  const bytes = Buffer.from(text, 'base64');
  if (bytes.length === 0 || bytes.length % 4 !== 0) return undefined;
  const samples = new Float32Array(bytes.length / 4);
  for (let index = 0; index < samples.length; index++) samples[index] = bytes.readFloatLE(index * 4);
  return samples;
}

function ask<A>(
  socket: string,
  capability: Capability,
  request: object,
  shape: Schema.Top & { readonly Type: A },
): Effect.Effect<A, EngineUnavailable | EngineFailed> {
  return Effect.flatMap(
    Effect.tryPromise({
      try: (signal) => exchange(socket, request, signal),
      catch: (cause) =>
        new EngineUnavailable({
          capability,
          reason: cause instanceof HostUnreachable ? `the inference host is not reachable: ${cause.message}` : 'the inference host is not reachable',
        }),
    }),
    (raw) => {
      const refused = Schema.decodeUnknownOption(Refused)(raw);
      if (Option.isSome(refused)) {
        const { code, error } = refused.value;
        return Effect.fail(
          code === 'UNAVAILABLE'
            ? new EngineUnavailable({ capability, reason: error })
            : new EngineFailed({ capability, reason: `${code}: ${error}` }),
        );
      }
      return Effect.mapError(
        Schema.decodeUnknownEffect(shape as unknown as Schema.Codec<A, unknown>)(raw),
        () => new EngineFailed({ capability, reason: 'the inference host answered out of shape' }),
      );
    },
  );
}

function embeddingRequest(model: InstalledModel) {
  const space = model.model.embedding?.space;
  const file = model.files.find((one) => one.endsWith('.gguf'));
  if (space === undefined || file === undefined) {
    return Effect.fail(new EngineUnavailable({ capability: 'embedding', reason: `${model.model.name} is not an embedding model` }));
  }
  const source = model.model.source;
  const pinned = source.kind === 'pinned' ? source.files.find((one) => file === one.path || file.endsWith(`/${one.path}`)) : undefined;
  if (pinned === undefined) {
    return Effect.fail(new EngineUnavailable({ capability: 'embedding', reason: `${model.model.name} has no pinned digest` }));
  }
  return Effect.succeed({
    space,
    request: { file, sha256: pinned.sha256, dimensions: space.dimensions, pooling: POOLING[space.pooling] },
  });
}

function scored(reply: typeof Score.Type): EndOfTurnScore {
  if (!reply.available) return { available: false, reason: reply.reason };
  if (!Number.isSafeInteger(reply.milli) || reply.milli < 0 || reply.milli > 1000) {
    return { available: false, reason: 'the inference host answered no probability' };
  }
  return { available: true, complete: reply.milli >= END_OF_TURN_COMMIT_MILLI, probability: reply.milli / 1000 };
}

/**
 * Inference engine speaking Alpha's Android app-process inference socket protocol.
 * @throws {never}
 */
export function androidInferenceEngine(socket: string): InferenceEngine.Shape {
  return {
    load: (model) =>
      Effect.mapError(
        Effect.asVoid(ask(socket, 'text', { op: 'load', bundleDir: model.directory, files: model.files }, Done)),
        (failure) => new EngineFailed({ capability: failure.capability, reason: failure.reason }),
      ),
    unload: () => Effect.catch(Effect.asVoid(ask(socket, 'text', { op: 'unload' }, Done)), () => Effect.void),
    warmEmbedding: (model) =>
      Effect.flatMap(embeddingRequest(model), ({ request }) =>
        Effect.asVoid(ask(socket, 'embedding', { op: 'warmEmbedding', ...request }, Done)),
      ),
    embed: (model, text) =>
      Effect.flatMap(embeddingRequest(model), ({ space, request }) =>
        Effect.map(ask(socket, 'embedding', { op: 'embed', ...request, text }, Vector), (reply) => ({
          values: reply.embedding,
          space,
        })),
      ),
    speechReady: () =>
      Effect.catch(
        Effect.map(ask(socket, 'synthesis', { op: 'capabilities' }, Ready), (reply) => ({
          synthesis: reply.synthesis,
          transcription: reply.transcription,
        })),
        () => Effect.succeed({ synthesis: false, transcription: false }),
      ),
    synthesize: (text) =>
      Effect.flatMap(ask(socket, 'synthesis', { op: 'synthesize', text }, Speech), (reply) => {
        const samples = floatsFromBase64(reply.pcmBase64);
        if (samples === undefined || !Number.isSafeInteger(reply.sampleRate) || reply.sampleRate <= 0) {
          return Effect.fail(new EngineFailed({ capability: 'synthesis', reason: 'the inference host answered no audio' }));
        }
        return Effect.succeed({ sampleRate: reply.sampleRate, samples });
      }),
    transcribe: (audio: Pcm) =>
      Effect.map(
        ask(socket, 'transcription', { op: 'transcribe', sampleRate: audio.sampleRate, pcmBase64: floatsToBase64(audio.samples) }, Transcript),
        (reply) => reply.text,
      ),
    scoreEndOfTurn: (transcript) =>
      Effect.catch(Effect.map(ask(socket, 'endOfTurn', { op: 'endOfTurn', transcript }, Score), scored), (failure) =>
        Effect.succeed<EndOfTurnScore>({ available: false, reason: failure.reason }),
      ),
  };
}
