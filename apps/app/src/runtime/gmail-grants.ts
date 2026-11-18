/**
 * Incremental Gmail grants are the shared
 * managed mailbox policy in @elizaos/plugin-inbox/mailbox. Alpha asks first for
 * read access only; mailbox changes are one incremental "modify" consent.
 */
export {
  GMAIL_MODIFY_CAPABILITIES,
  GMAIL_READ_CAPABILITY,
  gmailActionGrant,
  gmailCapabilitiesFor,
  gmailGrantChange,
  gmailGrantLabel,
  gmailGrantTier,
  gmailInboxAllows,
  gmailModifyIncomplete,
  gmailReadCacheKey,
  googleAccountAccessLabel,
  requiredGmailCapability,
} from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/grants.ts';
