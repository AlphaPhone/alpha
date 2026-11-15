/**
 * Alpha's Messages session on the AOSP image. The foreground-only session and the receipt labels
 * are the shared telephony profile's (`@elizaos/contracts/native-telephony-session`); Alpha keeps
 * its own copy for sent SMS and refreshes the provider when a send receipt arrives.
 */
import {
  createSmsSession as createSharedSmsSession,
  mmsProblemLabel as sharedMmsProblemLabel,
  mmsReceiptLabel,
  smsReceiptLabel,
} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony-session.ts';
import type {AospTelephony, MmsReviewProblem} from './aosp-telephony';
export {mmsReceiptLabel};
export const receiptLabel = (status: Parameters<typeof smsReceiptLabel>[0]) =>
  status === 'sent' ? 'Sent. Delivery is unconfirmed.' : smsReceiptLabel(status);
export const mmsProblemLabel = (problem: MmsReviewProblem) => sharedMmsProblemLabel(problem, 'Alpha');
/** Provider content and page cursors exist only during the foreground Messages visit. */
export function createSmsSession(client: AospTelephony, image: boolean, onChange: () => void, onSendUpdated: (id: string) => void = () => {}, onMmsSendUpdated: (id: string) => void = () => {}) {
  const session = createSharedSmsSession(client, image, onChange, {
    onSendUpdated(id) {
      onSendUpdated(id);
      // The provider owns the outgoing bubble. Re-read after native settlement even if
      // Android's content observer missed the write or only reported the earlier outbox row.
      void session.refresh();
    },
    onMmsSendUpdated,
  });
  return session;
}
