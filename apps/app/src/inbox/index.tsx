import { area } from "../runtime/area.tsx";
import { Inbox } from "./Inbox.tsx";
import { back, reading } from "./message.vibe";

/** Inbox, at its view: the list is resident (resident.vibe); the message open and its marks are the area's own. */
export default area(reading, Inbox, { back });
