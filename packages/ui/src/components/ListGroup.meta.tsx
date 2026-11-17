import { Bluetooth, Wifi } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { ListGroupProps } from "./ListGroup.tsx";
import { ListRow } from "./ListRow.tsx";
import { StatusDot } from "./StatusDot.tsx";
import { Switch } from "./Switch.tsx";

const children = (
  <>
    <ListRow title="Wi-Fi" detail="Home" leading={<Wifi aria-hidden />} trailing={<StatusDot status="ok" label="Connected" />} onClick={() => undefined} />
    <ListRow title="Bluetooth" leading={<Bluetooth aria-hidden />} trailing={<Switch aria-label="Bluetooth" />} />
  </>
);

export const meta: ComponentMeta<ListGroupProps> = {
  args: { heading: "Network", children },
  examples: { "No heading": { heading: undefined } },
};
