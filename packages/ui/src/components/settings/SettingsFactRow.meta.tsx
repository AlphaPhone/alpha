import { Battery } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup, reported, unavailable, waiting } from "./samples.ts";
import type { SettingsFactRowProps } from "./SettingsFactRow.tsx";

export const meta: ComponentMeta<SettingsFactRowProps> = {
  args: { title: "Battery", icon: <Battery />, reading: reported("87%", "ok") },
  decorator: inGroup,
  examples: { Waiting: { reading: waiting }, Unavailable: { reading: unavailable } },
};
