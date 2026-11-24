import { area } from "../runtime/area.tsx";
import { phoneBack } from "./back.vibe";
import { Phone } from "./Phone.tsx";
import { voicemail } from "./voicemail.vibe";

/** Phone, at its view: the resident Phone machine and the Voicemail tab's own. */
export default area(voicemail, Phone, { back: phoneBack });
