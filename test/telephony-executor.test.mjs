// The phone-side executor of agent-proposed telephony actions against recording ports. No device,
// address book, Telecom or radio is involved: this proves the decisions (what the owner is shown,
// what is written and under which version, and what is reported), not device behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'telephony-executor-'));
process.on('exit', () => rmSync(dir, {recursive: true, force: true}));
const output = await build({entryPoints: [resolve('apps/app/src/runtime/telephony-executor.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  alias: {'@elizaos/contracts/telephony-actions': resolve('.eliza/client-features/packages/contracts/src/telephony-actions.ts')}});
writeFileSync(join(dir, 'executor.mjs'), output.outputFiles[0].text);
const {executeTelephonyAction, appliedContactChange, refuseTelephonyAction} = await import(pathToFileURL(join(dir, 'executor.mjs')));

const priya = {id: '1', displayName: 'Priya Nair', phoneNumbers: ['+14155550132']};
const reyes = {id: '2', displayName: 'Daniel Reyes', phoneNumbers: ['+15105550119', '(510) 555-0164']};
const record = (id, version = 'a'.repeat(64)) => ({id, version, displayName: id === '1' ? 'Priya Nair' : 'Daniel Reyes',
  phoneNumbers: [{number: '+14155550132', type: 'work'}], emailAddresses: [{address: 'p@example.com', type: 'work'}]});
function ports(overrides = {}) {
  const log = [];
  const base = {
    current() {}, normalize: value => { const digits = value.replace(/[\s().-]/g, ''); return /^\+?[0-9]{2,20}$/.test(digits) ? digits : null; },
    ask: async review => { log.push(['ask', review]); return 0; },
    searchContacts: async (query, limit) => { log.push(['search', query, limit]); return [priya]; },
    placeCall: async number => { log.push(['call', number]); return {status: 'placed'}; },
    getContact: async id => { log.push(['get', id]); return record(id); },
    saveContact: async (draft, target) => { log.push(['save', draft, target]); return {status: 'saved'}; },
    removeContact: async (id, version) => { log.push(['remove', id, version]); return {status: 'deleted'}; },
    sendSms: async (number, body, operationId) => { log.push(['sms', number, body, operationId]); return 'submitted'; },
    openThread: () => null, openVoicemail: () => null, deleteOpenVoicemail: async () => 'none-selected',
    draftInOpenThread: (body, number) => { log.push(['draft', body, number]); return 'none-selected'; },
    draftFor: async (number, body) => { log.push(['draft-for', number, body]); return () => { log.push(['opened-draft', number, body]); }; },
    showContacts: async query => { log.push(['list', query]); return () => { log.push(['shown', query]); }; },
    openContact: () => null, contactValues: false,
    openKeypad: number => { log.push(['keypad', number]); return () => { log.push(['keypad-shown', number]); }; },
  };
  return {log, ports: {...base, ...overrides}};
}
const run = (operation, p, id = 'op-1') => executeTelephonyAction(operation, id, p.ports, new AbortController().signal);
const did = (p, what) => p.log.filter(([kind]) => kind === what);

test('a number is called as approved; a name is never called unseen', async () => {
  let p = ports();
  let result = await run({type: 'phone_call', target: {kind: 'number', number: '+14155550100'}}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'placed', contact: false});
  assert.equal(result.status, 'succeeded'); assert.equal(did(p, 'ask').length, 0, 'the approval already showed the number');
  p = ports();
  result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Priya'}}, p);
  assert.deepEqual(did(p, 'ask')[0][1], {kind: 'call', options: [{id: '1', name: 'Priya Nair', number: '+14155550132'}]}, 'one match is still confirmed with its number');
  assert.deepEqual(did(p, 'call'), [['call', '+14155550132']]);
  assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'placed', contact: true});
});
test('several matches are chosen on the phone, and a dismissal or no match calls nothing', async () => {
  let p = ports({searchContacts: async () => [priya, reyes], ask: async review => { p.log.push(['ask', review]); return 2; }});
  let result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Daniel'}}, p);
  assert.equal(did(p, 'ask')[0][1].options.length, 3, 'one option per dialable number');
  assert.deepEqual(did(p, 'call'), [['call', '5105550164']], 'the chosen number, normalized');
  p = ports({ask: async () => null});
  result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Priya'}}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'cancelled', contact: false}); assert.equal(did(p, 'call').length, 0);
  p = ports({searchContacts: async () => [{id: '3', displayName: 'No Number', phoneNumbers: []}]});
  result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Nobody'}}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'not-found', contact: false}); assert.equal(result.status, 'failed');
  assert.equal(did(p, 'ask').length, 0); assert.equal(did(p, 'call').length, 0);
});
test('emergency, busy and failure are reported as observed and never retried', async () => {
  for (const [answer, status, outcome] of [[{status: 'emergency-handoff'}, 'emergency-handoff', 'succeeded'], [{status: 'busy'}, 'busy', 'failed'], [{status:'failed'}, 'failed', 'failed']]) {
    const p = ports({placeCall: async number => { p.log.push(['call', number]); if (!answer) throw Error('telecom'); return answer; }});
    const result = await run({type: 'phone_call', target: {kind: 'number', number: '911'}}, p);
    assert.equal(result.telephonyResult.status, status); assert.equal(result.status, outcome); assert.equal(did(p, 'call').length, 1);
    assert.doesNotMatch(result.summary, /connected|answered the call/i);
  }
});
test('a review that is no longer current stops before anything happens', async () => {
  let calls = 0;
  const p = ports({current() { if (++calls > 2) throw Error('Phone context changed'); }});
  await assert.rejects(run({type: 'phone_call', target: {kind: 'contact', query: 'Priya'}}, p), /context changed/);
  assert.equal(did(p, 'call').length, 0);
});
test('a text to a contact shows who matched, then sends under the proposal id; an unknown outcome is not a failure', async () => {
  let p = ports();
  let result = await run({type: 'sms_compose', query: 'Priya', body: 'On my way'}, p, 'proposal-9');
  assert.deepEqual(did(p, 'ask').map(row => row[1]), [{kind: 'message', options: [{id: '1', name: 'Priya Nair', number: '+14155550132'}], body: 'On my way'}], 'one match is still confirmed with its name and number');
  assert.deepEqual(did(p, 'sms'), [['sms', '+14155550132', 'On my way', 'proposal-9']]);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'submitted'}); assert.equal(result.status, 'succeeded');
  // The lookup is a fuzzy filter: the owner can see it matched someone else and stop it.
  p = ports({ask: async review => { p.log.push(['ask', review]); return null; }});
  result = await run({type: 'sms_compose', query: 'Pri', body: 'On my way'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'cancelled'}); assert.equal(did(p, 'ask').length, 1); assert.equal(did(p, 'sms').length, 0);
  p = ports({searchContacts: async () => [reyes], ask: async review => { p.log.push(['ask', review]); return 1; }});
  await run({type: 'sms_compose', query: 'Daniel', body: 'Hi'}, p);
  assert.equal(did(p, 'ask')[0][1].kind, 'message'); assert.deepEqual(did(p, 'sms')[0].slice(1, 3), ['5105550164', 'Hi']);
  p = ports({sendSms: async () => { throw Error('bridge closed'); }});
  result = await run({type: 'sms_compose', query: 'Priya', body: 'Hi'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'unknown'}); assert.equal(result.status, 'unknown');
  p = ports({sendSms: async () => 'cancelled'});
  assert.equal((await run({type: 'sms_compose', query: 'Priya', body: 'Hi'}, p)).status, 'failed');
});
test('a reply for the open conversation is placed as a draft and never sent', async () => {
  for (const status of ['drafted', 'none-selected', 'occupied', 'unavailable']) {
    const p = ports({draftInOpenThread: body => { p.log.push(['draft', body]); return status; }});
    const result = await run({type: 'sms_reply_selected', body: 'Ten minutes away'}, p);
    assert.deepEqual(result.telephonyResult, {kind: 'sms-reply', status});
    assert.equal(result.status, status === 'drafted' ? 'succeeded' : 'failed');
    // AP-16 D5: an Alpha draft replaces unsent owner text (kept for one Undo); occupied now means a send or pictures.
    if (status === 'occupied') assert.equal(result.summary, 'That conversation has a message sending or pictures attached.');
    assert.deepEqual(did(p, 'draft'), [['draft', 'Ten minutes away']], 'no recipient is named: it is the conversation on screen');
    assert.equal(did(p, 'sms').length + did(p, 'search').length + did(p, 'ask').length, 0, 'nothing is looked up, asked or sent');
  }
});
test('a text to the contact whose conversation is open becomes a draft there instead of a separate review', async () => {
  let p = ports({draftInOpenThread: (body, number) => { p.log.push(['draft', body, number]); return 'drafted'; }});
  let result = await run({type: 'sms_compose', query: 'Priya', body: 'On my way'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'drafted'}); assert.equal(result.status, 'succeeded');
  assert.deepEqual(did(p, 'draft'), [['draft', 'On my way', '+14155550132']], 'only the conversation with exactly that number');
  assert.equal(did(p, 'sms').length, 0, 'the draft is not sent'); assert.equal(did(p, 'ask').length, 0, 'the open conversation already shows who it is');
  // A message is being sent or has pictures there, or another conversation is open: the reviewed send is used as before.
  for (const status of ['occupied', 'none-selected', 'unavailable']) {
    p = ports({draftInOpenThread: () => status});
    result = await run({type: 'sms_compose', query: 'Priya', body: 'On my way'}, p, 'proposal-3');
    assert.deepEqual(did(p, 'sms'), [['sms', '+14155550132', 'On my way', 'proposal-3']], status); assert.equal(did(p, 'ask').length, 1, status);
    assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'submitted'});
  }
});
test('a contact change shows before and after and writes under the version that was shown', async () => {
  let p = ports();
  let result = await run({type: 'contact_update', query: 'Priya', set: {phoneNumbers: ['+14155550132', '+16285550148']}}, p);
  const review = did(p, 'ask')[0][1];
  assert.equal(review.kind, 'contact-save'); assert.deepEqual(review.options[0].before.phoneNumbers, [{number: '+14155550132', type: 'work'}]);
  assert.deepEqual(review.options[0].after.phoneNumbers, [{number: '+14155550132', type: 'work'}, {number: '+16285550148', type: 'mobile'}], 'a kept number keeps its type');
  assert.deepEqual(review.options[0].after.emailAddresses, [{address: 'p@example.com', type: 'work'}], 'a field left out is unchanged');
  assert.deepEqual(did(p, 'save')[0][2], {id: '1', version: 'a'.repeat(64)});
  assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'saved'});
  p = ports({saveContact: async () => ({status: 'stale'})});
  result = await run({type: 'contact_update', query: 'Priya', set: {displayName: 'Priya N'}}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'stale'}); assert.equal(result.status, 'failed');
  p = ports({ask: async () => null});
  result = await run({type: 'contact_delete', query: 'Priya'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'cancelled'}); assert.equal(did(p, 'remove').length, 0);
  p = ports();
  result = await run({type: 'contact_delete', query: 'Priya'}, p);
  assert.deepEqual(did(p, 'remove'), [['remove', '1', 'a'.repeat(64)]]); assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'deleted'});
  p = ports({searchContacts: async () => []});
  assert.equal((await run({type: 'contact_delete', query: 'Nobody'}, p)).telephonyResult.status, 'not-found');
});
test('a new contact is written as approved when nobody in Contacts has its name or number', async () => {
  const p = ports();
  const result = await run({type: 'contact_create', contact: {displayName: 'Grace Hopper', phoneNumbers: ['+12025550101'], emailAddresses: []}}, p);
  assert.deepEqual(did(p, 'save')[0].slice(1), [{displayName: 'Grace Hopper', phoneNumbers: [{number: '+12025550101', type: 'mobile'}], emailAddresses: []}, undefined]);
  assert.deepEqual(did(p, 'search'), [['search', 'Grace Hopper', 10]]); assert.equal(did(p, 'ask').length, 0);
  assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'saved'});
});
test('a new contact that repeats a name or number is added only after the owner says Add anyway', async () => {
  const create = contact => ({type: 'contact_create', contact: {emailAddresses: [], ...contact}});
  // The same name in other letter case, and the same number under another name and formatting.
  for (const contact of [{displayName: 'priya nair', phoneNumbers: []}, {displayName: 'Priya (work)', phoneNumbers: ['+1 (415) 555-0132']}]) {
    let p = ports();
    let result = await run(create(contact), p);
    assert.deepEqual(did(p, 'ask').map(row => row[1]), [{kind: 'contact-create', options: [{name: 'Priya Nair', numbers: ['+14155550132']}]}]);
    assert.equal(did(p, 'save').length, 1, 'Add anyway writes it'); assert.equal(result.telephonyResult.status, 'saved');
    p = ports({ask: async () => null});
    result = await run(create(contact), p);
    assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'cancelled'}); assert.equal(did(p, 'save').length, 0, 'Not now writes nothing');
    assert.equal(result.summary, 'Contact change cancelled.');
  }
  // A lookup that fails cannot rule a duplicate out: nothing is written.
  const p = ports({searchContacts: async () => { throw Error('Contacts closed'); }});
  const result = await run(create({displayName: 'Grace Hopper', phoneNumbers: []}), p);
  assert.equal(result.telephonyResult.status, 'unavailable'); assert.equal(did(p, 'save').length, 0);
});
test('a change that would drop a number or address offers adding to them as well as replacing them', async () => {
  const sam = {...record('1'), displayName: 'Sam Lee', phoneNumbers: [{number: '+14155550132', type: 'mobile'}, {number: '+14155550199', type: 'work'}], emailAddresses: [{address: 'sam@work.example', type: 'work'}]};
  const update = {type: 'contact_update', query: 'Sam', set: {emailAddresses: ['sam@example.com']}};
  for (const [choice, keeps, emails] of [[0, 'add', [{address: 'sam@work.example', type: 'work'}, {address: 'sam@example.com', type: 'home'}]], [1, 'replace', [{address: 'sam@example.com', type: 'home'}]]]) {
    const p = ports({getContact: async () => sam, ask: async review => { p.log.push(['ask', review]); return choice; }});
    const result = await run(update, p);
    assert.deepEqual(did(p, 'ask')[0][1].options.map(option => option.keeps), ['add', 'replace'], 'both ways are offered for the one match');
    assert.equal(did(p, 'ask')[0][1].options[choice].keeps, keeps);
    assert.deepEqual(did(p, 'save')[0][1], {displayName: 'Sam Lee', phoneNumbers: sam.phoneNumbers, emailAddresses: emails}, keeps);
    assert.equal(result.telephonyResult.status, 'saved');
  }
  // "Change Sam's number" keeps or replaces both numbers; a number already there is not repeated.
  let p = ports({getContact: async () => sam});
  await run({type: 'contact_update', query: 'Sam', set: {phoneNumbers: ['+1 (415) 555-0199', '+16285550148']}}, p);
  assert.deepEqual(did(p, 'ask')[0][1].options.map(option => option.after.phoneNumbers.map(row => row.number)),
    [['+14155550132', '+14155550199', '+16285550148'], ['+1 (415) 555-0199', '+16285550148']]);
  // Nothing would be dropped (a rename, or a list that still holds every value): one row, as before.
  for (const set of [{displayName: 'Samuel Lee'}, {phoneNumbers: ['+14155550132', '+14155550199', '+16285550148']}]) {
    p = ports({getContact: async () => sam});
    await run({type: 'contact_update', query: 'Sam', set}, p);
    assert.deepEqual(did(p, 'ask')[0][1].options.map(option => option.keeps), [undefined]);
  }
});
test('the agent reads only what the owner has open, and a voicemail delete is the owner\'s confirmation', async () => {
  let p = ports();
  assert.deepEqual((await run({type: 'messages_read_selected'}, p)).telephonyResult, {kind: 'messages-read', status: 'none-selected'});
  assert.deepEqual((await run({type: 'voicemail_read_selected'}, p)).telephonyResult, {kind: 'voicemail-read', status: 'none-selected'});
  const thread = {participant: 'Priya Nair', messages: [{direction: 'in', date: 1, body: 'Are we still on for 7?'}], truncated: false};
  const voicemail = {caller: null, date: 5, durationSeconds: 24, transcriptState: 'ready', engine: 'device', transcript: 'Call me back.'};
  p = ports({openThread: () => thread, openVoicemail: () => voicemail, deleteOpenVoicemail: async () => 'cancelled'});
  let result = await run({type: 'messages_read_selected'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'messages-read', status: 'read', ...thread}); assert.equal(result.status, 'succeeded'); assert.match(result.summary, /^Shared the open (thread|voicemail)\.$/);
  assert.deepEqual((await run({type: 'voicemail_read_selected'}, p)).telephonyResult, {kind: 'voicemail-read', status: 'read', ...voicemail});
  result = await run({type: 'voicemail_delete_selected'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'voicemail-delete', status: 'cancelled'}); assert.equal(result.status, 'failed');
  assert.equal(did(p, 'search').length, 0, 'a read never touches the address book');
});
test('appliedContactChange matches numbers by their dialable form', () => {
  const before = record('1'); before.phoneNumbers = [{number: '(415) 555-0132', type: 'home'}];
  const normalize = value => value.replace(/[\s().-]/g, '');
  assert.deepEqual(appliedContactChange(before, {phoneNumbers: ['4155550132']}, normalize).phoneNumbers, [{number: '4155550132', type: 'home'}]);
});

