import type { AgentReply } from '../runtime/alpha-client';
import { connectionController } from '../runtime/connection-ui';
import { inboxLocalStore } from '../runtime/inbox-local-store';
import { editCoalescer, type EditCoalescer } from '../runtime/inbox-edit-coalescer';
import {
  agentEmailDraft,
  draftMailRecipients,
  draftRecipientList,
} from '../ui/mailbox/agent-email-draft';

type Bag = Record<string, any>;
type Card = {
  id: string;
  messageId: string;
  from: string;
  grant: string;
  to: string;
  /** The To line is the owner's own text: the agent's `self` was resolved before the first edit. */
  literalTo?: boolean;
  subject: string;
  body: string;
  state: 'draft' | 'declined' | 'sending' | 'sent' | 'rejected' | 'uncertain';
};
/** An edited draft card waiting to be written, with the shelf revision it was made on. */
type Edit = { card: Card; revision: number };
type Shelf = {
  scope: string;
  slot: Promise<string>;
  ready: Promise<void>;
  writes: Promise<void>;
  saved: Card[] | null;
  cards: Map<string, Card>;
  busy: Set<string>;
  notices: Map<string, string>;
  edits: Map<string, EditCoalescer<Edit>>;
  revision: number;
};

function draftScope() {
  const { session, cloudAccount } = connectionController.getSnapshot();
  const conversation = connectionController.getSelectedConversationId();
  if (!session || !cloudAccount?.userId || !conversation) return;
  return JSON.stringify([
    session.origin, session.ownerId, session.agentId, conversation,
    cloudAccount.environment, cloudAccount.userId, cloudAccount.organizationId ?? '',
  ]);
}

async function shelfSlot(scope: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return 'inbox-drafts:v1:chat:' + hash;
}

function save(shelf: Shelf, card: Card, expected: Card['state'] | undefined, revision = shelf.revision) {
  const write = shelf.writes.then(async () => {
    await shelf.ready;
    const saved = shelf.saved;
    if (revision !== shelf.revision || saved?.find(row => row.messageId === card.messageId)?.state !== expected)
      throw Error('The email draft changed. Review it again.');
    const next = (saved ?? []).filter(row => row.messageId !== card.messageId);
    next.push(card);
    const slot = await shelf.slot;
    const result = await inboxLocalStore.compareExchange(slot, saved, next);
    if (result.status === 'conflict') {
      shelf.revision++;
      shelf.saved = await inboxLocalStore.read<Card[]>(slot);
      shelf.cards = new Map((shelf.saved ?? []).map(row => [row.messageId, row]));
      throw Error('The email draft changed. Review it again.');
    }
    shelf.saved = next;
  });
  shelf.writes = write.catch(() => {});
  return write;
}

const statusText = {
  draft: '',
  declined: 'Not sent.',
  sending: 'Check Inbox for delivery status.',
  sent: 'Sent.',
  rejected: 'Gmail rejected this email.',
  uncertain: 'Delivery is unconfirmed. Check the receipt in Inbox.',
} satisfies Record<Card['state'], string>;

