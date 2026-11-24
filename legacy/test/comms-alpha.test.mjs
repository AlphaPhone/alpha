// AP-16 Alpha behaviours on the comms surfaces (docs/agentic-comms.md AC-21, AC-24, AC-25, AC-26,
// AC-30, D8), executed from source with no app start, agent, device or provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'comms-alpha-'));
process.on('exit', () => rmSync(dir, {recursive: true, force: true}));
async function load(entry, name) {
  const output = await build({entryPoints: [resolve(entry)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
    define: {'import.meta.env': '{}'}});
  const file = join(dir, name + '.mjs');
  writeFileSync(file, output.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}
// One bundle, so the suggestion source installed by comms-alpha is the one comms-bar reads.
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `export * from ${JSON.stringify(resolve('apps/app/src/prototype/comms-alpha.ts'))};\nexport {callCardText, openSuggestion, proposalCanAct} from ${JSON.stringify(resolve('apps/app/src/runtime/comms-bar.ts'))};\n`);
const A = await load(entry, 'comms-alpha'), B = A;
const R = await load('apps/app/src/prototype/telephony-review.ts', 'telephony-review');

const spec = (extra = {}) => ({target: {kind: 'thread', app: 'Messages', name: 'Maya Chen', first: 'Maya', initials: 'MC'}, contextKey: 'messages:thread:t1', briefing: 'Maya texted at 2:04 PM and hasn\'t had a reply.', incoming: null, emergency: false, ...extra});

test('the open faint suggestion names something on screen and never a feature (AC-24)', () => {
  const pick = candidates => A.pickOpenSuggestion({view: 'messages', spec: spec(), candidates});
  assert.equal(pick(['Set a reminder', 'Create a note', 'Add a contact', 'Plan my afternoon']), null);
  assert.equal(pick(['Plan my afternoon', 'Tell her I\'m 10 min late']), 'Tell her I\'m 10 min late', 'a digit');
  assert.equal(pick(['what did maya ask?']), 'what did maya ask?', 'the person on screen');
  assert.equal(pick(['Move the review to Friday']), 'Move the review to Friday', 'a capitalised word after the first');
  assert.equal(pick(['Can I reply later']), null, 'I is not a name');
  assert.equal(pick([{label: 'Maya', go() {}}]), null, 'only text candidates');
  assert.equal(A.pickOpenSuggestion({view: null, spec: null, candidates: ['Any new texts?', 'Who called?']}), null);
});

test('installing comms leaves automatic suggestions disabled', () => {
  assert.equal(B.openSuggestion({view: 'messages', spec: spec(), candidates: ['Ask Maya about 3:30']}), null, 'no source before install');
  const proto = {renderVals() { return {msgs: []}; }};
  A.installCommsAlpha({prototype: proto}, {});
  assert.equal(B.openSuggestion({view: 'messages', spec: spec(), candidates: ['Check voicemail', 'Ask Maya about 3:30']}), null);
});

test('a briefing is shown once per subject, only when the chat opens and something is known (AC-25)', () => {
  assert.equal(A.briefingDue(true, spec(), null), 'Maya texted at 2:04 PM and hasn\'t had a reply.');
  assert.equal(A.briefingDue(true, spec(), 'messages:thread:t1'), null, 'unchanged thread: no new briefing');
  assert.equal(A.briefingDue(false, spec(), null), null, 'only on open');
  assert.equal(A.briefingDue(true, spec({briefing: null}), null), null, 'nothing known: absent');
  assert.equal(A.briefingDue(true, null, null), null);
});

test('a ringing call is offered as one "Screen it" proposal dispatched to Phone, keyed by the ring (AC-21)', () => {
  const ringing = id => spec({target: {kind: 'incoming', app: 'Phone', name: 'Maya Chen', first: 'Maya', initials: 'MC'}, contextKey: 'phone:incoming:c1',
    incoming: {id, answer() {}, decline() {}, screen() {}}});
  const p = A.screenProposal(ringing('ring-1'));
  assert.deepEqual(p, {id: 'screen:ring-1', kind: 'screen', title: 'Screen it', detail: 'Maya Chen', button: 'Screen it', acts: true, act: {mod: 'phone', fn: 'screenIncoming'}, args: {ring: 'ring-1'}});
  // The same caller ringing again is a new ring: a new card, never the old one.
  assert.notEqual(A.screenProposal(ringing('ring-2')).id, p.id);
});

test('only an open view proposal is kept for restore, as data (AC-30)', () => {
  const card = {type: 'proposal', state: 'open', id: 'p1', kind: 'call', title: 'Call Maya Chen', detail: '(415) 555-0132', button: 'Call', acts: true, act: {mod: 'phone', fn: 'callApproved'}, args: {pid: 'maya', num: '4155550132'}, done: false, go: {view: 'phone'}};
  const kept = A.openProposalOf([{from: 'agent', text: 'Call Maya?', card}]);
  assert.deepEqual(kept, {text: 'Call Maya?', card: {type: 'proposal', state: 'open', id: 'p1', kind: 'call', title: 'Call Maya Chen', detail: '(415) 555-0132', button: 'Call', acts: true, act: {mod: 'phone', fn: 'callApproved'}, args: {pid: 'maya', num: '4155550132'}}}, 'no other card fields');
  assert.equal(A.openProposalOf([{from: 'agent', text: 'x', card: {...card, state: 'replaced'}}]), null, 'the newest proposal is not open');
  assert.equal(A.openProposalOf([{from: 'agent', text: 'x', card: {...card, args: {proposalId: 'live'}}}]), null, 'live proposals are re-offered by pending-action recovery');
  assert.equal(A.openProposalOf([{from: 'agent', text: 'x', card}, {from: 'agent', text: 'y', card: {...card, id: 'p2', state: 'done'}}]), null);
});

test('the proposal record reader accepts only its exact shape', async () => {
  const S = await load('apps/app/src/runtime/alpha-proposal-store.ts', 'alpha-proposal-store');
  const empty = {v: 1, briefed: null, open: null};
  for (const bad of [null, 'x', [], {v: 2, briefed: null, open: null}, {v: 1, briefed: 3, open: null}, {v: 1, briefed: null, open: null, extra: 1}]) assert.deepEqual(S.parseProposalRecord(bad), empty);
  const open = {text: 'Call Maya?', card: {type: 'proposal', state: 'open', id: 'p1', kind: 'call', title: 'Call Maya', detail: '', button: 'Call', acts: true, act: {mod: 'phone', fn: 'callApproved'}, args: {}}};
  assert.deepEqual(S.parseProposalRecord({v: 1, briefed: 'k', open}), {v: 1, briefed: 'k', open});
  assert.equal(S.parseProposalRecord({v: 1, briefed: 'k', open: {...open, card: {...open.card, state: 'done'}}}).open, null, 'a closed proposal is never restored');
  assert.equal(S.parseProposalRecord({v: 1, briefed: 'k', open: {...open, card: {...open.card, act: null}}}).open, null);
});

test('a replaced or finished proposal can never act; other cards are unaffected (AC-26)', () => {
  assert.equal(B.proposalCanAct({type: 'proposal', state: 'open'}), true);
  assert.equal(B.proposalCanAct({type: 'proposal', state: 'replaced'}), false);
  assert.equal(B.proposalCanAct({type: 'proposal', state: 'done'}), false);
  assert.equal(B.proposalCanAct({type: 'generic'}), true);
  // AC-19: off the comms screens a live pending action is an action review card; it never acts
  // during an emergency call either, while other cards are unaffected.
  assert.equal(B.proposalCanAct({type: 'generic', proposalId: 'p9'}, true), false);
  assert.equal(B.proposalCanAct({type: 'generic', proposalId: 'p9'}, false), true);
  assert.equal(B.proposalCanAct({type: 'generic'}, true), true);
});

test('a contact call is chosen inside the approved card, never in a separate dialog (D8)', () => {
  const review = R.presentTelephonyReview({review: {kind: 'call', options: [{id: 'a', name: 'Maya Chen', number: '+14155550132'}]}, settle() {}});
  const msgs = [{id: 1, cProposal: true, c: {type: 'proposal', state: 'open', proposalId: 'p1'}}, {id: 2, cProposal: true, c: {type: 'proposal', state: 'open', proposalId: 'p2'}, proposalAsk: true}, {id: 3, isUser: true}];
  const placed = R.placeTelephonyReview(msgs, review, 'p2');
  assert.equal(placed[1].c.reviewing, review); assert.equal(placed[1].proposalAsk, false, 'the rows replace the card button');
  assert.equal(placed[0], msgs[0]);
  assert.equal(R.placeTelephonyReview(msgs, review, 'gone'), null, 'never in another proposal\'s card');
  const replaced = msgs.map(m => m.id === 2 ? {...m, c: {...m.c, state: 'replaced'}} : m);
  assert.equal(R.placeTelephonyReview(replaced, review, 'p2'), null, 'a replaced card shows no review rows (AC-26)');
  const digest = R.placeTelephonyReview([{id: 1, cDigest: true, c: {proposalId: 'p3'}, rows: []}], review, 'p3');
  assert.deepEqual(digest[0].rows.map(row => row.who), ['Maya Chen', 'Not now']);
  assert.equal(R.placeTelephonyReview([{id: 3, isUser: true}], review, 'p1'), null, 'no card: the caller dismisses it');
  assert.equal(R.placeTelephonyReview(msgs, R.presentTelephonyReview(null), 'p1'), msgs);
});

test('the card names an existing contact before adding it again, and says which row keeps a contact\'s other details', () => {
  const chosen = [], settle = choice => chosen.push(choice);
  const twin = R.presentTelephonyReview({review: {kind: 'contact-create', options: [{name: 'Sam Lee', numbers: ['+14155550132']}]}, settle});
  assert.deepEqual(twin.rows.map(row => [row.name, row.lines.map(line => line.text), row.label]), [['Add anyway', ['Sam Lee is already in Contacts', '(415) 555-0132'], 'Add anyway: Sam Lee is already in Contacts']]);
  twin.rows[0].choose(); twin.dismiss(); assert.deepEqual(chosen, [0, null], 'Add anyway chooses it; Not now chooses nothing');
  const digest = R.placeTelephonyReview([{id: 1, cDigest: true, c: {proposalId: 'p'}, rows: []}], twin, 'p');
  assert.deepEqual(digest[0].rows.map(row => row.who), ['Add anyway', 'Not now']); assert.equal(digest[0].rows[0].marks[0].text, 'Sam Lee is already in Contacts');
  const before = {id: '1', version: 'a'.repeat(64), displayName: 'Sam Lee', phoneNumbers: [], emailAddresses: [{address: 'sam@work.example', type: 'work'}]};
  const one = {address: 'sam@example.com', type: 'home'}, draft = emailAddresses => ({displayName: 'Sam Lee', phoneNumbers: [], emailAddresses});
  const both = R.presentTelephonyReview({review: {kind: 'contact-save', options: [{before, after: draft([before.emailAddresses[0], one]), keeps: 'add'}, {before, after: draft([one]), keeps: 'replace'}]}, settle});
  assert.deepEqual(both.rows.map(row => row.label), ['Add (keep existing): save changes to Sam Lee', 'Replace: save changes to Sam Lee']);
  assert.deepEqual(both.rows.map(row => row.lines.map(line => [line.text, line.decoration])), [
    [['Add (keep existing)', 'none'], ['sam@work.example', 'none'], ['sam@example.com', 'none']],
    [['Replace', 'none'], ['sam@work.example', 'line-through'], ['sam@example.com', 'none']]], 'Replace strikes what it removes');
  // A change that drops nothing is one row with no such line.
  const plain = R.presentTelephonyReview({review: {kind: 'contact-save', options: [{before, after: draft([before.emailAddresses[0], one])}]}, settle});
  assert.deepEqual(plain.rows.map(row => [row.label, row.lines.length]), [['Save changes to Sam Lee', 2]]);
});

test('a contact change chosen in a generic chat card says in words what it removes, adds and keeps (review: contacts-approval)', () => {
  const settle = () => {};
  const digestOf = options => {
    const review = R.presentTelephonyReview({review: {kind: 'contact-save', options}, settle});
    return R.placeTelephonyReview([{id: 1, cDigest: true, c: {proposalId: 'p'}, rows: []}], review, 'p')[0].rows;
  };
  const marks = row => row.marks.map(mark => [mark.text, mark.decoration]);
  const before = {id: '1', version: 'a'.repeat(64), displayName: 'Test Alpha', phoneNumbers: [{number: '+14155550100', type: 'mobile'}], emailAddresses: [{address: 'ta@example.com', type: 'home'}]};
  const draft = (phoneNumbers, displayName = 'Test Alpha') => ({displayName, phoneNumbers, emailAddresses: before.emailAddresses});
  const next = {number: '4155550101', type: 'mobile'};
  // A replace: the number that goes is named as removed and struck, never listed as if it stays.
  let rows = digestOf([{before, after: draft([next])}]);
  assert.deepEqual(rows.map(row => row.who), ['Test Alpha', 'Not now']);
  assert.deepEqual(marks(rows[0]), [['Remove (415) 555-0100', 'line-through'], ['Add (415) 555-0101', 'none'], ['Keep ta@example.com', 'none']]);
  assert.equal(rows[0].text, '', 'no flattened one-line value list beside the marked lines');
  // The same request offered both ways: the Add row keeps the old number, the Replace row removes it.
  rows = digestOf([{before, after: draft([before.phoneNumbers[0], next]), keeps: 'add'}, {before, after: draft([next]), keeps: 'replace'}]);
  assert.deepEqual(rows.slice(0, 2).map(marks), [
    [['Add (keep existing)', 'none'], ['Keep (415) 555-0100', 'none'], ['Add (415) 555-0101', 'none'], ['Keep ta@example.com', 'none']],
    [['Replace', 'none'], ['Remove (415) 555-0100', 'line-through'], ['Add (415) 555-0101', 'none'], ['Keep ta@example.com', 'none']]]);
  // Remove only, and a rename.
  const two = {...before, phoneNumbers: [...before.phoneNumbers, {number: '+14155550199', type: 'work'}]};
  rows = digestOf([{before: two, after: draft([two.phoneNumbers[1]], 'T. Alpha')}]);
  assert.deepEqual(marks(rows[0]), [['Rename from Test Alpha', 'line-through'], ['Remove (415) 555-0100', 'line-through'], ['Keep (415) 555-0199', 'none'], ['Keep ta@example.com', 'none']]);
  // The generic card draws each marked line on its own wrapping line, with its strike and weight.
  const template = readFileSync('apps/app/src/prototype/template.html', 'utf8');
  const digestCard = template.slice(template.indexOf('<sc-if value="{{m.cDigest}}">'), template.indexOf('<sc-if value="{{m.cNote}}">'));
  assert.match(digestCard, /<sc-for list="{{r\.marks}}" as="l"><div [^>]*text-decoration: {{l\.decoration}}[^>]*>{{l\.text}}<\/div><\/sc-for>/);
  assert.doesNotMatch(digestCard.match(/<sc-for list="{{r\.marks}}"[^]*?<\/sc-for>/)[0], /nowrap|ellipsis/);
});

test('a review that could not list every matching contact says so in its card', () => {
  const contact = {id: '1', version: 'a'.repeat(64), displayName: 'John A', phoneNumbers: [], emailAddresses: []};
  const review = R.presentTelephonyReview({review: {kind: 'contact-delete', options: [contact], more: true}, settle() {}});
  assert.match(review.note, /^Only the first 10 matching contacts are shown\./);
  const rows = R.placeTelephonyReview([{id: 1, cDigest: true, c: {proposalId: 'p'}, rows: []}], review, 'p')[0].rows;
  assert.deepEqual(rows.map(row => [row.who, !!row.disabled]), [['John A', false], ['More matches', true], ['Not now', false]]);
  assert.equal(R.presentTelephonyReview({review: {kind: 'contact-delete', options: [contact]}, settle() {}}).note, '');
  const template = readFileSync('apps/app/src/prototype/template.html', 'utf8');
  assert.match(template, /<sc-if value="{{m\.c\.reviewing\.note}}"><p data-alpha-telephony-review-note[^>]*>{{m\.c\.reviewing\.note}}<\/p><\/sc-if>/);
});

test('the briefing is Alpha\'s first line for the opening, before rows that arrived after it (AC-25)', () => {
  const b = {id: 'b'};
  assert.deepEqual(A.briefingInserted([{id: 1}, {id: 2}, {id: 3}], b, 1).map(r => r.id), [1, 'b', 2, 3], 'after the rows that existed at open');
  assert.deepEqual(A.briefingInserted([{id: 2}], b, null).map(r => r.id), ['b', 2], 'an empty chat at open: first');
  assert.deepEqual(A.briefingInserted([{id: 2}], b, 9).map(r => r.id), [2, 'b'], 'a vanished anchor appends');
});

test('the saved comms stage reads only its exact shape (AC-30)', async () => {
  const {stageSessionFrom, stageSessionValue} = await import('../apps/app/src/runtime/stage-session-store.ts');
  const good = {chat: 'sheet', sheetShare: 0.5, view: 'phone', stageFrom: [{view: 'messages', title: 'Messages', patch: {thread: 't1'}}]};
  assert.deepEqual(stageSessionFrom(stageSessionValue(good)), good);
  assert.deepEqual(stageSessionFrom(stageSessionValue({...good, chat: 'input', stageFrom: [], sheetShare: null})), {...good, chat: 'input', stageFrom: [], sheetShare: null});
  const value = stageSessionValue(good);
  for (const bad of [null, [], 'x', {...value, v: 2}, {...value, extra: 1}, {...value, chat: 'hidden'}, {...value, sheetShare: 0}, {...value, sheetShare: 1.5},
    {...value, view: 'Phone!'}, {...value, stageFrom: [{view: 'messages', title: 'Messages', patch: null, more: 1}]},
    {...value, stageFrom: Array.from({length: 9}, () => ({view: 'messages', title: 'M', patch: null}))},
    // Stage history exists only while the chat is open.
    {...value, chat: 'input'}])
    assert.equal(stageSessionFrom(bad), null, JSON.stringify(bad)?.slice(0, 80));
  assert.equal(stageSessionValue({...good, stageFrom: Array.from({length: 12}, (_, i) => ({view: 'v' + i, title: '', patch: null}))}).stageFrom.length, 8, 'history is capped');
});

test('AC-20: the call card says "not in Contacts" only when Contacts were read', () => {
  const format = number => number;
  assert.deepEqual(B.callCardText({number: '+15550100'}, null, format), {title: 'Call +15550100', detail: '+15550100'});
  assert.deepEqual(B.callCardText({number: '+15550100'}, {name: null, numbers: ['+15550100']}, format), {title: 'Call +15550100', detail: '+15550100 · not in Contacts'});
  assert.deepEqual(B.callCardText({number: '+15550100'}, {name: 'Ana Torres', numbers: ['+15550100']}, format), {title: 'Call Ana Torres', detail: '+15550100'});
});
