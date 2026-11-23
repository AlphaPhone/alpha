import type { ComponentMeta } from "vibestack/stories";
import { ListRow } from "./ListRow.tsx";
import type { ScrollAreaProps } from "./ScrollArea.tsx";

const tones = ["Aurora", "Bloom", "Chime", "Drift", "Echo", "Flicker", "Glow", "Halo", "Ivy", "Juniper", "Kite", "Lumen", "Meadow", "Nova", "Orbit", "Pulse"];
const rows = (names: string[]) => names.map((name) => <ListRow key={name} title={name} onClick={() => undefined} />);

export const meta: ComponentMeta<ScrollAreaProps> = {
  args: { className: "h-72 w-full", children: rows(tones) },
  examples: { Short: { children: rows(tones.slice(0, 3)) } },
};
