import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentEmailDraft,
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
