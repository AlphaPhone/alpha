// spec/app/voice/route.md, "Settings names where speech goes as the owner set it up: this phone, Alpha Cloud or the owner's own key, leaving out a hold after a failure"; spec/app/settings/index.md, "Each page links to what another area owns there"
import { ListGroup, SettingsFactRow } from "@repo/ui";
import { useMachine as useVoice } from "../../gen/app__voice.react.ts";
import { chosen, type Way } from "../../gen/app__voice__route.ts";
import { native } from "../platform/device.vibe";
import type { Area } from "../runtime/area.tsx";
import assistant from "./index.tsx";

const ways: Record<Way, string> = {
  OnPhone: "On this phone",
  ViaCloud: "Recordings, replies → Eliza Cloud",
  ViaOwnKey: "Recordings, replies → your own key",
};

/** Privacy's Voice row: where the owner's speech goes, as the voice area holds its route. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    const onPhone = native();
    return function SettingsVoice() {
      const voice = useVoice(runtime).state;
      if (!voice) return null;
      const way = chosen(voice.route);
      return (
        <ListGroup>
          <SettingsFactRow title="Voice" reading={{ word: "reported", value: way === "OnPhone" && !onPhone ? "In this app" : ways[way] }} />
        </ListGroup>
      );
    };
  },
} satisfies Area;
