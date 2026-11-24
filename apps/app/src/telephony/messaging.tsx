import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { messagesBack } from "./back.vibe";
import { Messages } from "./Messages.tsx";

/** Messages, at its view: its machine and the drafts are resident. */
export default area(Layer.empty, Messages, { back: messagesBack });
