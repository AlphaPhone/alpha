import { area } from "../runtime/area.tsx";
import { detailsBack } from "./back.vibe";
import { Details } from "./Details.tsx";
import { details } from "./details.vibe";

/** Settings → Phone, at the place Settings offers it, with its own machine. */
export default area(details, Details, { back: detailsBack });
