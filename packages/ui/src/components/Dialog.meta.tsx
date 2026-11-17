import { expect, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { CardFooter } from "./Card.tsx";
import { DialogClose, DialogContent, DialogDescription, type DialogProps, DialogTitle, DialogTrigger } from "./Dialog.tsx";
import { Input } from "./Input.tsx";

const children = (
  <>
    <DialogTrigger asChild>
      <Button variant="secondary">Rename</Button>
    </DialogTrigger>
    <DialogContent closeLabel="Close">
      <DialogTitle>Rename folder</DialogTitle>
      <DialogDescription>Notes in it keep their place.</DialogDescription>
      <Input aria-label="Name" defaultValue="Travel" />
      <CardFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button>Save</Button>
      </CardFooter>
    </DialogContent>
  </>
);

export const meta: ComponentMeta<DialogProps> = {
  args: { children },
  examples: { "default open": { defaultOpen: true } },
  play: {
    Default: async () => {
      const trigger = screen.getByRole("button", { name: "Rename" });
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", { name: "Rename folder" });
      await expect(dialog.contains(document.activeElement)).toBe(true);
      await expect(dialog).toHaveAccessibleDescription("Notes in it keep their place.");
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect([screen.queryByRole("dialog"), document.activeElement]).toEqual([null, trigger]));
      await userEvent.click(trigger);
      await userEvent.click(await screen.findByRole("button", { name: "Close" }));
      await waitFor(() => expect([screen.queryByRole("dialog"), document.activeElement]).toEqual([null, trigger]));
    },
  },
};