/** Restore local chat drafts by their original reply. The Inbox journal owns provider effects. */
export function installAgentEmailCards(
  Component: Bag,
  views: Record<string, Bag>,
) {
  const shelves = new WeakMap<object, Shelf>();
  const p = Component.prototype, render = p.renderVals;
  // Leaving the app writes each waiting edit at once, held or not, as the Inbox composer does.
  const waiting = new Set<EditCoalescer<Edit>>();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const edits of [...waiting]) edits.flush();
  });

  /** One card's edits, written after each is shown. While a write is in flight only the latest
   * edit waits, as inbox-unsaved.ts retains Inbox edits, so typing never queues a write per key.
   * An edit made before a conflict reload is refused with its revision, never written over it. */
  function editsFor(shell: Bag, shelf: Shelf, messageId: string) {
    const known = shelf.edits.get(messageId);
    if (known) return known;
    const refresh = () => { if (shell.live && draftScope() === shelf.scope) shell.setState({}); };
    const edits: EditCoalescer<Edit> = editCoalescer<Edit>(({ card, revision }) => {
      waiting.delete(edits);
      edits.hold();
      void save(shelf, card, 'draft', revision).then(
        () => { if (shelf.cards.get(messageId) === card && shelf.notices.delete(messageId)) refresh(); },
        () => { shelf.notices.set(messageId, 'Couldn’t save the draft. Try again.'); refresh(); },
      ).finally(() => edits.release());
    }, { delay: 0 });
    shelf.edits.set(messageId, edits);
    return edits;
  }

  function shelfFor(shell: Bag) {
    const scope = draftScope(), previous = shelves.get(shell);
    if (!scope) {
      shelves.delete(shell);
      return;
    }
    if (previous?.scope === scope) return previous;
    const shelf: Shelf = {
      scope, slot: shelfSlot(scope), ready: Promise.resolve(), writes: Promise.resolve(),
      saved: null, cards: new Map(), busy: new Set(), notices: new Map(), edits: new Map(), revision: 0,
    };
    shelves.set(shell, shelf);
    shelf.ready = shelf.slot.then(async slot => {
      shelf.saved = await inboxLocalStore.read<Card[]>(slot);
      shelf.cards = new Map((shelf.saved ?? []).map(row => [row.messageId, row]));
      if (shelf.cards.size && shell.live && shelves.get(shell) === shelf) {
        shell.setState({});
        void Promise.resolve(views.inbox.readyAgentEmailAccount?.()).catch(() => {}).finally(() => {
          if (shell.live && shelves.get(shell) === shelf) shell.setState({});
        });
      }
    });
    void shelf.ready.catch(() => {});
    return shelf;
  }

  p.stageAgentEmailDraft = async function (reply: AgentReply) {
    const draft = agentEmailDraft(reply.actionResults, reply.userMessageId);
    const shelf = draft && shelfFor(this);
    if (
      !draft || !shelf || !reply.messageId || !reply.messageBinding ||
      reply.messageBinding.conversationId !== connectionController.getSelectedConversationId() ||
      JSON.stringify(reply.messageBinding.session) !== JSON.stringify(connectionController.getSnapshot().session)
    ) return false;
    try {
      await shelf.ready;
      if (!this.live || draftScope() !== shelf.scope || shelf.cards.has(reply.messageId)) return false;
      const account = views.inbox.agentEmailAccount?.();
      const card: Card = {
        ...draft, to: draft.to.join(', '), messageId: reply.messageId,
        from: account?.from ?? '', grant: account?.grant ?? '', state: 'draft',
      };
      await save(shelf, card, undefined);
      shelf.cards.set(card.messageId, card);
      if (this.live && draftScope() === shelf.scope) {
        this.setState({});
        void Promise.resolve(views.inbox.readyAgentEmailAccount?.())
          .catch(() => {})
          .finally(() => {
            if (this.live && draftScope() === shelf.scope) this.setState({});
          });
      }
      return true;
    } catch {
      if (this.live && draftScope() === shelf.scope) this.toast('Couldn’t save the email draft.');
      return false;
    }
  };

  p.renderVals = function () {
    const out = render.call(this), shelf = shelfFor(this);
    if (!shelf?.cards.size) return out;
    const selectedAccount = views.inbox.agentEmailAccount?.();
    out.msgs = (out.msgs || []).map((message: Bag) => {
      const card = shelf.cards.get(message.id);
      if (!card) return message;
      const account = selectedAccount && (!card.grant || selectedAccount.grant === card.grant)
        ? selectedAccount : null;
      // The agent's `self` names the selected account. The owner's own To text is shown and sent as typed.
      const addressLine = (row: Card) => !account || row.literalTo ? row.to : row.to.split(',').map(value =>
        ['self', 'me', 'myself'].includes(value.trim().toLowerCase()) ? account.from : value.trim()
      ).join(', ');
      const to = addressLine(card);
      const current = () =>
        this.live && !document.hidden && draftScope() === shelf.scope &&
        shelf.cards.get(card.messageId)?.id === card.id;
      const sameAccount = () =>
        current() && views.inbox.agentEmailAccount?.()?.token === account?.token;
      const refresh = () => { if (this.live && draftScope() === shelf.scope) this.setState({}); };
      const update = async (changes: Partial<Card>) => {
        const latest = shelf.cards.get(card.messageId)!;
        const next = { ...latest, ...changes };
        await save(shelf, next, latest.state);
        shelf.cards.set(card.messageId, next);
        return next;
      };
      const reportError = () => { shelf.notices.set(card.messageId, 'Couldn’t save the draft. Try again.'); };
      const edit = (key: 'to' | 'subject' | 'body', event: Event) => {
        if (!account || !sameAccount() || shelf.busy.has(card.messageId)) return;
        const latest = shelf.cards.get(card.messageId)!;
        if (latest.state !== 'draft') return;
        const next = {
          ...latest, from: account.from, grant: account.grant, to: addressLine(latest), literalTo: true,
          [key]: (event.target as HTMLInputElement | HTMLTextAreaElement).value,
        };
        shelf.notices.delete(card.messageId);
        // Show the edit in this event, as the Inbox composer does, so the controlled field keeps
        // its text, caret and composition, then write it. Send writes exactly this content first.
        shelf.cards.set(card.messageId, next);
        refresh();
        const edits = editsFor(this, shelf, card.messageId);
        waiting.add(edits);
        edits.push({ card: next, revision: shelf.revision });
      };
      const decide = async (send: boolean) => {
        if (!current() || shelf.busy.has(card.messageId)) return;
        const latest = shelf.cards.get(card.messageId)!;
        if (latest.state !== 'draft') return;
        const addressText = addressLine(latest);
        const recipients = draftMailRecipients(addressText);
        if (send && (!account || !recipients || !latest.body.trim() || this.S().typing || !sameAccount())) return;
        shelf.busy.add(card.messageId);
        shelf.notices.delete(card.messageId);
        // A waiting edit is written before the decision, in order, so it never lands over it.
        shelf.edits.get(card.messageId)?.flush();
        refresh();
        try {
          const address = account ? { to: addressText, literalTo: true, from: account.from, grant: account.grant } : {};
          // Nothing is prepared unless this write of the shown content succeeds; Send sends what it stored.
          const sending = await update({ ...address, state: send ? 'sending' : 'declined' });
          if (!send || !account || !recipients) return;
          if (!sameAccount()) {
            await update({ state: 'draft' });
            return;
          }
          try {
            const result = await views.inbox.sendAgentEmail(
              sending.id, { to: recipients, subject: sending.subject, body: sending.body }, account.token, sameAccount,
            );
            await update({ state: result?.state === 'unsent' ? 'draft' :
              result?.state === 'sent' || result?.state === 'rejected' ? result.state : 'uncertain' });
            if (result?.state === 'unsent')
              shelf.notices.set(card.messageId, result.detail || 'Email was not sent. Check Inbox.');
          } catch {
            // The persisted sending state also survives a process exit or an unavailable journal.
            await update({ state: 'uncertain' });
          }
        } catch {
          reportError();
        } finally {
          shelf.busy.delete(card.messageId);
          refresh();
        }
      };
      const busy = shelf.busy.has(card.messageId);
      // The single-line field shows only the start of a long list, and this Send has no review
      // sheet, so every recipient is listed under the field.
      const listed = draftRecipientList(to);
      return { ...message, canUseInEmail: false, emailDraft: {
        ...card, from: card.from || account?.from, to, busy,
        recipients: listed.map(address => ({ address })),
        recipientCount: listed.length ? listed.length + (listed.length === 1 ? ' recipient' : ' recipients') : '',
        editing: card.state === 'draft',
        settled: card.state !== 'draft',
        locked: busy || card.state !== 'draft' || !account,
        sendDisabled: !account || busy || this.S().typing || !draftMailRecipients(to) || !card.body.trim(),
        missingAccount: !account,
        status: busy ? '' : statusText[card.state] || shelf.notices.get(card.messageId),
        openInbox: () => this.openView('inbox', undefined, 'sheet'),
        changeTo: (e: Event) => edit('to', e),
        changeSubject: (e: Event) => edit('subject', e),
        changeBody: (e: Event) => edit('body', e),
        send: () => void decide(true),
        discard: () => void decide(false),
      } };
    });
    return out;
  };
}
