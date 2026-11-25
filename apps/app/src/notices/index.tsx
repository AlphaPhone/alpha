// spec/app/notices/index.md, "Story: Open what I tapped"; spec/app/notices/collection.md, "Story: Let Alpha see my notifications"; spec/app/notices/deletions.md, "Story: Delete several things, each with its own Undo"; spec/app/notices/posting.md, "Story: Be told by Alpha's own notices"; spec/app/notices/reminders.md, "Story: See my reminders as they are"
import { Layer } from "effect";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { ShadeView } from "./Shade.tsx";
import { UndoBarView } from "./UndoBar.tsx";
import { collection } from "./collection.vibe";
import { deletions } from "./deletions.vibe";
import { noticeTaps } from "./notices.vibe";
import { posting } from "./posting.vibe";
import { noticeReminders } from "./reminders.vibe";
import { toasts } from "./toasts.vibe";

export { ShadeView, closeShade, openShade, shadeLayerId, type ShadeRuntime } from "./Shade.tsx";
export { UndoBarView, type UndoBarRuntime } from "./UndoBar.tsx";
export {
  ShadeShelf,
  askAboutShadeRow,
  chooseCollectionApp,
  clearAllShadeRows,
  clearShadeHistory,
  collection,
  dismissOwnRow,
  dismissShadeRow,
  observeListenerAccess,
  openListenerSettings,
  openShadeRow,
  pauseCollection,
  restartCollection,
  setCollectionConsent,
  setPhoneLocked,
  showOwnNotices,
  switchCollectionOwner,
  type CollectionHooks,
  type OwnShadeRow,
  type ShadeHistoryItem,
  type ShadeRow,
  type ShadeShelfService,
  type ShadeSnapshot,
} from "./collection.vibe";
export {
  DELETION_NOTICE_TEXT,
  DeletionDesk,
  UNDO_TOO_LATE,
  checkDeletionsStatus,
  deletions,
  dismissDeletion,
  markDeletionItemChanged,
  queueDeletion,
  recoverDeletions,
  refreshDeletion,
  restartDeletions,
  resumeDeletion,
  switchDeletionsOwner,
  undoDeletion,
  warnUndoTooLate,
  type DeletionDeskService,
  type DeletionDeskSnapshot,
  type DeletionDetail,
  type DeletionHooks,
} from "./deletions.vibe";
export {
  NoticeDesk,
  askAboutWaitingTap,
  blockNoticeTaps,
  closeNoticeQuestion,
  confirmNoticeQuestion,
  markReviewedNoticeChanged,
  noticeTaps,
  openWaitingTap,
  questionPromptFor,
  restartNotices,
  switchNoticeOwner,
  tapNotice,
  type NoticeDeskService,
  type NoticeDeskSnapshot,
  type NoticeExcerpt,
  type NoticeQuestionDraft,
  type NoticeTapHooks,
  type TapDetail,
} from "./notices.vibe";
export {
  ALPHA_CHANNEL_GROUPS,
  PostingDesk,
  acknowledgeNotice,
  canPostToChannel,
  concealNoticesForOwner,
  deliverNotice,
  markNoticeSpent,
  posting,
  queueNotice,
  restartAndCheckPosting,
  retryNoticeDelivery,
  type ChannelGate,
  type PostedNoticeDetail,
  type PostingDeskService,
  type PostingHooks,
  type PostingSnapshot,
} from "./posting.vibe";
export {
  NoticeRemindersDesk,
  createNoticeReminder,
  decideNoticeReminder,
  noticeReminders,
  readNoticeReminders,
  restartAndRecoverNoticeReminders,
  ringNoticeReminder,
  type NoticeReminderDetail,
  type NoticeRemindersDeskService,
  type NoticeRemindersHooks,
  type NoticeRemindersSnapshot,
  type ReminderOperationOutcome,
} from "./reminders.vibe";
export { Said, keep, nameOf, offer, say, toasts, withdraw, type Words } from "./toasts.vibe";

/** Resident layer for all non-toast notices machines (safe alongside existing `toasts` in resident.vibe). */
export const noticesResident = together(noticeTaps, collection, deletions, posting, noticeReminders);

/** Complete notices resident layer including `toasts`. */
export const noticesAll = together(toasts, noticesResident);

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
