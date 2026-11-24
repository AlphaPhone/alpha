import { area } from "../runtime/area.tsx";
import { phoneInfoBack } from "./back.vibe";
import { PhoneInfo } from "./PhoneInfo.tsx";
import { phoneInfo } from "./phoneInfo.vibe";

/** Settings → Phone, at the place Settings offers it, with its own machine. */
export default area(phoneInfo, PhoneInfo, { back: phoneInfoBack });
