import { Calendar, Camera, Folder, Globe, Image, type LucideIcon, Mail, MapPin, MessageSquare, Phone, Settings, StickyNote, UserRound, Workflow } from "lucide-react";
import type { View } from "../../gen/app__shell.ts";

export const views = {
  Phone: { label: "Phone", icon: Phone },
  Messages: { label: "Messages", icon: MessageSquare },
  Inbox: { label: "Inbox", icon: Mail },
  Calendar: { label: "Calendar", icon: Calendar },
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

const ownHeader = new Set<View>(["Contacts", "Maps", "Messages", "Phone", "Settings"]);

/** Whether an area's own chrome includes Back and the view's title or search. */
export const viewHasHeader = (view: View) => ownHeader.has(view);