test('a lost call reply stays unresolved and never becomes a definite failure', async()=>{
 const p=ports({placeCall:async number=>{p.log.push(['call',number]);throw Error('Reply lost after Telecom accepted');}});
 await assert.rejects(run({type:'phone_call',target:{kind:'number',number:'+15555550100'}},p),/Reply lost/);
 assert.equal(did(p,'call').length,1);
});
test('uncertain create, update and delete receipts stay unknown without repeating a write', async()=>{
 for(const operation of [{type:'contact_create',contact:{displayName:'Ada',phoneNumbers:[],emailAddresses:[]}},{type:'contact_update',query:'Priya',set:{displayName:'Ada'}},{type:'contact_delete',query:'Priya'}]){
  for(const lostReply of [false,true]){
   let writes=0;const unknown=async()=>{writes++;if(lostReply)throw Error('Reply lost after commit');return {status:'unknown'};};
   const p=ports({saveContact:unknown,removeContact:unknown});const result=await run(operation,p);
   assert.equal(result.status,'unknown');assert.equal(result.telephonyResult.status,'unknown');assert.equal(writes,1);
   assert.match(result.summary,/could not confirm/);assert.doesNotMatch(result.summary,/Nothing was changed/);
  }
 }
});

const coded = (message, code) => Object.assign(Error(message), {code});
test('a call the phone refused before Telecom was asked reads as unavailable, never unknown', async () => {
  for (const code of ['role-required', 'permission-required', 'unavailable', 'invalid']) {
    const p = ports({placeCall: async number => { p.log.push(['call', number]); throw coded('refused', code); }});
    const result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Priya'}}, p);
    assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'unavailable', contact: true}, code);
    assert.equal(result.status, 'failed'); assert.equal(result.summary, 'Calls are unavailable right now.'); assert.equal(did(p, 'call').length, 1, 'never retried');
  }
});
test('a contact write the phone refused before it touched the address book reads as its refusal, never unknown', async () => {
  const operations = [{type: 'contact_create', contact: {displayName: 'Ada', phoneNumbers: [], emailAddresses: []}}, {type: 'contact_update', query: 'Priya', set: {displayName: 'Ada'}}, {type: 'contact_delete', query: 'Priya'}];
  for (const operation of operations) {
    for (const [code, status] of [['permission-required', 'unavailable'], ['unavailable', 'unavailable'], ['invalid', 'failed'], ['not-found', operation.type === 'contact_create' ? 'failed' : 'not-found']]) {
      let writes = 0; const refuse = async () => { writes++; throw coded('refused', code); };
      const p = ports({saveContact: refuse, removeContact: refuse}); const result = await run(operation, p);
      assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status}, `${operation.type} ${code}`);
      assert.equal(result.status, 'failed'); assert.equal(result.summary, {unavailable: 'Contacts are unavailable right now.', failed: 'The contact change failed.', 'not-found': 'No matching contact was found.'}[status]); assert.equal(writes, 1);
    }
  }
});
test('a contact that could not be read is not reported as "no matching contact"', async () => {
  for (const operation of [{type: 'contact_update', query: 'Priya', set: {displayName: 'Ada'}}, {type: 'contact_delete', query: 'Priya'}]) {
    // Contacts paused or closed during the read: the contact may well exist.
    let p = ports({getContact: async () => { throw coded('Contacts access changed', 'unavailable'); }});
    let result = await run(operation, p);
    assert.equal(result.telephonyResult.status, 'unavailable'); assert.doesNotMatch(result.summary, /No matching contact/);
    // The only match holds more than the editor reads, or went away: it cannot be offered, and it is not "no match" either.
    for (const code of ['incomplete', 'not-found']) {
      p = ports({getContact: async () => { throw coded('skipped', code); }});
      assert.equal((await run(operation, p)).telephonyResult.status, 'unavailable', code);
      // Beside a readable match it is only left out.
      p = ports({searchContacts: async () => [priya, reyes], getContact: async id => { if (id === '1') throw coded('skipped', code); return record(id); }});
      result = await run(operation, p);
      assert.equal(did(p, 'ask')[0][1].options.length, 1); assert.match(result.telephonyResult.status, /saved|deleted/);
    }
    assert.equal(did(p, 'save').length + did(p, 'remove').length, 1);
  }
});
test('an action refused before it ran carries the typed unavailable result of its kind', () => {
  const kinds = {phone_call: 'phone-call', sms_compose: 'sms-compose', sms_reply_selected: 'sms-reply', contact_create: 'contact-write', contact_update: 'contact-write', contact_delete: 'contact-write',
    contact_show: 'contact-show', contact_read_selected: 'contact-read',
    messages_read_selected: 'messages-read', voicemail_read_selected: 'voicemail-read', voicemail_delete_selected: 'voicemail-delete'};
  for (const [type, kind] of Object.entries(kinds)) {
    const refused = refuseTelephonyAction({type}, 'Nothing was done because Alpha was not open and unlocked.');
    assert.equal(refused.status, 'failed', type); assert.equal(refused.summary, 'Nothing was done because Alpha was not open and unlocked.');
    assert.deepEqual(refused.telephonyResult, kind === 'phone-call' ? {kind, status: 'unavailable', contact: false} : {kind, status: 'unavailable'});
  }
});
test('a text to an exact number is sent straight from its approved card; a named contact is still chosen on the phone', async () => {
  let p = ports();
  let result = await run({type: 'sms_compose', target: {kind: 'number', number: '+14155550100'}, body: 'Running late'}, p, 'proposal-4');
  assert.deepEqual(did(p, 'sms'), [['sms', '+14155550100', 'Running late', 'proposal-4']]);
  assert.equal(did(p, 'ask').length + did(p, 'search').length, 0, 'the approval card already showed the number');
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'submitted'}); assert.equal(result.present, undefined);
  // That number's conversation is open: the text goes into its field, as it does for a contact.
  p = ports({draftInOpenThread: (body, number) => { p.log.push(['draft', body, number]); return 'drafted'; }});
  result = await run({type: 'sms_compose', target: {kind: 'number', number: '+14155550100'}, body: 'Running late'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'drafted'}); assert.equal(did(p, 'sms').length, 0);
  p = ports();
  result = await run({type: 'sms_compose', target: {kind: 'contact', query: 'Priya'}, body: 'Running late'}, p);
  assert.deepEqual(did(p, 'ask')[0][1], {kind: 'message', options: [{id: '1', name: 'Priya Nair', number: '+14155550132'}], body: 'Running late'});
  assert.deepEqual(did(p, 'sms')[0].slice(1, 3), ['+14155550132', 'Running late']);
});
test('a draft-only text opens that conversation with the text in its field and never sends', async () => {
  const draft = target => ({type: 'sms_compose', target, body: 'See you at 7', draft: true});
  let p = ports();
  let result = await run(draft({kind: 'number', number: '+14155550100'}), p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'drafted'}); assert.equal(result.status, 'succeeded');
  assert.deepEqual(did(p, 'draft-for'), [['draft-for', '+14155550100', 'See you at 7']]);
  assert.equal(did(p, 'opened-draft').length, 0, 'opening Messages waits for the receipt');
  result.present();
  assert.deepEqual(did(p, 'opened-draft'), [['opened-draft', '+14155550100', 'See you at 7']]);
  assert.equal(did(p, 'sms').length + did(p, 'ask').length, 0);
  // A contact is chosen on the phone first; a dismissal drafts nothing.
  p = ports();
  result = await run(draft({kind: 'contact', query: 'Priya'}), p);
  assert.equal(did(p, 'ask').length, 1); assert.deepEqual(did(p, 'draft-for'), [['draft-for', '+14155550132', 'See you at 7']]); assert.equal(did(p, 'sms').length, 0);
  p = ports({ask: async () => null});
  result = await run(draft({kind: 'contact', query: 'Priya'}), p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'cancelled'}); assert.equal(did(p, 'draft-for').length, 0); assert.equal(result.present, undefined);
  // The open conversation takes the draft at once; one that is busy is left alone and nothing is sent instead.
  p = ports({draftInOpenThread: () => 'drafted'});
  result = await run(draft({kind: 'number', number: '+14155550100'}), p);
  assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'drafted'}); assert.equal(did(p, 'draft-for').length, 0); assert.equal(result.present, undefined);
  for (const overrides of [{draftInOpenThread: () => 'occupied'}, {draftFor: async () => null}, {draftFor: async () => { throw Error('Messages closed'); }}]) {
    p = ports(overrides);
    result = await run(draft({kind: 'number', number: '+14155550100'}), p);
    assert.deepEqual(result.telephonyResult, {kind: 'sms-compose', status: 'unavailable'}); assert.equal(result.present, undefined);
    assert.equal(did(p, 'sms').length + did(p, 'opened-draft').length, 0);
  }
});
test('adding or removing one value keeps every other value of the contact as the phone holds it now', async () => {
  const sam = {...record('1'), displayName: 'Sam Lee', phoneNumbers: [{number: '(415) 555-0132', type: 'home'}, {number: '+14155550199', type: 'work'}], emailAddresses: [{address: 'Sam@Work.example', type: 'work'}]};
  const change = async operation => { const p = ports({getContact: async () => sam}); const result = await run({type: 'contact_update', query: 'Sam', ...operation}, p); return {p, result}; };
  let {p, result} = await change({add: {phoneNumbers: ['+16285550148', '4155550132'], emailAddresses: ['sam@example.com']}});
  assert.deepEqual(did(p, 'ask')[0][1].options.map(option => option.keeps), [undefined], 'one row: the request says what it adds');
  assert.equal(did(p, 'ask')[0][1].options[0].before, sam, 'the review shows the contact before');
  assert.deepEqual(did(p, 'save')[0], ['save', {displayName: 'Sam Lee',
    phoneNumbers: [...sam.phoneNumbers, {number: '+16285550148', type: 'mobile'}], emailAddresses: [...sam.emailAddresses, {address: 'sam@example.com', type: 'home'}]}, {id: '1', version: sam.version}]);
  assert.equal(did(p, 'ask')[0][1].options[0].after, did(p, 'save')[0][1], 'and exactly what is saved after');
  assert.equal(result.telephonyResult.status, 'saved');
  // Remove matches a number in its dialable form and an address without case; then add; a rename rides along.
  ({p} = await change({set: {displayName: 'Samuel Lee'}, remove: {phoneNumbers: ['4155550132'], emailAddresses: ['sam@work.example']}, add: {emailAddresses: ['sam@example.com']}}));
  assert.deepEqual(did(p, 'save')[0][1], {displayName: 'Samuel Lee', phoneNumbers: [{number: '+14155550199', type: 'work'}], emailAddresses: [{address: 'sam@example.com', type: 'home'}]});
  // A value to remove that the contact does not have changes nothing.
  ({p} = await change({remove: {phoneNumbers: ['+19995550100']}}));
  assert.deepEqual(did(p, 'save')[0][1], {displayName: 'Sam Lee', phoneNumbers: sam.phoneNumbers, emailAddresses: sam.emailAddresses});
  // A contact that changed since it was shown is stale, as for a whole-field change.
  p = ports({getContact: async () => sam, saveContact: async () => ({status: 'stale'})});
  assert.equal((await run({type: 'contact_update', query: 'Sam', add: {phoneNumbers: ['+16285550148']}}, p)).telephonyResult.status, 'stale');
  // An agent that can name single values means "replace" when it sends a whole field: one row, no second choice.
  p = ports({getContact: async () => sam, contactValues: true});
  await run({type: 'contact_update', query: 'Sam', set: {emailAddresses: ['sam@example.com']}}, p);
  assert.deepEqual(did(p, 'ask')[0][1].options.map(option => [option.keeps, option.after.emailAddresses]), [[undefined, [{address: 'sam@example.com', type: 'home'}]]]);
});
test('showing a contact opens Contacts on the matches and tells the agent only whether there was one', async () => {
  let p = ports();
  let result = await run({type: 'contact_show', query: 'Priya'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'contact-show', status: 'shown'}); assert.equal(result.status, 'succeeded');
  assert.deepEqual(did(p, 'list'), [['list', 'Priya']]); assert.equal(did(p, 'shown').length, 0, 'Contacts opens after the receipt');
  result.present();
  assert.deepEqual(did(p, 'shown'), [['shown', 'Priya']]);
  assert.doesNotMatch(JSON.stringify([result.telephonyResult, result.summary]), /Nair|4155550132/);
  for (const [overrides, status] of [[{showContacts: async () => 'not-found'}, 'not-found'], [{showContacts: async () => { throw Error('Contacts closed'); }}, 'unavailable'], [{showContacts: async () => null}, 'unavailable']]) {
    p = ports(overrides);
    result = await run({type: 'contact_show', query: 'Priya'}, p);
    assert.deepEqual(result.telephonyResult, {kind: 'contact-show', status}); assert.equal(result.status, 'failed'); assert.equal(result.present, undefined);
  }
});
test('the agent reads the open contact whole and within the contract bounds, or not at all', async () => {
  const open = {displayName: 'Priya Nair', phoneNumbers: [{number: '(415) 555-0132', type: 'work'}], emailAddresses: [{address: 'p@example.com', type: 'work'}], notes: 'Gate code 4410'};
  let p = ports({openContact: () => open});
  let result = await run({type: 'contact_read_selected'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'contact-read', status: 'read', contact: {displayName: 'Priya Nair', phoneNumbers: ['(415) 555-0132'], emailAddresses: ['p@example.com']}});
  assert.equal(result.status, 'succeeded'); assert.equal(result.summary, 'Shared the open contact.');
  assert.equal(did(p, 'search').length + did(p, 'get').length, 0, 'only the contact on screen: the address book is not searched');
  assert.deepEqual((await run({type: 'contact_read_selected'}, ports({openContact: () => ({...open, displayName: ''})}))).telephonyResult.contact.displayName, null);
  assert.deepEqual((await run({type: 'contact_read_selected'}, ports())).telephonyResult, {kind: 'contact-read', status: 'none-selected'});
  const many = Array.from({length: 33}, (_, index) => ({number: `+1415555${String(index).padStart(4, '0')}`, type: 'mobile'}));
  for (const contact of ['unavailable', {...open, phoneNumbers: many}, {...open, displayName: 'x'.repeat(129)}, {...open, emailAddresses: [{address: 'a\u0000@example.com', type: 'home'}]}]) {
    result = await run({type: 'contact_read_selected'}, ports({openContact: () => contact}));
    assert.deepEqual(result.telephonyResult, {kind: 'contact-read', status: 'unavailable'}, 'nothing is truncated or shared in part'); assert.equal(result.status, 'failed');
  }
});

