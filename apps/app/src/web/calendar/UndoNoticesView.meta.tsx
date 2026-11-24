import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/calendar__deletions.ts";
import type { UndoNoticesViewProps } from "./UndoNoticesView.tsx";
import { heldDecline, heldDeletion, heldSending } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<UndoNoticesViewProps> = {
  args: { held: heldDeletion, onOffered: none, onUndo: none },
  examples: {
    Declined: { held: heldDecline },
    Sending: { held: heldSending },
    NothingHeld: { held: initial },
  },
};
