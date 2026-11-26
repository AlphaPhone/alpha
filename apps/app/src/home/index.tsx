// spec/app/home/index.md, "Back closes one layer of Home's own: Add to Home, then editing; Done ends editing"
import type { Machine as HomeMachine } from "../../gen/app__home.effect.vibe";
import type { Machine as DrawerMachine } from "../../gen/app__home__drawer.effect.vibe";
import type { Machine as CardsMachine } from "../../gen/app__home__cards.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { HomePage } from "./Home.tsx";
import { cards } from "./cards.vibe";
import { backHome, finishHomeEditing, home } from "./home.vibe";

/** The machines of Home's area: Home itself and the cards. */
export type HomeMachines = HomeMachine | CardsMachine | DrawerMachine;

const launcher = area(together(home, cards), HomePage, { back: backHome() });

/** Home, the launcher: drawn with the first paint. */
export default {
  ...launcher,
  open(...[alpha, place]: Parameters<typeof launcher.open>) {
    alpha.taking("home/finished", () => launcher.runtime(alpha).runPromise(finishHomeEditing()));
    return launcher.open(alpha, place);
  },
};
