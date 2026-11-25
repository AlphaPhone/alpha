// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/assistant/dock.md, "While voice owns Ask Alpha its open sheet is not dragged, a drag under way is let go, and the sheet is dragged again once voice ends"
import type { Layer } from "effect";
import { Machine as Dock } from "../../gen/app__assistant__dock.effect.vibe";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { useMachine as useInbox } from "../../gen/app__inbox.react.ts";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { Machine as Voice, type Voice as VoiceState } from "../../gen/app__voice.effect.vibe";
import { useMachine as useVoice } from "../../gen/app__voice.react.ts";
import { quiet } from "../../gen/app__voice.ts";
import { useMachine as useSpeaker } from "../../gen/app__voice__output.react.ts";
import { voiceArea } from "../messages/dictation.vibe";
import { VoiceBridge } from "../platform/voice.vibe";
import { VoiceEnd } from "../phone/CommsTarget.tsx";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { applying, following, together, untimed } from "../runtime/reactor.vibe";
import { keyboardVoice } from "../shell/canvas.vibe";
import { voiceReported } from "../update/activity.vibe";
import { TalkControls } from "../voice/TalkControls.tsx";
import { DictationControls } from "../voice/DictationControls.tsx";
import { Assistant } from "./Assistant.tsx";
import { assistantBack, assisting } from "./assistant.vibe";
import { copyMessage, emailDestination, emailMessage } from "./message-actions.vibe";
import { dictate } from "./dictation.vibe";
import { aloud } from "./read-aloud.vibe";
import { beginTalk, commsVoicePanel, talkFromComms } from "./voice-entry.vibe";

const voiceOwnsComposer = (state: VoiceState) => !quiet(state) || state.recorder.stage !== "Closed";

const screens = together(
  assisting, voiceArea, aloud, talkFromComms, commsVoicePanel,
  following(Voice, voiceOwnsComposer, Dock, (on) => ({ type: "voicing", on, now: untimed } as const)),
  applying(Voice, voiceOwnsComposer, keyboardVoice),
  voiceReported("assistant"),
);

/** The conversation with Talk, the system clipboard and Inbox's current review destination. */
function LiveAssistant({ runtime }: Shown<Layer.Success<typeof screens> | Resident>) {
  const inbox = useInbox(runtime).state;
  const drafts = useDrafts(runtime).state;
  const destination = emailDestination(inbox, drafts);
  const voice = useVoice(runtime);
  const speaker = useSpeaker(runtime).state;
  const composer = useComposer(runtime);
  const telecom = usePhone(runtime).state?.telecom;
  const bridge = runtime.runSync(VoiceBridge);
  const available = runtime.runSync(bridge.available());
  const audioFree = speaker !== undefined && speaker.stage === "Silent" && !speaker.retiring;
  const noCall = telecom !== "OrdinaryCall" && telecom !== "MaybeEmergencyCall";
  const talk = { type: "startTalking", now: untimed } as const;
  const canTalk = available && noCall && audioFree && voice.can(talk);
  const canDictate = available && noCall && audioFree && composer.state?.away === "Free" && composer.can({ type: "edit", blank: false, long: false }) && voice.can({ type: "openRecorder", target: "ComposerField" });
  const recorder = voice.state?.recorder;
  const readingAllowed = noCall && speaker !== undefined && !speaker.latched && voice.state !== undefined && quiet(voice.state) && recorder?.stage === "Closed" && runtime.runSync(bridge.canRead());
  return <Assistant
    runtime={runtime}
    canReadAloud={readingAllowed}
    messageActions={{
      copy: (selection) => void runtime.runPromise(copyMessage(selection)),
      useInEmail: destination ? (selection) => void runtime.runPromise(emailMessage(selection, destination)) : undefined,
    }}
    speech={{
      onTalk: canTalk ? () => void runtime.runPromise(beginTalk()) : undefined,
      onDictate: canDictate ? () => void runtime.runPromise(dictate()) : undefined,
      voice: recorder !== undefined && recorder.stage !== "Closed" && recorder.field === "ComposerField"
        ? <DictationControls runtime={runtime} />
        : voice.state !== undefined && !quiet(voice.state) ? <TalkControls runtime={runtime} trailing={<VoiceEnd runtime={runtime} />} /> : undefined,
    }}
  />;
}

/** Ask Alpha in full, over Home and every app (areas.ts): its machines live from the screen's first load. */
export default area(screens, LiveAssistant, { back: assistantBack });
