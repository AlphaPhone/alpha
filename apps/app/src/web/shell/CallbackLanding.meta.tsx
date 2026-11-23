import type { ComponentMeta } from "vibestack/stories";
import type { CallbackLandingProps } from "./CallbackLanding.tsx";
import { landingContinue, landingDenied } from "./fixtures.ts";

export const meta: ComponentMeta<CallbackLandingProps> = {
  args: { message: "MessageContinue", href: landingContinue },
  examples: {
    Checking: { message: "MessageChecking", href: "" },
    Cancelled: { message: "MessageCancelled", href: landingDenied },
    Reopened: { message: "MessageReopened", href: "" },
    Invalid: { message: "MessageInvalid", href: "" },
  },
};
