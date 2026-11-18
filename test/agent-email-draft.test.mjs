import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentEmailDraft,
  agentEmailOperationId,
  draftMailRecipients,
} from '../apps/app/src/ui/mailbox/agent-email-draft.ts';
const id = 'fda73825-d24c-4bf8-b188-52287e34c4c4';
const draft = {
  version: 1,
  requestMessageId: id,
  to: ['self'],
  subject: 'Shoot plan',
  body: 'Pack the tripod.',
};
const handoff = (offer) => ({
  success: true,
  actionName: 'MESSAGE',
  values: { mode: 'local-compose', targetId: 'inbox', emailDraft: offer },
});

test('a version-zero conversation ID gets a stable, valid Gmail operation ID', () => {
  const messageId = 'fda73825-d24c-0bf8-b188-52287e34c4c4';
  const operationId = agentEmailOperationId(messageId);
  assert.match(operationId, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(agentEmailOperationId(messageId.toUpperCase()), operationId);
  assert.notEqual(agentEmailOperationId('fda73825-d24c-0bf8-b188-52287e34c4c5'), operationId);
  assert.equal(agentEmailOperationId(id), id);
});

test('only one successful, exact-turn local handoff creates an editable email', () => {
  assert.deepEqual(agentEmailDraft([handoff(draft)], id), {
    id,
    to: ['self'],
    subject: 'Shoot plan',
    body: 'Pack the tripod.',
  });
  for (const results of [
    [
      {
        success: true,
        actionName: 'MESSAGE',
        text: 'Ready to send: crew@example.invalid',
      },
    ],
    [handoff({ ...draft, requestMessageId: crypto.randomUUID() })],
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
  ])
    assert.equal(draftMailRecipients(value), undefined);
});
