import { Layer } from "effect";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { SlackScreen } from "./Slack.tsx";
import { slackBack } from "./resident.vibe";

function SlackView({ runtime }: Shown<Resident>) {
  return <SlackScreen runtime={runtime} />;
}

/** Slack user-account multi-workspace area mounted at `view:Slack`; its machines and ledger are resident. */
export default area(Layer.empty, SlackView, { back: slackBack });
