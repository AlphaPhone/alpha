// Every telephony completion Alpha shows (card detail, toast, receipt) is one short sentence that
// states the outcome (owner, 2026-11-17): no "The owner approved and ..." narration, no second
// explanatory or disclaimer sentence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle = await build({entryPoints: ['apps/app/src/ui/telephony/telephony-receipt-text.ts'], bundle: true, platform: 'node', format: 'esm', write: false});
const text = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const results = [
  ...['placed', 'emergency-handoff', 'not-found', 'busy', 'cancelled', 'unavailable', 'failed'].map(status => ({kind: 'phone-call', status, contact: false})),
  ...['saved', 'deleted', 'not-found', 'stale', 'cancelled', 'unavailable', 'unknown', 'failed'].map(status => ({kind: 'contact-write', status})),
  ...['drafted', 'submitted', 'sent', 'delivered', 'unknown', 'not-found', 'cancelled', 'unavailable', 'failed'].map(status => ({kind: 'sms-compose', status})),
  ...['drafted', 'none-selected', 'occupied', 'unavailable'].map(status => ({kind: 'sms-reply', status})),
  ...['deleted', 'none-selected', 'cancelled', 'unavailable', 'failed'].map(status => ({kind: 'voicemail-delete', status})),
  ...['read', 'none-selected', 'unavailable'].map(status => ({kind: 'messages-read', status})),
  ...['read', 'none-selected', 'unavailable'].map(status => ({kind: 'voicemail-read', status})),
];
const oneSentence = value => {
  assert.equal(typeof value, 'string');
  assert.match(value, /^[A-Z][^.]*\.$/, `one sentence: ${value}`);
  assert.ok(value.length <= 64, `short: ${value}`);
  assert.doesNotMatch(value, /\bowner\b|Nothing was|does not show|not yet confirmed/i, `no narration or disclaimer: ${value}`);
};

test('each telephony receipt is one short sentence', () => {
  for (const result of results) oneSentence(text.telephonyActionResultText(result));
  for (const status of ['handed-off', 'cancelled', 'unavailable', 'failed']) oneSentence(text.phoneDialResultText({status}));
});

test('the reported contact save reads as a plain confirmation and outcomes stay truthful', () => {
  assert.equal(text.telephonyActionResultText({kind: 'contact-write', status: 'saved'}), 'Contact saved.');
  // A placed call never claims it connected; a carrier hand-off never claims it was sent.
  assert.doesNotMatch(text.telephonyActionResultText({kind: 'phone-call', status: 'placed', contact: false}), /connected|answered/i);
  assert.doesNotMatch(text.telephonyActionResultText({kind: 'sms-compose', status: 'submitted'}), /\bsent\b/i);
  assert.doesNotMatch(text.phoneDialResultText({status: 'handed-off'}), /placed|connected/i);
  // A read still marks the shared content as untrusted for the agent.
  assert.match(text.telephonyActionResultText({kind: 'messages-read', status: 'read'}), /untrusted data/);
});
