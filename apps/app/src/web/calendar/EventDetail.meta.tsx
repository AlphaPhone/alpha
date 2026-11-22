import type { ComponentMeta } from "vibestack/stories";
import type { EventDetailProps } from "./EventDetail.tsx";
import { inviteFacts, organizerFacts, run, standup } from "./fixtures.ts";

const handlers = { onEdit: () => undefined, onAskDelete: () => undefined, onDelete: () => undefined, onCloseDelete: () => undefined, onCheckAgain: () => undefined, onOpenLink: () => undefined, onPlace: () => undefined, onClose: () => undefined };

export const meta: ComponentMeta<EventDetailProps> = {
  args: { row: standup, facts: organizerFacts, deleting: false, held: false, canEdit: true, canDelete: true, ...handlers },
  examples: {
    Deleting: { row: run, facts: organizerFacts, deleting: true, held: false, canEdit: true, canDelete: true, ...handlers },
    Invitation: { row: standup, facts: inviteFacts, deleting: false, held: false, canEdit: true, canDelete: true, ...handlers },
    Held: { row: run, facts: organizerFacts, deleting: false, held: true, canEdit: true, canDelete: true, ...handlers },
  },
};
