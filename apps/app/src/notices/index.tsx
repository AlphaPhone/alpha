// spec/app/notices/index.md, "Story: Open what I tapped"; spec/app/notices/collection.md, "Story: Let Alpha see my notifications"; spec/app/notices/deletions.md, "Story: Delete several things, each with its own Undo"; spec/app/notices/posting.md, "Story: Be told by Alpha's own notices"; spec/app/notices/reminders.md, "Story: See my reminders as they are"
import { Layer } from "effect";
import { type Resident, type Shown, area } from "../runtime/ui.tsx";
import { ShadeView } from "./Shade.tsx";
import { UndoBarView } from "./UndoBar.tsx";

export { openShade } from "./Shade.tsx";
export {
  ShadeShelf,
  askAboutShadeRow,
  chooseCollectionApp,
  clearAllShadeRows,
  dismissOwnRow,
  observeListenerAccess,
  setCollectionConsent,
  setPhoneLocked,
  showOwnNotices,
  switchCollectionOwner,
} from "./collection.vibe";
export {
  DeletionDesk,
  markDeletionItemChanged,
  queueDeletion,
  recoverDeletions,
  restartDeletions,
  switchDeletionsOwner,
  undoDeletion,
} from "./deletions.vibe";
export {
  NoticeDesk,
  askAboutWaitingTap,
  closeNoticeQuestion,
  confirmNoticeQuestion,
  markReviewedNoticeChanged,
  openWaitingTap,
  restartNotices,
  switchNoticeOwner,
  tapNotice,
} from "./notices.vibe";
export {
  ALPHA_CHANNEL_GROUPS,
  PostingDesk,
  acknowledgeNotice,
  canPostToChannel,
  concealNoticesForOwner,
  deliverNotice,
  markNoticeSpent,
  queueNotice,
  restartAndCheckPosting,
  retryNoticeDelivery,
} from "./posting.vibe";
export {
  NoticeRemindersDesk,
  createNoticeReminder,
  decideNoticeReminder,
  readNoticeReminders,
  restartAndRecoverNoticeReminders,
  ringNoticeReminder,
} from "./reminders.vibe";
export { keep, offer, say, withdraw } from "./toasts.vibe";

function NoticesCombined({ runtime }: Shown<Resident>) {
  return (
    <>
      <ShadeView runtime={runtime} />
      <UndoBarView runtime={runtime} />
    </>
  );
}

/** Combined Notices area (shade overlay + deferred-deletion Undo bar). */
export default area(Layer.empty, NoticesCombined);
