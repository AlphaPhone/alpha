// spec/app/voice/index.md, "Story: Choose where my speech goes"; spec/app/voice/route.md, "Story: Choose where speech is processed"
import { ListGroup, ListRow } from "@repo/ui";
import { useEffect, useState } from "react";
import { useMachine } from "../../gen/app__voice.react.ts";
import { onNetwork, talking } from "../../gen/app__voice.ts";
import assistant from "../assistant/index.tsx";
import { native } from "../platform/device.vibe";
import { speechDestination } from "../platform/voice.vibe";
import type { Area } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";

function VoicePrivacy({ runtime }: { runtime: ReturnType<typeof assistant.runtime> }) {
  const { state } = useMachine(runtime);
  const [pastHold, setPastHold] = useState(0);
  const holdUntil = state?.route.holdUntil ?? 0;
  useEffect(() => {
    if (holdUntil <= 0) return;
    const lifetime = new AbortController();
    const wait = Time.use((time) => time.until(holdUntil));
    void runtime.runPromiseExit(wait, { signal: lifetime.signal }).then((exit) => {
      if (exit._tag === "Success" && !lifetime.signal.aborted) setPastHold(holdUntil);
    });
    return () => lifetime.abort();
  }, [holdUntil, runtime]);

  let detail = "Unavailable in this browser";
  if (native()) {
    if (!state) detail = "Checking…";
    else {
      const now = runtime.runSync(Time.use((time) => time.latest()));
      const network = talking(state) ? state.network : onNetwork(state.route, Math.max(now, pastHold));
      const route = speechDestination(network);
      detail = route === "Cloud" ? "Recordings and replies go to Alpha Cloud" : route === "OnDevice" ? "On this phone" : "Unavailable";
    }
  }
  return (
    <ListGroup aria-label="Voice processing">
      <ListRow title="Voice" detail={detail} />
    </ListGroup>
  );
}

/** A read-only disclosure of the route used by the existing Voice machine and its transport. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    return function VoiceInPrivacy() { return <VoicePrivacy runtime={runtime} />; };
  },
} satisfies Area;
