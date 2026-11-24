import type { AgentReply } from '../runtime/alpha-client';
import { connectionController } from '../runtime/connection-ui';
import { inboxLocalStore } from '../runtime/inbox-local-store';
import { editCoalescer, type EditCoalescer } from '../runtime/inbox-edit-coalescer';
import { cachedDevicePreferences, readDevicePreferences } from '../browser/device-preferences';
import { emailOwnerRequest, ownerCommand, sendsSavedEmail } from '../ui/device-actions/owner-request';
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
  plainDraft?: true;
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

async function updateCard(shelf:Shelf, card:Card, changes:Partial<Card>) {
  const latest=shelf.cards.get(card.messageId)!;
  const next={...latest,...changes};
  await save(shelf,next,latest.state);
  shelf.cards.set(card.messageId,next);
  return next;
}

type EmailAccount={from:string;grant:string;token:string};
function resolvedEmailRecipients(text:string,from:string) {
  return text.split(',').map(value=>
    ['self','me','myself'].includes(value.trim().toLowerCase()) ? from : value.trim()
  ).join(', ');
}

const statusText = {
  draft: '',
  declined: 'Not sent.',
  sending: 'Check Inbox for delivery status.',
  sent: 'Sent.',
  rejected: 'Gmail rejected this email.',
  uncertain: 'Delivery is unconfirmed. Check the receipt in Inbox.',
} satisfies Record<Card['state'], string>;

