import type { ComponentMeta } from "vibestack/stories";
import type { BannerProps } from "./Banner.tsx";
import { Button } from "./Button.tsx";

export const meta: ComponentMeta<BannerProps> = {
  args: { children: "Alpha is offline" },
  examples: { Action: { variant: "warn", children: "Storage is almost full", action: <Button variant="outline" size="sm">Review</Button> } },
};
