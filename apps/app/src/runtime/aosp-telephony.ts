/**
 * Alpha AOSP telephony client: Contacts, Telecom and SMS/MMS on the Alpha
 * AOSP image only. The contract, parsers and client are the shared AOSP telephony profile
 * (`@elizaos/contracts/native-telephony`, served natively by plugin-native-messages' TelephonyPlugin).
 * Alpha keeps its plugin name and its unavailable answer.
 *
 * Standalone and other non-image installs have no AlphaTelephony native plugin, and this client
 * refuses every call there before anything reaches native code. A handoff never reports a call or a
 * send; a native send returns the shared `sms.send.v1` result and a repeated operation ID never sends
 * again.
 */
import {
  createTelephonyClient,
  type TelephonyClient,
  type TelephonyNativePlugin,
} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

export {
  advanceSmsState, normalizePhoneNumber, reviewMms, parseContacts, parseHandoff, parseMessages, parseSmsJournal,
  parseSmsSendResult, parseTelephonyStatus, parseThreads, registerTelephonyProfile, reviewSms, smsBindingHash, smsBindingText, smsMayBeReviewedAgain,
  TelephonyUnavailable,
  type MmsAttachmentDraft, type MmsReview, type MmsReviewProblem, type SmsReview, type SmsReviewProblem, type SmsSendResult,
} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

export {MMS_MAX_ATTACHMENTS} from '../../../../.eliza/client-features/packages/contracts/src/mms-send.ts';

export type AlphaTelephonyPlugin = TelephonyNativePlugin;
export type AospTelephony = TelephonyClient;

const ALPHA_TELEPHONY_UNAVAILABLE = 'Phone, Contacts and Messages are available only on the Alpha Phone system image.';
/** The renderer client. Off the verified image every method rejects without reaching native code. */
export function createAospTelephony(plugin: AlphaTelephonyPlugin | null, image: boolean): AospTelephony {
  return createTelephonyClient(plugin, image, { unavailableMessage: ALPHA_TELEPHONY_UNAVAILABLE });
}
