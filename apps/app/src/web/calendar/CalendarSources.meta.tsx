import type { ComponentMeta } from "vibestack/stories";
import type { CalendarSourcesProps } from "./CalendarSources.tsx";

const handlers = { onAgent: () => undefined, onDevice: () => undefined, onClose: () => undefined };

export const meta: ComponentMeta<CalendarSourcesProps> = {
  args: { open: true, agentShown: true, deviceShown: true, agentAccess: true, deviceAccess: true, ...handlers },
  examples: {
    AgentHidden: { open: true, agentShown: false, deviceShown: true, agentAccess: true, deviceAccess: true, ...handlers },
    DeviceRevoked: { open: true, agentShown: true, deviceShown: true, agentAccess: true, deviceAccess: false, ...handlers },
    SignedOut: { open: true, agentShown: true, deviceShown: false, agentAccess: false, deviceAccess: true, ...handlers },
  },
};
