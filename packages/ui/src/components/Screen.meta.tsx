import { ChevronLeft, Plus } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { ListGroup } from "./ListGroup.tsx";
import { ListRow } from "./ListRow.tsx";
import type { ScreenProps } from "./Screen.tsx";

const children = (
  <ListGroup heading="This week">
    <ListRow title="Packing list" detail="Passport, charger, shoes" trailing="Tue" onClick={() => undefined} />
    <ListRow title="Lisbon" detail="Flights are booked" trailing="Mon" onClick={() => undefined} />
  </ListGroup>
);

export const meta: ComponentMeta<ScreenProps> = {
  args: { title: "Notes", children },
  examples: {
    Leading: { leading: <Button variant="ghost" size="icon" aria-label="Back"><ChevronLeft /></Button> },
    Actions: { actions: <Button variant="ghost" size="icon" aria-label="New note"><Plus /></Button> },
  },
};
