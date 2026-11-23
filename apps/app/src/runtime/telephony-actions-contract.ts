/**
 * Shared owner-approved telephony actions (@elizaos/contracts/telephony-actions): a call placed after
 * approval, a text or a draft to a contact or a number, contact changes, Contacts filtered to a
 * search, and reads of the thread, voicemail or contact the owner has open. Advertised on the
 * verified Alpha image only.
 */
export {
  isTelephonyAction, telephonyActionCapabilities,
  CONTACT_UPDATE_VALUES_CAPABILITY, CONTACT_WRITE_CAPABILITY, SMS_COMPOSE_CAPABILITY, SMS_COMPOSE_TARGET_CAPABILITY,
} from '../../../../.eliza/client-features/packages/contracts/src/telephony-actions.ts';
