import { area } from "../runtime/area.tsx";
import { contactsBack } from "./back.vibe";
import { Contacts } from "./Contacts.tsx";
import { contacts } from "./contacts.vibe";

/** Contacts, at its view, with its own machine. */
export default area(contacts, Contacts, { back: contactsBack });
