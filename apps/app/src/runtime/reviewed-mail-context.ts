/**
 * The shared reviewed mail context (plugin-inbox `mailbox/mail-context.ts`), with its refusals
 * worded by Alpha (ui/mailbox/mail-context-messages.ts): a review or a send that fails throws
 * Alpha's sentence, never the shared module's.
 */
import {
  reviewMailContext as reviewSharedMailContext,
  validateMailContext as validateSharedMailContext,
  type MailContextDestination,
  type MailContextSource,
  type ReviewedMailContext,
} from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/mail-context.ts';
import {mailContextErrorText} from '../ui/mailbox/mail-context-messages';

export type {MailContextDestination, MailContextSource, ReviewedMailContext};

export async function reviewMailContext(source: MailContextSource, destination: MailContextDestination): Promise<ReviewedMailContext> {
  try { return await reviewSharedMailContext(source, destination); }
  catch (error) { throw new Error(mailContextErrorText(error)); }
}

export async function validateMailContext(review: ReviewedMailContext, source: MailContextSource, destination: MailContextDestination): Promise<string> {
  try { return await validateSharedMailContext(review, source, destination); }
  catch (error) { throw new Error(mailContextErrorText(error)); }
}
