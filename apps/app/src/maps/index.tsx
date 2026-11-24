// spec/app/maps/index.md, "Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map"
import { Effect } from "effect";
import { Machine } from "../../gen/app__maps.effect.vibe";
import { area } from "../runtime/area.tsx";
import { Maps } from "./Maps.tsx";
import { maps } from "./maps.vibe";

/** Back inside Maps: one mode of the screen, while it has one to leave. */
const back = Effect.flatMap(Machine, (screen) => Effect.match(screen.send({ type: "goBack" }), { onFailure: () => false, onSuccess: () => true }));

/** Maps, at its view (areas.ts): its machines live from its first opening until Alpha closes. */
export default area(maps, Maps, { back });
