import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

// The dependency-free Settings facts the Privacy page and the Agent activity chat rows draw from.
const source = readFileSync(new URL('../apps/app/src/prototype/settings-adapter.ts', import.meta.url), 'utf8');
const start = source.indexOf('// settings-facts:begin'), end = source.indexOf('// settings-facts:end');
assert.ok(start >= 0 && end > start, 'settings facts region');
const context = vm.createContext({});
vm.runInContext(`${stripTypeScriptTypes(source.slice(start, end).replace(/^export /gm, ''))}
globalThis.facts = {voicePrivacyRow, composerAttachmentCount};`, context);
const {voicePrivacyRow, composerAttachmentCount} = context.facts;
const plain = value => JSON.parse(JSON.stringify(value));

test('Privacy names where speech goes for every route', () => {
  assert.deepEqual(plain(voicePrivacyRow('cloud', 'Eliza Cloud')), {val: 'Eliza Cloud', sub: 'Recordings, replies → Eliza Cloud'});
  assert.deepEqual(plain(voicePrivacyRow('direct', 'Eliza Cloud')), {val: 'Cartesia', sub: 'Recordings, replies → Cartesia'});
  assert.deepEqual(plain(voicePrivacyRow('device', 'Eliza Cloud')), {val: 'On this phone', sub: ''});
});

test('the Privacy page draws the Voice row from the speech route in every build', () => {
  const privacy = source.slice(source.indexOf("if(key==='settings-privacy'){"), source.indexOf("if(key==='settings-general'&&phoneLoader())"));
  assert.match(privacy, /voicePrivacyRow\(developmentCartesiaVoiceEnabled\?'direct':voiceRoute,serviceName\)/);
  assert.match(privacy, /info\('Voice',voice\.val,'voice-route'\)/);
  assert.doesNotMatch(privacy, /developerTools|testMocksEnabled|browserDevProfile/, 'the row is not limited to developer builds');
});

test('changing chats from Settings counts every attachment waiting in the composer', () => {
  assert.equal(composerAttachmentCount(null), 0);
  assert.equal(composerAttachmentCount({fileAttachments: []}), 0);
  assert.equal(composerAttachmentCount({fileAttachments: [{}, {}]}), 2);
  assert.equal(composerAttachmentCount({fileAttachments: [{}], cameraAttachment: {id: 'c'}, transcriptAttachment: {title: 't'}, mailAttachment: {id: 'm'}}), 4);
  assert.equal(composerAttachmentCount({cameraAttachment: null, transcriptAttachment: null, mailAttachment: null}), 0);
  // New conversation and Restore both go through the same question.
  const chats = source.slice(source.indexOf('const changeChat='), source.indexOf("if(connection.historyError)"));
  assert.match(chats, /composerAttachmentCount\(owner\)/);
  assert.match(chats, /changeChat\('new-conversation'/);
  assert.match(chats, /changeChat\(`restore-conversation:\$\{item\.id\}`/);
});

test('Privacy offers the first-run access walkthrough again when the shell provides it', () => {
  const privacy = source.slice(source.indexOf("if(key==='settings-privacy'){"), source.indexOf("if(key==='settings-general'&&phoneLoader())"));
  assert.match(privacy, /if\(typeof api\.reopenStartupAccess==='function'\)/);
  assert.match(privacy, /action\('Access setup',\(\)=>api\.reopenStartupAccess\(\)\),lbl:'Review access setup'/);
});

test('Display draws text size as size choices only; the unused slider mapping is gone', () => {
  const display = source.slice(source.indexOf("} else if (page.title === 'Display') {"), source.indexOf("page.groups.push({...group([{id:'text-size'"));
  assert.ok(display.length > 0);
  assert.doesNotMatch(display, /valueLabel|HTMLInputElement/);
  assert.doesNotMatch(source, /page\.title === 'Privacy & data'/, 'the prototype Privacy & data page never renders (privacy opens Permissions)');
});
