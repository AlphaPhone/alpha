/**
 * Alpha AOSP telephony client (issues #420 and #421): Contacts, Telecom and SMS/MMS on the Alpha
 * AOSP image only. The contract, parsers and client are the shared AOSP telephony profile
 * (`@elizaos/contracts/native-telephony`, served natively by plugin-native-messages' TelephonyPlugin).
 * Alpha keeps its plugin name, its unavailable answer and these legacy export names.
 *
 * Standalone and other non-image installs have no AlphaTelephony native plugin, and this client
 * refuses every call there before anything reaches native code. A handoff never reports a call or a
 * send; a native send returns the shared `sms.send.v1` result and a repeated operation ID never sends
 * again.
 */
import {
  createTelephonyClient,
  type TelephonyAccessKind,
  type TelephonyClient,
  type TelephonyContactCard,
  type TelephonyHandoffResult,
  type TelephonyHandoffStatus,
  type TelephonyNativePlugin,
  type TelephonyPermissionState,
  type TelephonyRoleState,
  type TelephonySubscription,
} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

export {
  advanceSmsState, normalizePhoneNumber, reviewMms, parseContacts, parseHandoff, parseMessages, parseSmsJournal,
  parseSmsSendResult, parseTelephonyStatus, parseThreads, registerTelephonyProfile, reviewSms, smsBindingHash, smsBindingText, smsMayBeReviewedAgain,
  SMS_DIRECT_MAX_RECIPIENTS, SMS_MAX_RECIPIENTS, SMS_MAX_THREADS, TelephonyUnavailable,
  type MessageDirection, type MmsAttachmentDraft, type MmsReview, type MmsReviewProblem, type MmsSendResult, type MessageStatus, type SmsMessage, type SmsReview, type SmsReviewProblem, type SmsSendResult,
  type SmsSendState, type SmsThread, type TelephonyRole, type TelephonyStatus,
} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

export {MMS_MAX_ATTACHMENTS} from '../../../../.eliza/client-features/packages/contracts/src/mms-send.ts';

export type PermissionState = TelephonyPermissionState;
export type RoleState = TelephonyRoleState;
export type Subscription = TelephonySubscription;
export type ContactCard = TelephonyContactCard;
export type HandoffStatus = TelephonyHandoffStatus;
export type HandoffResult = TelephonyHandoffResult;
export type AccessKind = TelephonyAccessKind;
export type AlphaTelephonyPlugin = TelephonyNativePlugin;
export type AospTelephony = TelephonyClient;

export const ALPHA_TELEPHONY_UNAVAILABLE = 'Phone, Contacts and Messages are available only on the Alpha Phone system image.';
/** The renderer client. Off the verified image every method rejects without reaching native code. */
export function createAospTelephony(plugin: AlphaTelephonyPlugin | null, image: boolean): AospTelephony {
  return createTelephonyClient(plugin, image, { unavailableMessage: ALPHA_TELEPHONY_UNAVAILABLE });
}

/** The action-journal entry of the card the owner approved in the chat. */
export type ApprovedCard = {scope: string; proposalId: string};
/**
 * The client for one approved card's text. The card the owner approved is the confirmation, so
 * Android shows no dialog of its own: every native `sendSms` names that card's journal entry, and
 * AlphaTelephonyBase sends only the exact recipients, text and SIM that entry approved, once
 * (AlphaApprovedSms). Every other method is the plain client's.
 */
export function approvedCardTelephony(plugin: AlphaTelephonyPlugin, card: ApprovedCard): AospTelephony {
  const journalIdentity = {scope: card.scope, proposalId: card.proposalId};
  return createAospTelephony(new Proxy(plugin, {
    get(bridge, method) {
      if (method === 'sendSms') return (request: Parameters<AlphaTelephonyPlugin['sendSms']>[0]) => bridge.sendSms({...request, journalIdentity} as typeof request);
      const value = Reflect.get(bridge, method);
      return typeof value === 'function' ? value.bind(bridge) : value;
    },
  }), true);
}
