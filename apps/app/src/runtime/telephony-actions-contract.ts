/**
 * Shared owner-approved telephony actions (@elizaos/contracts/telephony-actions): a call placed after
 * approval, a text or a draft to a contact or a number, contact changes, Contacts filtered to a
 * search, and reads of the thread, voicemail or contact the owner has open. Advertised on the
 * verified Alpha image only.
 */
export {
  isTelephonyAction, telephonyActionCapabilities, validateTelephonyAction,
  PHONE_CALL_CAPABILITY, CONTACT_WRITE_CAPABILITY, CONTACT_UPDATE_VALUES_CAPABILITY, CONTACT_SHOW_CAPABILITY, CONTACT_READ_CAPABILITY,
  SMS_COMPOSE_CAPABILITY, SMS_COMPOSE_TARGET_CAPABILITY, MESSAGES_READ_CAPABILITY, VOICEMAIL_READ_CAPABILITY, VOICEMAIL_DELETE_CAPABILITY,
  type TelephonyActionOperation,
} from '../../../../.eliza/client-features/packages/contracts/src/telephony-actions.ts';