function plainEmailDraftText(card:Card,to:string) {
  const status=card.state==='draft'?'Email draft saved.':statusText[card.state];
  const details=`${status}\nTo: ${to}\nSubject: ${card.subject}`;
  return card.state==='draft'?`${details}\n\n${card.body}\n\nSay “Send this email” when it’s ready.`:details;
}

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

  async function sendCard(shell:Bag,shelf:Shelf,card:Card,account:EmailAccount,
                          recipients:string[],current:()=>boolean) {
    if(!current()||card.state!=='draft'||shelf.busy.has(card.messageId))return;
    shelf.busy.add(card.messageId);
    shelf.notices.delete(card.messageId);
    const refresh=()=>{if(shell.live&&draftScope()===shelf.scope)shell.setState({});};
    refresh();
    try{
      // A waiting edit is written first, in order; Send sends exactly the content it stored.
      shelf.edits.get(card.messageId)?.flush();
      const sending=await updateCard(shelf,card,{to:recipients.join(', '),literalTo:true,from:account.from,grant:account.grant,state:'sending'});
      if(!current()){
        await updateCard(shelf,card,{state:'draft'});
        return 'Email was not sent. The account or conversation changed.';
      }
      try{
        const result=await views.inbox.sendAgentEmail(
          sending.id,{to:recipients,subject:sending.subject,body:sending.body},account.token,current,
        );
        const state: 'draft'|'sent'|'rejected'|'uncertain'=result?.state==='unsent'?'draft':result?.state==='sent'?'sent':result?.state==='rejected'?'rejected':'uncertain';
        await updateCard(shelf,card,{state});
        if(state==='draft'){
          const message=result?.detail||'Email was not sent. Check Inbox.';
          shelf.notices.set(card.messageId,message);
          return message;
        }
        return state==='sent'?'Email sent.':statusText[state];
      }catch{
        await updateCard(shelf,card,{state:'uncertain'});
        return statusText.uncertain;
      }
    }catch{
      const message='Couldn’t save the email draft. Check Inbox before trying again.';
      shelf.notices.set(card.messageId,message);
      return message;
    }finally{
      shelf.busy.delete(card.messageId);
      refresh();
    }
  }

  p.sendSavedAgentEmail = async function (authoredText:string,turnCurrent:()=>boolean) {
    if(!sendsSavedEmail(authoredText))return;
    const shelf=shelfFor(this);
    const current=()=>turnCurrent()&&this.live&&!document.hidden&&
      (shelf?draftScope()===shelf.scope:!draftScope());
    const reviewOn=async()=>(await readDevicePreferences().catch(()=>({askBeforeAgentActions:true}))).askBeforeAgentActions;
    if(!current()||await reviewOn()||!current())return;
    const choose='Which email draft should I send? Give me its recipient, subject and message.';
    if(!shelf)return choose;
    try{
      await shelf.ready;
      if(!current())return;
      await views.inbox.readyAgentEmailAccount?.();
      if(!current()||await reviewOn()||!current())return;
      const account:EmailAccount|null=views.inbox.agentEmailAccount?.();
      const unsent=[...shelf.cards.values()].filter(row=>row.state==='draft'&&row.plainDraft&&(!row.grant||row.grant===account?.grant));
      if(unsent.length!==1)return choose;
      if(!account)return 'Which Gmail account should I send from? Open Inbox to check the account.';
      const card=unsent[0];
      const recipients=draftMailRecipients(resolvedEmailRecipients(card.to,account.from));
      if(!recipients||recipients.length!==1)return 'What email address should I send this to?';
      return await sendCard(this,shelf,card,account,recipients,()=>
        current()&&cachedDevicePreferences()?.askBeforeAgentActions===false&&views.inbox.agentEmailAccount?.()?.token===account.token)
        ?? 'Check Inbox for delivery status.';
    }catch{return 'I couldn’t open the email draft. Check Inbox before trying again.';}
  };

  p.stageAgentEmailDraft = async function (reply: AgentReply, authoredText='', turnCurrent:()=>boolean=()=>true) {
    if(sendsSavedEmail(authoredText))return false;
    const draft = agentEmailDraft(reply.actionResults, reply.userMessageId);
    const shelf = draft && shelfFor(this);
    if (
      !shelf || !reply.messageId || !reply.messageBinding ||
      reply.messageBinding.conversationId !== connectionController.getSelectedConversationId() ||
      JSON.stringify(reply.messageBinding.session) !== JSON.stringify(connectionController.getSnapshot().session)
    ) return false;
    try {
      await shelf.ready;
      const current=()=>turnCurrent()&&this.live&&!document.hidden&&draftScope()===shelf.scope;
      if (!current() || shelf.cards.has(reply.messageId)) return false;
      const direct=!(await readDevicePreferences().catch(()=>({askBeforeAgentActions:true}))).askBeforeAgentActions;
      if(!current())return false;
      const explicit=direct?emailOwnerRequest(authoredText):undefined;
      const draftRequested=/^(?:draft|compose|write)\s+(?:an?\s+)?(?:email|mail)\b/i.test(ownerCommand(authoredText));
      const report=(text:string)=>{if(current())this.agentSay(text);return text;};
      if(explicit)await views.inbox.readyAgentEmailAccount?.();
      if(!current())return false;
      const account:EmailAccount|null=views.inbox.agentEmailAccount?.();
      let card:Card|undefined;
      if(draft){
        card = {
        ...draft, to: draft.to.join(', '), messageId: reply.messageId,
        from: account?.from ?? '', grant: account?.grant ?? '', state: 'draft',
        ...(direct&&draftRequested?{plainDraft:true as const}:{}),
        };
        await save(shelf, card, undefined);
        shelf.cards.set(card.messageId, card);
      }
      if(direct){
        if(card&&explicit){
          if(!account||card.grant&&card.grant!==account.grant)return report('Which Gmail account should I send from? Open Inbox to check the account.');
          const recipients=draftMailRecipients(resolvedEmailRecipients(card.to,account.from));
          if(!recipients||recipients.length!==1)return report('What email address should I send this to?');
          if(resolvedEmailRecipients(explicit.recipient,account.from).toLowerCase()!==recipients[0].toLowerCase()||
              explicit.subject!==card.subject||explicit.body!==card.body)
            return report('Tell me the exact email address, subject and message before I send.');
          if((await readDevicePreferences().catch(()=>({askBeforeAgentActions:true}))).askBeforeAgentActions)return true;
          const status=await sendCard(this,shelf,card,account,recipients,()=>
            current()&&views.inbox.agentEmailAccount?.()?.token===account.token);
          return status?report(status):false;
        }
        if(card&&draftRequested){
          if(current())this.setState({});
          return plainEmailDraftText(card,account?resolvedEmailRecipients(card.to,account.from):card.to);
        }
        if(card)return report('What email address, subject and message should I send?');
        return false;
      }
      if(!card)return false;
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
    const reviewOff=cachedDevicePreferences()?.askBeforeAgentActions===false;
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
      if(reviewOff){
        if(!card.plainDraft)return message;
        const displayText=plainEmailDraftText(card,to);
        return {...message,displayText,hasCalendarText:true,canUseInEmail:false,
          messageActionsLabel:message.messageActionsLabel?'Message actions: '+displayText:message.messageActionsLabel};
      }
      const current = () =>
        this.live && !document.hidden && draftScope() === shelf.scope &&
        shelf.cards.get(card.messageId)?.id === card.id;
      const sameAccount = () =>
        current() && views.inbox.agentEmailAccount?.()?.token === account?.token;
      const refresh = () => { if (this.live && draftScope() === shelf.scope) this.setState({}); };
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
        if(send){
          if(account&&recipients&&latest.body.trim()&&!this.S().typing&&sameAccount())
            await sendCard(this,shelf,latest,account,recipients,sameAccount);
          return;
        }
        shelf.busy.add(card.messageId);
        shelf.notices.delete(card.messageId);
        // A waiting edit is written before the decision, in order, so it never lands over it.
        shelf.edits.get(card.messageId)?.flush();
        refresh();
        try {
          await updateCard(shelf,latest,{state:'declined'});
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
