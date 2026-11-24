import { Layer } from "effect";
import { contactsBack } from "../phone/back.vibe";
import { area } from "../runtime/area.tsx";
import { Contacts } from "./Contacts.tsx";

/** Contacts, at its view: its machine is resident. */
export default area(Layer.empty, Contacts, { back: contactsBack });
