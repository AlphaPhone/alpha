import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { CardFooter, type CardProps, CardTitle } from "./Card.tsx";
import { Progress } from "./Progress.tsx";

export const meta: ComponentMeta<CardProps> = {
  args: {
    children: (
      <>
        <CardTitle>Lisbon trip</CardTitle>
        <Progress value={2} max={3} aria-label="Booked" />
        <CardFooter>
          <Button>Open</Button>
        </CardFooter>
      </>
    ),
  },
  // `asChild` needs an element to become, which no type can supply.
  examples: { AsChild: { asChild: true, children: <a href="#lisbon-trip"><CardTitle>Lisbon trip</CardTitle></a> } },
};
