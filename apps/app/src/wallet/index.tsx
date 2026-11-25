// spec/app/wallet/transfer.md, "The send form opens when nothing else is under way, and closes without asking anything"; spec/app/wallet/index.md, "Receive opens over a wallet that serves and has an account, and closes when it no longer does"
import { Effect } from "effect";
import * as Ledger from "../../gen/app__wallet.effect.vibe";
import * as Sending from "../../gen/app__wallet__transfer.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { Wallet } from "./Wallet.tsx";
import { transfer } from "./transfer.vibe";
import { wallet } from "./wallet.vibe";

/** Back inside Wallet: the form or the review closes first, then an open address. */
const back = Effect.gen(function* () {
  const sending = yield* Sending.Machine;
  const ledger = yield* Ledger.Machine;
  const tried: ReadonlyArray<Effect.Effect<unknown, unknown>> = [sending.send({ type: "close" }), ledger.send({ type: "closeReceive" })];
  for (const step of tried) if (yield* Effect.match(step, { onFailure: () => false, onSuccess: () => true })) return true;
  return false;
});

/** Wallet, at its view (areas.ts): the wallet as the agent holds it and the transfer under way, live from its first opening until Alpha closes. */
export default area(together(wallet, transfer), Wallet, { back });
