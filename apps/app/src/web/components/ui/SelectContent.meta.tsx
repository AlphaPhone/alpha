import type { ComponentMeta } from "vibestack/stories";
import { Select, type SelectContentProps, SelectItem, SelectTrigger, SelectValue } from "./Select.tsx";

const tones = ["Aurora", "Bloom", "Chime", "Drift", "Echo", "Flicker", "Glow", "Halo", "Ivy", "Juniper", "Kite", "Lumen", "Meadow", "Nova", "Orbit", "Pulse"];
const items = (names: string[]) => names.map((name) => <SelectItem key={name} value={name.toLowerCase()}>{name}</SelectItem>);

export const meta: ComponentMeta<SelectContentProps> = {
  args: { children: items(tones.slice(0, 4)) },
  examples: {
    Long: { children: items(tones) },
    "With disabled": {
      children: (
        <>
          {items(tones.slice(0, 3))}
          <SelectItem value="downloaded" disabled>Downloaded tones (none yet)</SelectItem>
        </>
      ),
    },
  },
  decorator: (story) => (
    <Select defaultValue="chime" defaultOpen onValueChange={() => undefined}>
      <SelectTrigger aria-label="Ringtone"><SelectValue placeholder="Choose a ringtone" /></SelectTrigger>
      {story()}
    </Select>
  ),
};
