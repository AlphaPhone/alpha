import { area } from "../runtime/area.tsx";
import { SlackScreen } from "./Slack.tsx";
import { slackBack, slackResident } from "./resident.vibe";

/** Slack user-account multi-workspace area mounted at `view:Slack`. */
export default area(slackResident, SlackScreen, { back: slackBack });
