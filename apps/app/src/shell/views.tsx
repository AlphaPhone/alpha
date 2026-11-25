import { Calendar, Camera, Clock, Folder, Globe, Image, ListChecks, type LucideIcon, MailOpen, MapPin, MessageSquare, Phone, Settings, StickyNote, UserRound, Workflow } from "lucide-react";
import type { View } from "../../gen/app__shell.ts";

export const views = {
  Phone: { label: "Phone", icon: Phone },
  Messages: { label: "Messages", icon: MessageSquare },
  Inbox: { label: "Inbox", icon: MailOpen },
  Calendar: { label: "Calendar", icon: Calendar },
  Clock: { label: "Clock", icon: Clock },
  Reminders: { label: "Reminders", icon: ListChecks },
  Browser: { label: "Browser", icon: Globe },
  Camera: { label: "Camera", icon: Camera },
  Photos: { label: "Photos", icon: Image },
  Maps: { label: "Maps", icon: MapPin },
  Notes: { label: "Notes", icon: StickyNote },
  Contacts: { label: "Contacts", icon: UserRound },
  Files: { label: "Files", icon: Folder },
  Workflows: { label: "Workflows", icon: Workflow },
  Settings: { label: "Settings", icon: Settings },
} satisfies Record<View, { label: string; icon: LucideIcon }>;

export const viewOrder = Object.keys(views) as View[];

const commsViews = new Set<View>(["Phone", "Messages", "Contacts"]);
const ownHeader = new Set<View>(["Browser", "Calendar", "Camera", "Photos", "Files", "Maps", "Notes", "Settings", "Workflows", ...commsViews]);

/** Whether the app shares the conversation stage with Ask Alpha. */
export const isCommsView = (view: View | undefined) => view !== undefined && commsViews.has(view);

/** Whether an area's own chrome includes Back and the view's title or search. */
export const viewHasHeader = (view: View) => ownHeader.has(view);
