import type { ComponentMeta } from "vibestack/stories";
import type { SeparatorProps } from "./Separator.tsx";

export const meta: ComponentMeta<SeparatorProps> = {
  args: { children: null },
  examples: { Decorative: { decorative: true } },
  decorator: (story) => <div className="h-12 w-64">{story()}</div>,
};
