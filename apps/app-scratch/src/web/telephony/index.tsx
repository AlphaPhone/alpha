// spec/telephony/common.md, "The apps exist only on the Alpha image with the telephony plugin registered"; spec/telephony/callBar.md, "Story: See my live call over every view"; spec/telephony/comms.md, "A view change while the chat is open keeps the sheet's height and remembers the view it left"
import { Contact, MessageSquare, Phone } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CallBar } from "./CallBar.tsx";
import { ContactsScreen } from "./ContactsScreen.tsx";
import { MessagesScreen } from "./MessagesScreen.tsx";
import { PhoneScreen } from "./PhoneScreen.tsx";
import { backIn } from "./back.ts";
import { UndoNotice } from "./UndoNotice.tsx";

/** Phone, Messages and Contacts: only on the Alpha AOSP image; the shell hides them elsewhere. Back returns the stage, closes the chat, then each app's own layers. */
export const screens: AppScreen[] = [
  { id: "phone", title: "Phone", icon: Phone, availability: "aosp", Screen: PhoneScreen, back: () => backIn("phone") },
  { id: "messages", title: "Messages", icon: MessageSquare, availability: "aosp", Screen: MessagesScreen, back: () => backIn("messages") },
  { id: "contacts", title: "Contacts", icon: Contact, availability: "aosp", Screen: ContactsScreen, back: () => backIn("contacts") },
];

/** The ongoing-call bar at the top of every view while a call is live, and Undo for a deletion, on the Alpha image only. */
export const surfaces: AppSurface[] = [
  { id: "telephony-call-bar", slot: "top", availability: "aosp", Surface: () => <CallBar /> },
  { id: "telephony-undo", slot: "notices", availability: "aosp", Surface: () => <UndoNotice /> },
];

export { HomeCards } from "./HomeCards.tsx";
export { ReviewRows } from "./ReviewRows.tsx";
