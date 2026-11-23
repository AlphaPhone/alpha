// spec/telephony/common.md, "The apps exist only on the Alpha image with the telephony plugin registered"; spec/telephony/callBar.md, "Story: See my live call over every view"
import { Contact, MessageSquare, Phone } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CallBar } from "./CallBar.tsx";
import { ContactsScreen } from "./ContactsScreen.tsx";
import { MessagesScreen } from "./MessagesScreen.tsx";
import { PhoneScreen } from "./PhoneScreen.tsx";
import { UndoNotice } from "./UndoNotice.tsx";

/** Phone, Messages and Contacts: only on the Alpha AOSP image; the shell hides them elsewhere. */
export const screens: AppScreen[] = [
  { id: "phone", title: "Phone", icon: Phone, availability: "aosp", Screen: PhoneScreen },
  { id: "messages", title: "Messages", icon: MessageSquare, availability: "aosp", Screen: MessagesScreen },
  { id: "contacts", title: "Contacts", icon: Contact, availability: "aosp", Screen: ContactsScreen },
];

/** The ongoing-call bar at the top of every view while a call is live, and Undo for a deletion, on the Alpha image only. */
export const surfaces: AppSurface[] = [
  { id: "telephony-call-bar", slot: "top", availability: "aosp", Surface: () => <CallBar /> },
  { id: "telephony-undo", slot: "notices", availability: "aosp", Surface: () => <UndoNotice /> },
];

export { HomeCards } from "./HomeCards.tsx";
export { ReviewRows } from "./ReviewRows.tsx";
