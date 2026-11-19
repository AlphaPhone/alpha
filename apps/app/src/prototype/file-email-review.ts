import { reviewMailAttachment, type MailAttachment } from '../runtime/inbox-attachment';
import { rethrowAttachmentRefusal } from '../ui/mailbox/drafts-controller';
import type { EmailTarget } from '../ui/mailbox/use-in-email';

/**
 * The explicit Email action in Files or Photos stages the attachment in a new local draft, as an
 * Android share starts a new compose; an existing draft never takes it, and nothing is sent.
 */
export function reviewFileEmail(options: {
  read: () => Promise<MailAttachment & { size: number; sha256: string }>;
  current: () => boolean;
  target: () => EmailTarget;
  /** Starts the new draft with the file while `current` holds; resolves to null, or to the reason nothing was added. */
  insert: (file: MailAttachment, token: string, current: () => boolean) => Promise<string | null>;
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
      if (options.target().token !== target.token) throw Error('The email account changed. Nothing was added.');
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
      // The draft side words its own refusal (the size policy, storage, a changed account): it is the one notice.
      const refusal = await options.insert(file, target.token, current);
      if (refusal !== null) throw Error(refusal);
      options.inserted();
    } catch (error) {
      if (current()) options.notify(error instanceof Error ? error.message : 'Couldn’t attach the file.');
    } finally {
      cancel();
    }
  })();
  return cancel;
}
