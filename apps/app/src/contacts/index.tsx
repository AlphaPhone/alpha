import { Layer } from "effect";
import { contactsBack } from "../comms/index.vibe";
import { area } from "../runtime/ui.tsx";
import { Contacts } from "./Contacts.tsx";

/** Contacts, at its view: its machine is resident. */
export default area(Layer.empty, Contacts, { back: contactsBack });
