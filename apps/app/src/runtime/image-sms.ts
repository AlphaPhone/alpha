/**
 * Alpha's Messages session on the AOSP image. The foreground-only session and the receipt labels
 * are Alpha's Messages screen state (`../ui/messages/sms-session.ts`); here Alpha words a sent SMS
 * and refreshes the provider when a send receipt arrives.
 */
import {
  createSmsSession as createScreenSmsSession,
  mmsProblemLabel as screenMmsProblemLabel,
  mmsReceiptLabel,
  smsReceiptLabel,
} from '../ui/messages/sms-session';
import type {AospTelephony, MmsReviewProblem} from './aosp-telephony';
export {mmsReceiptLabel};
export const receiptLabel = (status: Parameters<typeof smsReceiptLabel>[0]) =>
  status === 'sent' ? 'Sent. Delivery is unconfirmed.' : smsReceiptLabel(status);
export const mmsProblemLabel = (problem: MmsReviewProblem) => screenMmsProblemLabel(problem, 'Alpha');
/** Provider content and page cursors exist only during the foreground Messages visit. */
export function createSmsSession(client: AospTelephony, image: boolean, onChange: () => void, onSendUpdated: (id: string) => void = () => {}, onMmsSendUpdated: (id: string) => void = () => {}) {
  const session = createScreenSmsSession(client, image, onChange, {
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
