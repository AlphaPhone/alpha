import type { ComponentMeta } from "vibestack/stories";
import type { SpeechDisclosureProps } from "./SpeechDisclosure.tsx";
import { cartesiaSends, cloudSends } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<SpeechDisclosureProps> = {
  args: { route: undefined, sends: undefined, onContinue: noop, onDismiss: noop },
  examples: {
    ElizaCloud: { route: "Cloud", sends: cloudSends },
    Cartesia: { route: "Direct", sends: cartesiaSends },
  },
};