test('the dialer opens the Phone keypad, filled in at most, and never dials or calls', async () => {
  for (const [operation, number] of [[{type: 'phone_keypad'}, undefined], [{type: 'phone_keypad', number: '4155550100'}, '4155550100']]) {
    const p = ports();
    const result = await run(operation, p);
    assert.deepEqual(result.telephonyResult, {kind: 'phone-keypad', status: 'opened'});
    assert.equal(result.status, 'succeeded');
    assert.deepEqual(did(p, 'keypad'), [['keypad', number]]);
    // The keypad comes in front after the receipt, like a filtered Contacts list.
    assert.deepEqual(did(p, 'keypad-shown'), []);
    result.present();
    assert.deepEqual(did(p, 'keypad-shown'), [['keypad-shown', number]]);
    for (const effect of ['call', 'ask', 'sms', 'save', 'remove']) assert.deepEqual(did(p, effect), [], effect);
  }
  const p = ports({openKeypad: () => null});
  const result = await run({type: 'phone_keypad', number: '4155550100'}, p);
  assert.deepEqual(result.telephonyResult, {kind: 'phone-keypad', status: 'unavailable'});
  assert.equal(result.status, 'failed'); assert.equal(result.present, undefined);
  assert.deepEqual(refuseTelephonyAction({type: 'phone_keypad'}, 'Alpha was not open.').telephonyResult, {kind: 'phone-keypad', status: 'unavailable'});
});

test('SMS sender uses the narrow device read and drops results after the foreground fence closes', async () => {
  const operation = {type: 'sms_latest_sender'};
  const read = async () => ({status: 'found', numberEnding: '0123'});
  const result = await run(operation, ports({latestIncomingSender:read}));
  assert.equal(result.status, 'succeeded');
  assert.deepEqual(result.telephonyResult, {kind:'sms-latest-sender',status:'found',numberEnding:'0123'});
  const cancelled = new AbortController();
  await assert.rejects(executeTelephonyAction(operation, 'cancelled',
    ports({latestIncomingSender:async () => { cancelled.abort(); return read(); }}).ports,
    cancelled.signal), /aborted/i);
});

test('an addressed read uses the negotiated full address and thread',async()=>{
  const operation={type:'sms_latest_sender',includeAddress:true};
  const sender={status:'found',address:'+14155550123',threadId:'thread:42'};
  const result=await run(operation,ports({latestIncomingSender:async include=>{assert.equal(include,true);return sender;}}));
  assert.deepEqual(result.telephonyResult,{kind:'sms-latest-sender',...sender});
  assert.equal(result.summary,sender.address);
});
