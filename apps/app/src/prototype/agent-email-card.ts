import type { AgentReply } from '../runtime/alpha-client';
import { connectionController } from '../runtime/connection-ui';
import {
  agentEmailDraft,
  draftMailRecipients,
} from '../ui/mailbox/agent-email-draft';

type Bag = Record<string, any>;
type Card = {
  id: string;
  messageId: string;
  owner: string;
  from: string;
  account: string;
  to: string;
  subject: string;
  body: string;
  busy: boolean;
  finished: boolean;
  status: string;
};
const owner = () => {
  const state = connectionController.getSnapshot(),
    cloud = connectionController.getCloudClient();
  return JSON.stringify([
    state.session?.sessionId,
    connectionController.getSelectedConversationId(),
    cloud?.sessionId,
    cloud?.credentialId,
  ]);
};

/** Only a settled resident handoff can create this local editor. The Inbox journal owns Send. */
export function installAgentEmailCards(
  Component: Bag,
  views: Record<string, Bag>,
) {
  const cards = new WeakMap<object, Card>(),
    seen = new WeakMap<object, { owner: string; ids: Set<string> }>();
  const p = Component.prototype,
    render = p.renderVals;
  p.stageAgentEmailDraft = function (reply: AgentReply) {
    const draft = agentEmailDraft(reply.actionResults, reply.userMessageId);
    if (
      !draft ||
      !reply.messageId ||
      !reply.messageBinding ||
      reply.messageBinding.conversationId !==
        connectionController.getSelectedConversationId() ||
      JSON.stringify(reply.messageBinding.session) !==
        JSON.stringify(connectionController.getSnapshot().session)
    )
      return;
    const binding = owner();
    let recent = seen.get(this);
    if (!recent || recent.owner !== binding) {
      recent = { owner: binding, ids: new Set() };
      seen.set(this, recent);
    }
    if (recent.ids.has(draft.id)) return false;
    recent.ids.add(draft.id);
    if (recent.ids.size > 128)
      recent.ids.delete(recent.ids.values().next().value!);
    cards.set(this, {
      ...draft,
      to: draft.to.join(', '),
      messageId: reply.messageId,
      owner: binding,
      from: '',
      account: '',
      status: '',
      busy: false,
      finished: false,
    });
    this.setState({});
    void views.inbox
      .readyAgentEmailAccount?.()
      .catch(() => {})
      .finally(() => {
        if (this.live && owner() === binding) this.setState({});
      });
    return true;
  };
  p.renderVals = function () {
    const out = render.call(this),
      card = cards.get(this);
    if (!card) return out;
    const account = views.inbox.agentEmailAccount?.();
    if (
      card.owner !== owner() ||
      (card.account && account?.token !== card.account)
    ) {
      cards.delete(this);
      return out;
    }
    if (account && !card.account) {
      card.account = account.token;
      card.from = account.from;
      card.to = card.to
        .split(',')
        .map((s) =>
          ['self', 'me', 'myself'].includes(s.trim().toLowerCase())
            ? account.from
            : s.trim(),
        )
        .join(', ');
    }
    const current = () =>
      this.live &&
      !document.hidden &&
      cards.get(this) === card &&
      card.owner === owner() &&
      views.inbox.agentEmailAccount?.()?.token === card.account;
    const edit = (key: 'to' | 'subject' | 'body', event: Event) => {
      if (card.busy || card.finished || !current()) return;
      card[key] = (event.target as HTMLInputElement).value;
      this.setState({});
    };
    const send = async () => {
      if (card.busy || card.finished || this.S().typing || !current()) return;
      const to = draftMailRecipients(card.to);
      if (!to || !card.body.trim()) return;
      card.busy = true;
      this.setState({});
      try {
        const result = await views.inbox.sendAgentEmail(
          card.id,
          { to, subject: card.subject, body: card.body },
          card.account,
          current,
        );
        if (!current()) return;
        card.finished = !!result && result.state !== 'unsent';
        card.status =
          result?.state === 'sent'
            ? 'Sent.'
            : result?.state === 'rejected'
              ? 'Gmail rejected this email.'
              : card.finished
                ? 'Delivery is unconfirmed. Check the receipt in Inbox.'
                : result?.detail || 'Email was not sent. Check Inbox.';
      } catch {
        if (current()) {
          card.finished = true;
          card.status = 'Check the email receipt in Inbox.';
        }
      } finally {
        card.busy = false;
        if (this.live) this.setState({});
      }
    };
    const presentation = {
      ...card,
      editing: !card.finished,
      locked: card.busy || !account,
      sendDisabled:
        !account ||
        card.busy ||
        this.S().typing ||
        !draftMailRecipients(card.to) ||
        !card.body.trim(),
      missingAccount: !account,
      openInbox: () => this.openView('inbox', undefined, 'sheet'),
      changeTo: (e: Event) => edit('to', e),
      changeSubject: (e: Event) => edit('subject', e),
      changeBody: (e: Event) => edit('body', e),
      send,
      discard: () => {
        if (card.busy || cards.get(this) !== card) return;
        cards.delete(this);
        this.setState({});
      },
    };
    out.msgs = (out.msgs || []).map((m: Bag) =>
      m.id === card.messageId
        ? { ...m, canUseInEmail: false, emailDraft: presentation }
        : m,
    );
    return out;
  };
}
