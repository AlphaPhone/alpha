import { Button } from "@repo/ui";
import { Layer } from "effect";
import { ChevronLeft } from "lucide-react";
import { useMachine as useComms } from "../../gen/app__phone__comms.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { CallStrip } from "./CallStrip.tsx";
import { commsViewOf } from "./comms.vibe";

function StageCall({ runtime, alpha }: Shown<Resident>) {
  const shell = useShell(runtime);
  const previous = useComms(runtime).state?.stage.at(-1);
  const back = previous === undefined ? undefined : commsViewOf(previous.app);
  return <>
    {back !== undefined && shell.can({ type: "returnCommsView", previous: back }) && <Button variant="ghost" size="sm" className="ml-2 shrink-0 self-start" aria-label={`Return to ${back}`} onClick={() => void alpha.back()}><ChevronLeft />{back}</Button>}
    <CallStrip runtime={runtime} stage />
  </>;
}

export default area(Layer.empty, StageCall);
