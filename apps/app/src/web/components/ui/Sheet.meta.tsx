import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { ListRow } from "./ListRow.tsx";
import { type Sheet, SheetContent, SheetTrigger } from "./Sheet.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<ComponentProps<typeof Sheet>> = {
  args: {
    children: (
      <>
        <SheetTrigger asChild>
          <Button variant="outline">Ringtone</Button>
        </SheetTrigger>
        <SheetContent title="Ringtone">
          <div>{["Aurora", "Chime", "Drift"].map((name) => <ListRow key={name} title={name} selected={name === "Chime"} onClick={noop} />)}</div>
        </SheetContent>
      </>
    ),
  },
};
