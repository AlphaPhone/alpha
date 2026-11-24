import {Effect} from 'effect';
import * as NodeServices from '@effect/platform-node/NodeServices';

type Program<A> = Effect.Effect<A, unknown, never> | Effect.Effect<A, unknown, unknown>;

/** Run one upstream Effect program with the Node platform services. */
export function run<A>(program: Program<A>): Promise<A> {
  return Effect.runPromise(Effect.provide(program as Effect.Effect<A, unknown, NodeServices.NodeServices>, NodeServices.layer) as Effect.Effect<A, unknown, never>);
}
