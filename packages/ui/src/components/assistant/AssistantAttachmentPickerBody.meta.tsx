import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantAttachmentPickerBodyProps } from "./AssistantAttachmentPickerBody.tsx";
import { presses } from "./plays.ts";

const onSelect = fn();
const onAttach = fn();
const onRequestAccess = fn();
const onOpenSettings = fn();
const onTabChange = fn();

const photos = [
  { id: "p1", name: "IMG_2041.jpg", detail: "3.1 MB", kind: "photo" as const },
  { id: "p2", name: "IMG_2042.jpg", detail: "2.8 MB", kind: "photo" as const },
  { id: "p3", name: "IMG_2043.jpg", detail: "3.4 MB", kind: "photo" as const },
  { id: "p4", name: "IMG_2044.jpg", detail: "2.2 MB", kind: "photo" as const },
  { id: "p5", name: "IMG_2045.jpg", detail: "3.0 MB", kind: "photo" as const },
];
const documents = [
  { id: "d1", name: "Lease agreement.pdf", detail: "412 KB", kind: "document" as const },
  { id: "d2", name: "Statement June.pdf", detail: "96 KB", kind: "document" as const },
];

export const meta: ComponentMeta<AssistantAttachmentPickerBodyProps> = {
  args: { tab: "photos", access: "granted", status: "loaded", files: photos, selected: ["p1"], room: 4, onTabChange, onSelect, onAttach, onRequestAccess, onOpenSettings, onRetry: fn(), onMore: fn() },
  examples: {
    Documents: { tab: "documents", files: documents, selected: [] },
    Unasked: { access: "unasked", files: [], selected: [] },
    Denied: { access: "denied", files: [], selected: [] },
    Limited: { access: "limited" },
    Loading: { status: "loading", files: [], selected: [] },
    Failed: { status: "failed", files: [], selected: [] },
    "No files": { files: [], selected: [] },
    Refused: { refused: ["Holiday.mov", "Archive.zip"] },
    "Room is full": { selected: ["p1", "p2", "p3", "p4"] },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSelect.mockClear();
      onAttach.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("checkbox", { name: "IMG_2042.jpg" }));
      await userEvent.click(canvas.getByRole("button", { name: "Attach" }));
      await expect([onSelect.mock.calls, onAttach.mock.calls.length]).toEqual([[["p2", true]], 1]);
    },
    Documents: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onTabChange.mockClear();
      await userEvent.click(within(canvasElement).getByRole("tab", { name: "Photos" }));
      await expect(onTabChange.mock.calls[0]).toEqual(["photos"]);
    },
    Unasked: presses("Allow access", onRequestAccess),
    Denied: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpenSettings.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Allow access" })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: "Open Settings" }));
      await expect(onOpenSettings.mock.calls.length).toBe(1);
    },
    "Room is full": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect([canvas.getByRole("checkbox", { name: "IMG_2045.jpg" }).hasAttribute("disabled"), canvas.getByRole("checkbox", { name: "IMG_2041.jpg" }).hasAttribute("disabled")]).toEqual([true, false]);
    },
  },
};
