import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { ListRow } from "./ListRow.tsx";
import { Sheet, type SheetContentProps, SheetTrigger } from "./Sheet.tsx";

const noop = () => undefined;
const tones = ["Aurora", "Bloom", "Chime", "Drift", "Echo", "Flicker", "Glow", "Halo", "Ivy", "Juniper", "Kite", "Lumen", "Meadow", "Nova", "Orbit", "Pulse"];
const rows = (names: string[]) => <div>{names.map((name) => <ListRow key={name} title={name} selected={name === "Chime"} onClick={noop} />)}</div>;

export const meta: ComponentMeta<SheetContentProps> = {
  args: { title: "Ringtone", children: rows(tones.slice(0, 4)) },
  examples: {
    Long: { children: <div className="min-h-0 overflow-y-auto">{rows(tones)}</div> },
    "Long title": { title: "Choose what plays when someone from your favourites calls" },
  },
  decorator: (story) => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">Ringtone</Button>
      </SheetTrigger>
      {story()}
    </Sheet>
  ),
};
