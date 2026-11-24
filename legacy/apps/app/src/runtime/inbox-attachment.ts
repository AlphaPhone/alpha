import { reviewMailAttachment as reviewUpstreamAttachment } from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/attachment.ts';
import { refusingAttachmentReviewer } from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/attachments.ts';
export type { MailAttachment } from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/attachment.ts';

/** The upstream review, with its rejection typed. The message is unchanged. */
export const reviewMailAttachment = refusingAttachmentReviewer(reviewUpstreamAttachment);
