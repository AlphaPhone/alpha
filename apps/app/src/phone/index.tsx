import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { phoneBack } from "./back.vibe";
import { Phone } from "./Phone.tsx";

/** Phone, at its view: Phone's and Voicemail's machines are resident. */
export default area(Layer.empty, Phone, { back: phoneBack });
