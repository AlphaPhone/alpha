import type { ComponentMeta } from "vibestack/stories";
import type { SliderProps } from "./Slider.tsx";

export const meta: ComponentMeta<SliderProps> = {
  args: { "aria-label": "Ring volume", defaultValue: [60], max: 100, step: 1, onValueChange: () => undefined },
  examples: { Empty: { defaultValue: [0] }, Full: { defaultValue: [100] }, Stepped: { defaultValue: [3], max: 5 } },
};
