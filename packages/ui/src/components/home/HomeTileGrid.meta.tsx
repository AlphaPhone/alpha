import { Calendar, Camera, Folder, Globe, Image, Mail, MapPin, MessageSquare, Phone, Settings, StickyNote, Workflow } from "lucide-react";
import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeTileGridProps, HomeTileItem } from "./HomeTileGrid.tsx";
import { InstalledAppIcon } from "./InstalledAppIcon.tsx";

export const homeTiles: HomeTileItem[] = [
  { id: "Phone", label: "Phone", icon: <Phone className="size-6" />, badge: "2 missed calls" },
  { id: "Messages", label: "Messages", icon: <MessageSquare className="size-6" /> },
  { id: "Inbox", label: "Inbox", icon: <Mail className="size-6" />, badge: "3 unread" },
  { id: "Calendar", label: "Calendar", icon: <Calendar className="size-6" /> },
  { id: "Browser", label: "Browser", icon: <Globe className="size-6" /> },
  { id: "Camera", label: "Camera", icon: <Camera className="size-6" /> },
  { id: "Photos", label: "Photos", icon: <Image className="size-6" /> },
  { id: "Maps", label: "Maps", icon: <MapPin className="size-6" /> },
  { id: "com.example.clock", label: "Clock", icon: <InstalledAppIcon /> },
  { id: "Settings", label: "Settings", icon: <Settings className="size-6" /> },
];

export const hiddenApps: Omit<HomeTileItem, "badge">[] = [
  { id: "Notes", label: "Notes", icon: <StickyNote className="size-6" /> },
  { id: "Files", label: "Files", icon: <Folder className="size-6" /> },
  { id: "Workflows", label: "Workflows", icon: <Workflow className="size-6" /> },
];

const unbadged = homeTiles.map(({ badge: _badge, ...tile }) => tile);
const onOpen = fn();
const onBeginEditing = fn();
const onRemove = fn();
const onMove = fn();

export const meta: ComponentMeta<HomeTileGridProps> = {
  args: { tiles: homeTiles, onOpen, onBeginEditing, onRemove, onMove },
  examples: {
    Editing: { tiles: unbadged, editing: true },
    "Editing while saving": { tiles: unbadged, editing: true, onRemove: undefined, onMove: undefined },
    "Off the phone": { onBeginEditing: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onBeginEditing.mockClear();
      const canvas = within(canvasElement);
      const inbox = canvas.getByRole("button", { name: /^Inbox/ });
      await expect(inbox).toHaveAccessibleName(/^Inbox\s*3 unread$/);
      await userEvent.click(inbox);
      await fireEvent.contextMenu(canvas.getByRole("button", { name: "Maps" }));
      await expect([onOpen.mock.calls, onBeginEditing.mock.calls.length]).toEqual([[["Inbox"]], 1]);
      await expect(canvas.queryByRole("button", { name: "Apps" })).toBeNull();
    },
    Editing: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onMove.mockClear();
      onRemove.mockClear();
      const canvas = within(canvasElement);
      canvas.getByRole("button", { name: "Phone" }).focus();
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowLeft}");
      await userEvent.keyboard("{Delete}");
      await userEvent.click(canvas.getByRole("button", { name: "Remove Maps" }));
      await expect([onMove.mock.calls, onRemove.mock.calls]).toEqual([[[{ id: "Phone", onto: "Messages", behind: true }]], [["Phone"], ["Maps"]]]);
    },
    "Editing while saving": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("button", { name: "Remove Phone" })).toBeDisabled();
      await userEvent.click(canvas.getByRole("button", { name: "Phone" }));
      await expect(onOpen.mock.calls.length).toBe(0);
    },
  },
};
