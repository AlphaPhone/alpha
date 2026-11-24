import { Layer } from "effect";
import { messagesBack } from "../phone/back.vibe";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { Messages } from "./Messages.tsx";

function MessagesView({ runtime, alpha }: Shown<Resident>) {
  return <Messages runtime={runtime} onBack={() => void alpha.back()} />;
}

/** Messages, at its view: its machine and the composer's are resident. */
export default area(Layer.empty, MessagesView, { back: messagesBack });
