import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/clock__handoff.ts";
import type { HandoffPanelProps } from "./HandoffPanel.tsx";
import { answered, reviewing } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<HandoffPanelProps> = {
  args: { handoff: initial, zone: "Europe/Paris", can: () => true, send: none, onPrepare: none, onConfirm: none },
  examples: { Reviewing: { handoff: reviewing }, Answered: { handoff: answered }, AfterRestart: { lastStatus: "ClockUnknown" } },
};
