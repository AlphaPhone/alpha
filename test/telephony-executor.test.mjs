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
test('a text to a contact shows who matched, then uses the native review under the proposal id; an unknown outcome is not a failure', async () => {
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
    if (status === 'occupied') assert.equal(result.summary, 'A message is being sent or has pictures attached in that conversation. Nothing was changed.');
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
    assert.match(result.summary, /Nothing was changed/);
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
  assert.deepEqual(result.telephonyResult, {kind: 'messages-read', status: 'read', ...thread}); assert.equal(result.status, 'succeeded'); assert.match(result.summary, /untrusted data/);
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
test('a call the phone refused before Telecom was asked is "nothing was called", never unknown', async () => {
  for (const code of ['role-required', 'permission-required', 'unavailable', 'invalid']) {
    const p = ports({placeCall: async number => { p.log.push(['call', number]); throw coded('refused', code); }});
    const result = await run({type: 'phone_call', target: {kind: 'contact', query: 'Priya'}}, p);
    assert.deepEqual(result.telephonyResult, {kind: 'phone-call', status: 'unavailable', contact: true}, code);
    assert.equal(result.status, 'failed'); assert.match(result.summary, /Nothing was called/); assert.equal(did(p, 'call').length, 1, 'never retried');
  }
});
test('a contact write the phone refused before it touched the address book says nothing was changed', async () => {
  const operations = [{type: 'contact_create', contact: {displayName: 'Ada', phoneNumbers: [], emailAddresses: []}}, {type: 'contact_update', query: 'Priya', set: {displayName: 'Ada'}}, {type: 'contact_delete', query: 'Priya'}];
  for (const operation of operations) {
    for (const [code, status] of [['permission-required', 'unavailable'], ['unavailable', 'unavailable'], ['invalid', 'failed'], ['not-found', operation.type === 'contact_create' ? 'failed' : 'not-found']]) {
      let writes = 0; const refuse = async () => { writes++; throw coded('refused', code); };
      const p = ports({saveContact: refuse, removeContact: refuse}); const result = await run(operation, p);
      assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status}, `${operation.type} ${code}`);
      assert.equal(result.status, 'failed'); assert.match(result.summary, /Nothing was changed/); assert.equal(writes, 1);
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
    const refused = refuseTelephonyAction({type}, 'Nothing was done. Keep Alpha open and unlocked, then ask again.');
    assert.equal(refused.status, 'failed', type); assert.equal(refused.summary, 'Nothing was done. Keep Alpha open and unlocked, then ask again.');
    assert.deepEqual(refused.telephonyResult, kind === 'phone-call' ? {kind, status: 'unavailable', contact: false} : {kind, status: 'unavailable'});
  }
});
test('a form this phone does not advertise is reported unavailable and nothing on the phone is touched', async () => {
  for (const [operation, kind] of [
    [{type: 'sms_compose', target: {kind: 'number', number: '+14155550100'}, body: 'Running late'}, 'sms-compose'],
    [{type: 'sms_compose', target: {kind: 'contact', query: 'Priya'}, body: 'Running late', draft: true}, 'sms-compose'],
    [{type: 'contact_update', query: 'Priya', add: {phoneNumbers: ['+14155550100']}}, 'contact-write'],
    [{type: 'contact_update', query: 'Priya', set: {displayName: 'Priya N'}, remove: {emailAddresses: ['p@example.com']}}, 'contact-write'],
    [{type: 'contact_show', query: 'Priya'}, 'contact-show'],
    [{type: 'contact_read_selected'}, 'contact-read'],
  ]) {
    const p = ports(), result = await run(operation, p);
    assert.deepEqual(result.telephonyResult, {kind, status: 'unavailable'}, JSON.stringify(operation));
    assert.equal(result.status, 'failed');
    assert.deepEqual(p.log.filter(([what]) => what !== 'search' && what !== 'get'), [], 'nothing was asked, sent, drafted or written');
  }
});
