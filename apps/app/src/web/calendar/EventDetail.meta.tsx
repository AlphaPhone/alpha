import type { ComponentMeta } from "vibestack/stories";
import type { EventDetailProps } from "./EventDetail.tsx";
import { inviteFacts, organizerFacts, run, standup } from "./fixtures.ts";

const handlers = { onEdit: () => undefined, onAskDelete: () => undefined, onDelete: () => undefined, onRespond: () => undefined, invitationBinding: "owner", onCloseDelete: () => undefined, onCheckAgain: () => undefined, onOpenLink: () => undefined, onPlace: () => undefined, onClose: () => undefined };

export const meta: ComponentMeta<EventDetailProps> = {
  args: { row: standup, facts: organizerFacts, deleting: false, held: false, canEdit: true, canDelete: true, ...handlers },
  examples: {
    Deleting: { row: run, facts: organizerFacts, deleting: true, held: false, canEdit: true, canDelete: true, ...handlers },
    Invitation: { row: standup, facts: inviteFacts, deleting: false, held: false, canEdit: true, canDelete: true, ...handlers },
    AnswerableInvitation: { row: standup, facts: { ...inviteFacts, managed: false, repeat: "" } },
    Held: { row: run, facts: organizerFacts, deleting: false, held: true, canEdit: true, canDelete: true, ...handlers },
    FromNote: { row: standup, facts: organizerFacts, deleting: false, held: false, canEdit: true, canDelete: true, origin: { label: "FromNoteTitled", title: "Team offsite", noteId: "n-1" }, onOpenOrigin: () => undefined, ...handlers },
    FromDeletedNote: { row: standup, facts: organizerFacts, deleting: false, held: false, canEdit: true, canDelete: true, origin: { label: "DeletedNoteLabel", title: "" }, ...handlers },
  },
};
