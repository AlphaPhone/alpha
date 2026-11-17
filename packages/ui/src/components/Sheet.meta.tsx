import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { ListGroup } from "./ListGroup.tsx";
import { ListRow } from "./ListRow.tsx";
import { SheetClose, SheetContent, type SheetProps, SheetTrigger } from "./Sheet.tsx";

const children = (
  <>
    <SheetTrigger asChild>
      <Button variant="secondary">Move</Button>
    </SheetTrigger>
    <SheetContent
      title="Move to"
      description="3 notes"
      actions={
        <>
          <SheetClose asChild>
            <Button variant="secondary">Cancel</Button>
          </SheetClose>
          <Button>Move</Button>
        </>
      }
    >
      <ListGroup surface="plain">
        <ListRow title="Personal" detail="12 notes" onClick={() => undefined} />
        <ListRow title="Work" detail="48 notes" onClick={() => undefined} />
        <ListRow title="Travel" detail="5 notes" onClick={() => undefined} />
      </ListGroup>
    </SheetContent>
  </>
);

export const meta: ComponentMeta<SheetProps> = {
  args: { children },
  examples: { "default open": { defaultOpen: true } },
  play: {
    Default: async () => {
      const trigger = screen.getByRole("button", { name: "Move" });
      await userEvent.click(trigger);
      const sheet = await screen.findByRole("dialog", { name: "Move to" });
      await expect(sheet).toHaveAccessibleDescription("3 notes");
      await userEvent.click(within(sheet).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect([screen.queryByRole("dialog"), document.activeElement]).toEqual([null, trigger]));
    },
  },
};
