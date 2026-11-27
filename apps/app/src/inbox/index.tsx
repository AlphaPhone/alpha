import { area } from "../runtime/ui.tsx";
import { Inbox } from "./Inbox.tsx";
import { back, reading } from "./message.vibe";
import { notifiedReader } from "./notice-reader.vibe";
import { together } from "../runtime/index.vibe";

/** Inbox, at its view: the list is resident (resident.vibe); the message open and its marks are the area's own. */
export default area(together(reading, notifiedReader), Inbox, { back });
