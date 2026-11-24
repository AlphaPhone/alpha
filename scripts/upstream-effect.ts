import {Effect, Layer} from 'effect';
import {FetchHttpClient} from 'effect/unstable/http';
import * as NodeServices from '@effect/platform-node/NodeServices';

type Program<A> = Effect.Effect<A, unknown, never> | Effect.Effect<A, unknown, unknown>;

const platform = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

/** Run one upstream Effect program with the Node platform services and an HTTP client. */
export function run<A>(program: Program<A>): Promise<A> {
  return Effect.runPromise(Effect.provide(program as Effect.Effect<A, unknown, NodeServices.NodeServices>, platform) as Effect.Effect<A, unknown, never>);
}
