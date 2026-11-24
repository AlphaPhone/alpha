import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantFileRowProps } from "./AssistantFileRow.tsx";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkmP+/HgAEtAI1xQ0x2QAAAABJRU5ErkJggg==";
const onSelect = fn();

export const meta: ComponentMeta<AssistantFileRowProps> = {
  args: { file: { id: "1", name: "Lease agreement.pdf", detail: "412 KB", kind: "document" }, selected: false, onSelect },
  examples: {
    Photo: { file: { id: "2", name: "IMG_2041.jpg", detail: "3.1 MB", kind: "photo", thumbnail: pixel } },
    "Room is full": { onSelect: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSelect.mockClear();
      await userEvent.click(within(canvasElement).getByRole("checkbox", { name: "Lease agreement.pdf" }));
      await expect(onSelect.mock.calls).toEqual([[true]]);
    },
    "Room is full": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("checkbox")).toBeDisabled();
    },
  },
};
