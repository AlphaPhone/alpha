import { reviewMailAttachment, type MailAttachment } from '../runtime/inbox-attachment';
import { rethrowAttachmentRefusal } from '../ui/mailbox/drafts-controller';
import type { EmailTarget } from '../ui/mailbox/use-in-email';

/** The explicit Email action stages an attachment in the local draft. */
export function reviewFileEmail(options: {
  read: () => Promise<MailAttachment & { size: number; sha256: string }>;
  current: () => boolean;
  target: () => EmailTarget;
  insert: (file: MailAttachment, token: string) => boolean;
  inserted: () => void;
  notify: (message: string) => void;
}): () => void {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const { signal } = controller;
  for (const event of ['pagehide', 'launcher-home', 'alpha-back', 'blur']) {
    window.addEventListener(event, cancel, { signal });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); }, { signal });
  const current = () => !signal.aborted && !document.hidden && options.current();
  const read = () => options.read().catch(rethrowAttachmentRefusal);

  void (async () => {
    try {
      if (!current()) return;
      const target = options.target();
      if (!target.ready) throw Error(target.reason);
      const file = await read();
      if (!current()) return;
      if (options.target().token !== target.token) throw Error('The email account or draft changed.');
      const review = await reviewMailAttachment(file).catch(rethrowAttachmentRefusal);
      if (!current()) return;
      if (review.sha256 !== file.sha256 || review.size !== file.size) {
        throw Error('The selected file changed. Select it again.');
      }
      const fresh = await read();
      if (!current()) return;
      if (fresh.name !== file.name || fresh.mimeType !== file.mimeType || fresh.dataBase64 !== file.dataBase64) {
        throw Error('The selected file changed. Select it again.');
      }
      if (!options.insert(file, target.token)) throw Error('The draft changed or this file is already attached.');
      options.inserted();
    } catch (error) {
      if (current()) options.notify(error instanceof Error ? error.message : 'Couldn’t attach the file.');
    } finally {
      cancel();
    }
  })();
  return cancel;
}
