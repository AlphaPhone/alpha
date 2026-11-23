import type { ComponentMeta } from "vibestack/stories";
import type { StatusDotProps } from "./StatusDot.tsx";

export const meta: ComponentMeta<StatusDotProps> = {
  args: { status: "ok", label: "Connected" },
  examples: {
    "status warn": { status: "warn", label: "Weak signal" },
    "status error": { status: "error", label: "Failed" },
    "status off": { status: "off", label: "Off" },
    "status busy": { status: "busy", label: "Connecting" },
  },
};
