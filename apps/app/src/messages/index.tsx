import { Layer } from "effect";
import { messagesBack } from "../phone/back.vibe";
import { area } from "../runtime/area.tsx";
import { Messages } from "./Messages.tsx";

/** Messages, at its view: its machine and the composer's are resident. */
export default area(Layer.empty, Messages, { back: messagesBack });
