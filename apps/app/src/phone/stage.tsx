import { Layer } from "effect";
import { area, type Resident, type Shown } from "../runtime/ui.tsx";
import { CallStrip } from "./CallStrip.tsx";

function StageCall({ runtime }: Shown<Resident>) {
  return <CallStrip runtime={runtime} stage />;
}

export default area(Layer.empty, StageCall);
