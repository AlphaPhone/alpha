import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentEmailDraft,
  agentEmailSend,
  draftMailRecipients,
  draftRecipientList,
} from '../apps/app/src/ui/mailbox/agent-email-draft.ts';
const id = 'fda73825-d24c-4bf8-b188-52287e34c4c4';
const draft = {
  version: 1,
  requestMessageId: id,
  to: ['self'],
  subject: 'Shoot plan',
  body: 'Pack the tripod.',
};
const handoff = (offer, actionName = 'MESSAGE') => ({
  success: true,
  actionName,
  values: { mode: 'local-compose', targetId: 'inbox', emailDraft: offer },
});

test('a chat draft Send is prepared under a valid Gmail operation UUID naming its turn and exact content', () => {
  const turn = 'fda73825-d24c-0bf8-b188-52287e34c4c4';
  const account = { grant: 'grant-a', from: 'owner@example.invalid' };
  const mail = { to: ['crew@example.invalid'], subject: 'Shoot plan', body: 'Pack the tripod.' };
  const sending = agentEmailSend(turn, account, mail);
  assert.match(sending.requestId, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(sending.draftId, 'agent-email:' + turn);
  assert.deepEqual(sending.proposal, {
    mode: 'compose', to: ['crew@example.invalid'], cc: [], bcc: [],
    subject: 'Shoot plan', bodyText: 'Pack the tripod.', attachments: [],
  });
  assert.notEqual(sending.proposal.to, mail.to);
  // A retry of the same email reuses its ID, so a repeated prepare stays idempotent.
  assert.equal(agentEmailSend(turn, { ...account }, { ...mail, to: [...mail.to] }).requestId, sending.requestId);
  assert.equal(agentEmailSend(turn.toUpperCase(), account, mail).requestId, sending.requestId);
  // Cloud keeps an ID bound to the first operation prepared under it. An edited email, another
  // account or another turn is prepared under its own ID, never the turn ID itself.
  for (const [messageId, owner, changed] of [
    [turn, account, { ...mail, body: 'Pack the tripod and the blue notebook.' }],
    [turn, account, { ...mail, body: 'Pack the tripod. ' }],
    [turn, account, { ...mail, subject: 'Shoot plan, day two' }],
    [turn, account, { ...mail, to: ['crew@example.invalid', 'owner@example.invalid'] }],
    [turn, account, { ...mail, to: ['owner@example.invalid'] }],
    [turn, { ...account, grant: 'grant-b' }, mail],
    [turn, { ...account, from: 'other@example.invalid' }, mail],
    ['fda73825-d24c-0bf8-b188-52287e34c4c5', account, mail],
  ])
    assert.notEqual(agentEmailSend(messageId, owner, changed).requestId, sending.requestId);
  assert.notEqual(agentEmailSend(id, account, mail).requestId, id);
});

test('only one successful, exact-turn local handoff creates an editable email', () => {
  const expected = {
    id,
    to: ['self'],
    subject: 'Shoot plan',
    body: 'Pack the tripod.',
  };
  for (const actionName of ['MESSAGE', 'MESSAGE_DRAFT_FOLLOWUP', 'MESSAGE_SEND_DRAFT', 'MESSAGE_SEND']) {
    assert.deepEqual(agentEmailDraft([handoff(draft, actionName)], id), expected);
  }
  for (const results of [
    [
      {
        success: true,
        actionName: 'MESSAGE',
        text: 'Ready to send: crew@example.invalid',
      },
    ],
    [handoff({ ...draft, requestMessageId: crypto.randomUUID() })],
    [handoff(draft, 'MESSAGE_DRAFT_REPLY')],
    [{ ...handoff(draft), success: false }],
    [handoff(draft), handoff(draft)],
    [handoff({ ...draft, subject: 'one\ntwo' })],
  ]) {
    assert.equal(agentEmailDraft(results, id), undefined);
  }
});
test('an edited address list must be complete before Send', () => {
  assert.deepEqual(
    draftMailRecipients(
      'one@example.invalid, one@example.invalid, two@example.invalid',
    ),
    ['one@example.invalid', 'two@example.invalid'],
  );
  for (const value of [
    '',
    'self',
    'one@example.invalid,',
    'one@example.invalid, not an address',
    'one@example.invalid\ntwo@example.invalid',
    '<one@example.invalid>',
    'one@example.invalid; two@example.invalid',
  ])
    assert.equal(draftMailRecipients(value), undefined);
});
test('every entry of a To line is listed once, in order, for the owner to check', () => {
  assert.deepEqual(
    draftRecipientList('one@example.invalid, two@example.invalid,three@example.invalid, one@example.invalid'),
    ['one@example.invalid', 'two@example.invalid', 'three@example.invalid'],
  );
  assert.deepEqual(draftRecipientList('one@example.invalid, Bob,'), ['one@example.invalid', 'Bob']);
  assert.deepEqual(draftRecipientList(' , '), []);
  const twenty = Array.from({ length: 20 }, (_, n) => `crew${n}@example.invalid`);
  assert.deepEqual(draftRecipientList(twenty.join(', ')), twenty);
});
