// spec/app/home/index.md, "Back closes one layer of Home's own: an app's menu, then Add to Home, then editing; Done ends editing"
import { Effect, Layer } from "effect";
import * as Home from "../../gen/app__home.effect.vibe";
import type { Machine as CardsMachine } from "../../gen/app__home__cards.effect.vibe";
import { area } from "../runtime/area.tsx";
import { HomePage } from "./Home.tsx";
import { cards } from "./cards.vibe";
import { home } from "./home.vibe";

/** The machines of Home's area: Home itself and the cards. */
export type HomeMachines = Home.Machine | CardsMachine;

/** Back on Home: an app's menu, then Add to Home, then editing, before the shell's own. */
const back = Home.Machine.use((machine) => Effect.flatMap(machine.get(), (state) => (Home.canBackOut(state) ? Effect.as(Effect.orElseSucceed(machine.send({ type: "backOut" }, "Owner"), () => undefined), true) : Effect.succeed(false))));

/** Home, the launcher: drawn with the first paint. */
export default area(Layer.mergeAll(home, cards), HomePage, { back });
