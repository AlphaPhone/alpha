// spec/app/maps/index.md, "Back closes one layer at a time: the choice of a start, the directions, the place, then the search"
import { Effect } from "effect";
import { Machine } from "../../gen/app__maps.effect.vibe";
import { area } from "../runtime/area.tsx";
import { Maps } from "./Maps.tsx";
import { maps } from "./maps.vibe";

/** Back inside Maps: one layer of the screen, while it has one to close. */
const back = Effect.flatMap(Machine, (screen) => Effect.match(screen.send({ type: "back" }, "Owner"), { onFailure: () => false, onSuccess: () => true }));

/** Maps, at its view (areas.ts): its machines live from its first opening until Alpha closes. */
export default area(maps, Maps, { back });
