// spec/app/maps/index.md, "Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map"; spec/app/maps/credits.md, "The credits panel opens from the badge or the information button of a drawn surface"
import { Effect } from "effect";
import { Machine } from "../../gen/app__maps.effect.vibe";
import { Machine as Credits } from "../../gen/app__maps__credits.effect.vibe";
import { area } from "../runtime/area.tsx";
import { Maps } from "./Maps.tsx";
import { maps } from "./maps.vibe";

/** Whether `sent` was taken. */
const taken = (sent: Effect.Effect<unknown, unknown>) => Effect.match(sent, { onFailure: () => false, onSuccess: () => true });

/** Back inside Maps: the credits panel while it is open, else one mode of the screen, while it has one to leave. */
const back = Effect.gen(function* () {
  const credits = yield* Credits;
  if (yield* taken(credits.send({ type: "closeInfo" }))) return true;
  const screen = yield* Machine;
  return yield* taken(screen.send({ type: "goBack" }));
});

/** Maps, at its view (areas.ts): its machines live from its first opening until Alpha closes. */
export default area(maps, Maps, { back });
