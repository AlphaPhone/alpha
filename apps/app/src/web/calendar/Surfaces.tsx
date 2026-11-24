// spec/calendar/deletions.md, "Story: Undo a deletion before it is sent"; spec/calendar/approvals.md, "Story: Approve or decline a Calendar change the agent asked for"; spec/calendar/availability.md, "Story: Choose the calendars and see the answer before it is shared"
import { ApprovalReviews } from "../../calendar/approvals.vibe";
import { HeldDeletions } from "../../calendar/deletions.vibe";
import { AgentRequests } from "../../calendar/requests.vibe";
import type { AppId } from "../app-screen.ts";
import { AgentRequestReviewView } from "./AgentRequestReviewView.tsx";
import { ApprovalReviewView } from "./ApprovalReviewView.tsx";
import { UndoNoticesView } from "./UndoNoticesView.tsx";
import { useApprovalSheet, useHeld, useRequestSheet } from "./hooks.ts";
import { perform } from "../shell/services.ts";

/** What the shell gives an always-mounted Calendar surface: a way to open an app. */
export type SurfaceProps = { readonly open: (app: AppId, route?: string) => void };

/** The Undo notice's props, as the shell mounts it in the notices slot. */
export type UndoNoticesProps = SurfaceProps;

/** The approval review's props, as the shell mounts it in the overlay slot. */
export type ApprovalReviewProps = SurfaceProps;

/** The agent request review's props, as the shell mounts it in the overlay slot. */
export type AgentRequestReviewProps = SurfaceProps;

/**
 * The Undo notice of the newest held deletion; its window does not end while it is on screen.
 * @model spec/calendar/deletions.md
 */
export function UndoNotices(_props: UndoNoticesProps) {
  const held = useHeld();
  return (
    <UndoNoticesView held={held}
      onOffered={(id, open) => void perform(HeldDeletions.use((service) => service.offered(id, open)))}
      onUndo={(id) => void perform(HeldDeletions.use((service) => service.undo(id)))} />
  );
}

/**
 * The review of a Calendar change waiting for approval: exactly the fields it would apply, read again at the tap.
 * @model spec/calendar/approvals.md
 */
export function ApprovalReview(_props: ApprovalReviewProps) {
  const sheet = useApprovalSheet();
  return (
    <ApprovalReviewView sheet={sheet}
      onClose={() => void perform(ApprovalReviews.use((service) => service.close()))}
      onChoose={(decision) => void perform(ApprovalReviews.use((service) => service.choose(decision)))} />
  );
}

/**
 * The owner's two steps of an availability check: which calendars may be read, then the exact answer to share.
 * @model spec/calendar/availability.md
 */
export function AgentRequestReview(_props: AgentRequestReviewProps) {
  const sheet = useRequestSheet();
  return (
    <AgentRequestReviewView sheet={sheet}
      onChooseCalendars={(ids) => void perform(AgentRequests.use((service) => service.chooseCalendars(ids)))}
      onConfirmResult={(share) => void perform(AgentRequests.use((service) => service.confirmResult(share)))} />
  );
}
