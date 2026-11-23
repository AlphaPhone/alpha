import type { ComponentMeta } from "vibestack/stories";
import type { SpinnerProps } from "./Spinner.tsx";

export const meta: ComponentMeta<SpinnerProps> = {
  args: { label: "Loading messages" },
  examples: { Accent: { className: "text-primary" } },
};
