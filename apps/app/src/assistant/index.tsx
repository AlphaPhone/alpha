import type { Layer } from "effect";
import { useMachine as useInbox } from "../../gen/app__inbox.react.ts";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { Assistant } from "./Assistant.tsx";
import { assistantBack, assisting } from "./assistant.vibe";
import { copyMessage, emailDestination, emailMessage } from "./message-actions.vibe";

/** The conversation with the system clipboard and Inbox's current review destination. */
function LiveAssistant({ runtime }: Shown<Layer.Success<typeof assisting> | Resident>) {
  const inbox = useInbox(runtime).state;
  const drafts = useDrafts(runtime).state;
  const destination = emailDestination(inbox, drafts);
  return <Assistant runtime={runtime} messageActions={{
    copy: (selection) => void runtime.runPromise(copyMessage(selection)),
    useInEmail: destination ? (selection) => void runtime.runPromise(emailMessage(selection, destination)) : undefined,
  }} />;
}

/** Ask Alpha in full, over Home and every app (areas.ts): its machines live from the screen's first load. */
export default area(assisting, LiveAssistant, { back: assistantBack });
