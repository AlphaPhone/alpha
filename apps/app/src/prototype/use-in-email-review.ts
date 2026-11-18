import { createInlineModal } from '../runtime/inline-modal';
import { connectionController } from '../runtime/connection-ui';
import { describeEmailTarget, fitEmailTarget, USE_IN_EMAIL_ATTACHMENT_POLICY, type EmailTarget } from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/use-in-email.ts';
import type { RenderValues, ShellHost, ShellMessage, ShellPrototype, ShellState, ViewDefinition } from './shell-types';

/** `live` is attached by agent-adapter; `emailUseRevision` only forces a render. */
type Shell = ShellHost<ShellState & { emailUseRevision?: number }> & { live?: boolean };
type Message = ShellMessage & { streaming?: boolean; interrupted?: boolean };
/** Members inbox-cloud-adapter installs; main.tsx installs it immediately before this adapter. */
type InboxView = ViewDefinition & { emailTarget(): EmailTarget; useInEmail(text: string, expected: { token: string; append?: boolean }): boolean };
type RenderedMessage = { id: Message['id']; text?: string; messageActionsRole?: string; closeMessageActions?: (event: { detail: number }) => void };
type ReplySnapshot = { id: string; text: string };
type Review = ReplySnapshot & { session: string; cloud: string; target: EmailTarget; notice: string; opener: HTMLElement | null };
/**
 * "Use in email" in the assistant conversation (review wording and limits: @elizaos/plugin-inbox/mailbox). An agent reply is offered for the email the user
 * has selected in Inbox; the review names the account and the exact draft or message, and the
 * insert is refused if any of them changed in the meantime. It only fills a local draft: sending
 * still requires the composer and the provider review.
 */
export function installUseInEmailReview(Component: { prototype: ShellPrototype }, views: Record<string, ViewDefinition>) {
  const p = Component.prototype as ShellPrototype & Shell, inbox = views.inbox as InboxView, original = p.renderVals, unmount = p.componentWillUnmount;
  const reviews = new WeakMap<object, Review>(), modals = new WeakMap<object, ReturnType<typeof createInlineModal>>();
  const refresh = (shell: Shell) => { if (shell.live !== false) shell.setState({ emailUseRevision: Date.now() }); };
  const agentSession = () => JSON.stringify(connectionController.getSnapshot().session ?? null);
  const cloudSession = () => connectionController.getCloudClient()?.sessionId || '';
  const eligible = (entry: Message | undefined): entry is Message & { id: string } => !!entry && entry.from === 'agent' && !entry.card && !entry.streaming && !entry.interrupted && typeof entry.id === 'string' && !!entry.text.trim();
  const close = (shell: Shell) => { if (reviews.delete(shell)) refresh(shell); };
  /** The review names an account, recipients and a subject: it does not outlive a locked or sleeping phone. */
  const unlocked = (state: ShellState) => (state.screen ?? 'home') === 'home';
  const presenting = (state: ShellState) => state.view === 'inbox' && unlocked(state) && ['sheet', 'full'].includes(state.chat);
  const replyCurrent = (state: ShellState, entry: ReplySnapshot) => {
    const message: Message | undefined = (state.msgs || []).find(row => row.id === entry.id);
    return eligible(message) && message.text === entry.text;
  };
  function open(shell: Shell, entry: ReplySnapshot, session: string) {
    const state = shell.S();
    if (shell.live === false || !presenting(state) || session !== agentSession() || !replyCurrent(state, entry)) return;
    // Focus returns to the reply itself: its actions menu may close while the review is open.
    reviews.set(shell, { id: entry.id, text: entry.text, session, cloud: cloudSession(), opener: document.querySelector<HTMLElement>(`[data-alpha-message-id="${CSS.escape(entry.id)}"] [data-alpha-message-text]`),
      target: fitEmailTarget(inbox.emailTarget(), entry.text), notice: '' });
    refresh(shell);
  }
  function confirm(shell: Shell, review: Review) {
    if (reviews.get(shell) !== review || !review.target.ready) return;
    const fail = (notice: string, cloud = review.cloud) => {
      // A fresh snapshot requires a fresh confirmation, even before the next render.
      reviews.set(shell, { ...review, target: fitEmailTarget(inbox.emailTarget(), review.text), notice, cloud });
      refresh(shell);
    };
    // The reply must still be the one on screen, from the same agent conversation, over the same Inbox.
    const state = shell.S();
    if (!replyCurrent(state, review) || review.session !== agentSession()) { reviews.delete(shell); shell.toast('Changed'); refresh(shell); return; }
    if (shell.live === false || !presenting(state)) { close(shell); return; }
    if (document.hidden || connectionController.getSnapshot().open) { fail('Inbox closed'); return; }
    // The notice shows the destination over the current Cloud account, so the next Confirm applies to it.
    const cloud = cloudSession();
    if (review.cloud !== cloud) { fail('Account changed', cloud); return; }
    if (!inbox.useInEmail(review.text, { token: review.target.token, append: review.target.append })) { fail('Changed'); return; }
    reviews.delete(shell);
    // Show the composer holding the suggestion; the conversation stays available from the pill.
    shell.setState({ chat: 'hidden', emailUseRevision: Date.now() });
  }
  p.renderVals = function (this: Shell) {
    const out = original.call(this) as RenderValues & { msgs?: RenderedMessage[] }, state = this.S(), source: Message[] = state.msgs || [];
    const inInbox = state.view === 'inbox' && typeof inbox?.useInEmail === 'function';
    const session = inInbox ? agentSession() : '';
    let review = reviews.get(this);
    // Leaving Inbox or the conversation, locking the phone, or losing the reply ends the review without inserting.
    if (review && (!inInbox || !presenting(state) || !replyCurrent(state, review))) { reviews.delete(this); review = undefined; }
    // Rendered rows are the newest window of the source, so match them by id, not position.
    const byId = new Map<unknown, Message>(source.map(row => [row.id, row]));
    out.msgs = (out.msgs || []).map(message => {
      const entry = byId.get(message.id);
      if (!inInbox || !message.messageActionsRole || !eligible(entry) || entry.text !== message.text) return message;
      const reply = { id: entry.id, text: entry.text };
      // The actions menu closes as the review opens; closing the review returns focus to the reply.
      return { ...message, canUseInEmail: true, useInEmail: () => { message.closeMessageActions?.({ detail: 1 }); open(this, reply, session); } };
    });
    let modal = modals.get(this);
    if (!modal) { modal = createInlineModal(() => close(this), () => reviews.get(this)?.opener || null); modals.set(this, modal); }
    out.emailUseOpen = !!review; out.emailUseModal = modal.ref;
    out.emailUse = review ? { ...describeEmailTarget(review.target), text: review.text, notice: review.notice, policy: USE_IN_EMAIL_ATTACHMENT_POLICY,
      confirm: () => confirm(this, review), close: () => { if (reviews.get(this) === review) close(this); } } : null;
    return out;
  };
  p.componentWillUnmount = function (this: Shell) { reviews.delete(this); modals.delete(this); return unmount.call(this); };
}
