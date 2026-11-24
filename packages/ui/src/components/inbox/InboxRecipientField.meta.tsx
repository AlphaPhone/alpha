import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxRecipientFieldProps } from "./InboxRecipientField.tsx";

const onAdd = fn();
const onRemove = fn();
const onPickContact = fn();

export const meta: ComponentMeta<InboxRecipientFieldProps> = {
  args: { label: "To", recipients: [{ address: "ana.lima@example.com", valid: true }, { address: "bruno@costa.example", valid: true }], value: "", onValueChange: fn(), onAdd, onRemove, onPickContact: undefined },
  examples: {
    Empty: { recipients: [] },
    Cc: { label: "Cc", recipients: [{ address: "carla.dias@example.com", valid: true }] },
    "One not accepted": { recipients: [{ address: "ana.lima@example.com", valid: true }, { address: "daniel@", valid: false }] },
    "With contacts": { onPickContact },
    "Half typed": { value: "elena.fa" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRemove.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove bruno@costa.example" }));
      await expect(onRemove.mock.calls).toEqual([["bruno@costa.example"]]);
    },
    "Half typed": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAdd.mockClear();
      await userEvent.type(within(canvasElement).getByRole("textbox", { name: "Add to To" }), "{Enter}");
      await expect(onAdd.mock.calls).toEqual([["elena.fa"]]);
    },
    "With contacts": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onPickContact.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Pick To from contacts" }));
      await expect(onPickContact.mock.calls.length).toBe(1);
    },
  },
};
