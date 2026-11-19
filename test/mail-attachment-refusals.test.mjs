// What the Inbox composer says when a file cannot be attached. Alpha's drafts controller
// (apps/app/src/ui/mailbox/drafts-controller.ts) words every refusal itself: the shared limits it
// classifies before the shared check, and the picker and review refusals it maps by their reviewed
// text. Each case the owner used to see (the raw sentence) still has its own Alpha sentence.
// In-memory storage and fake pickers only: no account, provider, network or device.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tsImport} from './support/ts-import.mjs';

const {attachmentRefusalText, outgoingAttachmentRefusal, createMailDraftsController} = await tsImport('../apps/app/src/ui/mailbox/drafts-controller.ts', import.meta.url);
const {checkOutgoingAttachments} = await tsImport('../apps/app/src/runtime/inbox-operation.ts', import.meta.url);
const {AttachmentRefusedError, reviewMailAttachment} = await tsImport('../apps/app/src/runtime/inbox-attachment.ts', import.meta.url);

const MiB = 1024 * 1024;
const TOO_LARGE = 'This file is larger than 5 MiB. Choose a file up to 5 MiB.';
const TYPES = 'Attach a PDF, PNG, JPEG, WebP or UTF-8 TXT file up to 5 MiB. Its content must match its type.';
const STAGED = '.eliza/client-features/plugins/';

// Each refusal text a picker or the shared review raises, where it comes from, and what the owner sees now.
const KNOWN = [
  ['Invalid attachment name or encoding', STAGED + 'plugin-files/src/browser/attachment.ts', "This file's name or encoding can't be attached. Rename it or choose another file."],
  ['Attachment exceeds 5 MiB', STAGED + 'plugin-files/src/browser/attachment.ts', TOO_LARGE],
  ['Supported attachments: PDF, PNG, JPEG, WebP and UTF-8 TXT up to 5 MiB. File content must match its type.', STAGED + 'plugin-files/src/browser/attachment.ts', TYPES],
  ['Choose a file up to 5 MiB.', STAGED + 'plugin-files/src/browser/files.ts', TOO_LARGE],
  ['Select this file again.', STAGED + 'plugin-files/src/browser/files.ts', 'The selected file is no longer available. Select it again.'],
  ['Select a valid PDF, PNG, JPEG, WebP or UTF-8 TXT file up to 5 MiB. Selection cancelled or unavailable.', 'android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMailAttachmentsPlugin.java', 'Select a PDF, PNG, JPEG, WebP or UTF-8 TXT file up to 5 MiB. The selection was cancelled or is no longer available.'],
  ['Attachment service closed.', 'android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMailAttachmentsPlugin.java', 'Attaching stopped before the file was read. Attach it again.'],
];

test('every known picker and review refusal has its own Alpha sentence, keyed on text its source still raises', () => {
  for (const [raw, source, shown] of KNOWN) {
    assert.ok(fs.readFileSync(source, 'utf8').includes(raw), `${source} still raises ${JSON.stringify(raw)}`);
    assert.equal(attachmentRefusalText(new Error(raw)), shown, raw);
    assert.equal(attachmentRefusalText(new AttachmentRefusedError(raw)), shown, `${raw} (typed refusal)`);
    assert.equal(attachmentRefusalText(Object.assign(new Error(raw), {code: 'UNKNOWN'})), shown, `${raw} (plugin rejection)`);
  }
});

test('a too-large file from either picker, an unknown file refusal, a cancelled read and anything else', () => {
  // Android rejects an oversize file with its general sentence and the too-large code; the web picker adds the code too.
  assert.equal(attachmentRefusalText(Object.assign(new Error(KNOWN[5][0]), {code: 'too-large'})), TOO_LARGE);
  assert.equal(attachmentRefusalText(Object.assign(new Error('Choose a file up to 5 MiB.'), {code: 'too-large'})), TOO_LARGE);
  // A refusal of the file whose text is not known (for example a decoder's own message) is still about the file.
  assert.equal(attachmentRefusalText(new AttachmentRefusedError('The encoded data was not valid for encoding utf-8')), `This file can't be attached. ${TYPES}`);
  assert.equal(attachmentRefusalText(new AttachmentRefusedError()), `This file can't be attached. ${TYPES}`);
  assert.equal(attachmentRefusalText(new DOMException('Cancelled', 'AbortError')), 'Attaching was cancelled. Nothing was added.');
  for (const other of [new Error('socket hang up'), new Error(''), 'text', null, undefined, {message: 7}])
    assert.equal(attachmentRefusalText(other), 'Attachment unavailable', String(other));
});

test('the real attachment review refusals reach the owner in Alpha words', async () => {
  const file = (name, mimeType, bytes) => ({name, mimeType, dataBase64: Buffer.from(bytes).toString('base64')});
  const refusal = async input => { try { await reviewMailAttachment(input); } catch (error) { return error; } assert.fail(`${input.name} was accepted`); };
  assert.equal(attachmentRefusalText(await refusal(file('tool.exe', 'application/octet-stream', 'MZ'))), TYPES);
  assert.equal(attachmentRefusalText(await refusal(file('fake.pdf', 'application/pdf', 'not a pdf'))), TYPES);
  assert.equal(attachmentRefusalText(await refusal(file('a/b.txt', 'text/plain', 'x'))), "This file's name or encoding can't be attached. Rename it or choose another file.");
  assert.equal(attachmentRefusalText(await refusal({name: 'big.txt', mimeType: 'text/plain', dataBase64: 'A'.repeat(Math.ceil((5 * MiB + 3) / 3) * 4)})), TOO_LARGE);
  assert.equal(attachmentRefusalText(await refusal(file('bad.txt', 'text/plain', Buffer.from([0xff, 0xfe, 0xfd])))), `This file can't be attached. ${TYPES}`);
});

const b64 = (bytes, fill = 0) => Buffer.alloc(bytes, fill).toString('base64');
const policy = (maximumOutgoing, maximumTotalBytes = 5 * MiB) => ({maximumOutgoing, maximumTotalBytes});
const named = (name, bytes = 3) => ({name, dataBase64: b64(bytes)});

test('the shared limits are classified in Alpha words, and the shared check agrees with each one', () => {
  const cases = [
    [[named('a.txt'), named('b.txt')], policy(1), [], 'This account accepts one attachment per email. Remove it to choose another.'],
    [[named('a.txt'), named('b.txt'), named('c.txt')], policy(2), [], 'Attach at most 2 files.'],
    [Array.from({length: 11}, (_, i) => named(`${i}.txt`)), policy(50), [], 'Attach at most 10 files.'],
    [[named('report.pdf'), named('REPORT.pdf')], policy(10), [], 'Two attachments have the same name. Rename one to attach both.'],
    [[named('report.pdf')], policy(10), [{name: 'Report.PDF', size: 10}], 'Two attachments have the same name. Rename one to attach both.'],
    [[named('a.pdf', 3 * MiB), named('b.pdf', 3 * MiB)], policy(10), [], 'Attachments exceed 5 MiB in total. Remove one or choose a smaller file.'],
    [[named('a.pdf', MiB)], policy(10, 2 * MiB), [{name: 'b.pdf', size: 2 * MiB}], 'Attachments exceed 2 MiB in total. Remove one or choose a smaller file.'],
  ];
  for (const [files, rules, forwarded, shown] of cases) {
    assert.equal(outgoingAttachmentRefusal(files, rules, forwarded), shown);
    assert.throws(() => checkOutgoingAttachments(files, rules, forwarded), undefined, `the shared check also refuses: ${shown}`);
  }
  // The forwarded originals count toward the file limit only in the composer, not in the shared check.
  const forwarded = Array.from({length: 4}, (_, i) => ({name: `f${i}.txt`, size: 1}));
  const seven = Array.from({length: 7}, (_, i) => named(`${i}.txt`));
  assert.equal(outgoingAttachmentRefusal(seven, policy(10), forwarded), 'Attach at most 10 files including forwarded ones.');
  assert.doesNotThrow(() => checkOutgoingAttachments(seven, policy(10), forwarded));
  for (const [files, rules, rest] of [[[named('a.txt')], policy(1), []], [[named('a.txt'), named('b.txt')], policy(10), [{name: 'c.txt', size: 1}]], [[named('a.pdf', 5 * MiB)], policy(10), []]]) {
    assert.equal(outgoingAttachmentRefusal(files, rules, rest), null);
    assert.doesNotThrow(() => checkOutgoingAttachments(files, rules, rest));
  }
});

const settle = async () => { for (let turn = 0; turn < 8; turn++) await new Promise(resolve => setImmediate(resolve)); };

async function composer({maximumOutgoing = 10, maximumTotalBytes = 5 * MiB, picks = []} = {}) {
  const rows = new Map(), toasts = [];
  const identity = {sessionId: 'session', account: {environment: 'test', userId: 'owner', sessionId: 'session'}};
  const drafts = createMailDraftsController({
    publish() {}, toast: text => toasts.push(text), identity: () => identity, confirm: () => true,
    provider: {prepare: async () => { throw Error('Unexpected provider operation'); }, capabilities: () => ({send: true, providerDrafts: true, from: 'owner@example.invalid', attachmentPolicy: policy(maximumOutgoing, maximumTotalBytes)})},
    store: {read: async key => structuredClone(rows.get(key) ?? null), compareExchange: async (key, before, next) => { if (JSON.stringify(rows.get(key) ?? null) !== JSON.stringify(before)) return {status: 'conflict'}; if (next === null) rows.delete(key); else rows.set(key, structuredClone(next)); return {status: 'saved'}; }},
    retained: () => ({ready: Promise.resolve(), available: false, peek: () => null, conflict: false, error: false, status: '', edit() {}, resume() {}, replace() {}, retry() {}, clear: async () => {}, recover() {}, retire() {}}),
    attachments: {
      select: async () => ({status: 'selected', selectionId: 'pick', name: 'chosen'}),
      read: async () => { const next = picks.shift(); if (next instanceof Error) throw next; return {...next, size: next.size ?? 3, sha256: next.name}; },
      forget: async () => {},
    },
    reviewAttachment: async file => ({name: file.name, mimeType: file.mimeType, size: file.size, sha256: file.sha256}),
  });
  await drafts.bind('grant', 'owner@example.invalid'); await settle();
  assert.equal(drafts.begin(), true);
  const attached = () => (drafts.email()?.proposal?.attachments || []).map(file => file.name);
  const shelved = () => [...rows].find(([key]) => key.startsWith('inbox-drafts:v1:shelf:'))?.[1]?.items.map(row => row.draft) ?? [];
  return {drafts, toasts, picks, attached, shelved};
}
const pdf = (name, bytes = 3) => ({name, mimeType: 'application/pdf', dataBase64: b64(bytes), size: bytes});

test('Attach in the composer shows Alpha sentences for a repeated name, the total size and a picker refusal', async () => {
  const c = await composer({picks: [pdf('report.pdf'), pdf('report.pdf'), pdf('big.pdf', 3 * MiB), pdf('bigger.pdf', 3 * MiB),
    Object.assign(new Error(KNOWN[5][0]), {code: 'too-large'}), Object.assign(new Error(KNOWN[5][0]), {code: undefined}),
    new AttachmentRefusedError(KNOWN[2][0]), new Error('Select this file again.'), new Error('socket hang up')]});
  const attach = async () => { await c.drafts.render().c.attach(); await settle(); return c.toasts.at(-1); };
  await attach(); assert.deepEqual(c.attached(), ['report.pdf']);
  assert.equal(await attach(), 'Two attachments have the same name. Rename one to attach both.');
  await attach(); assert.deepEqual(c.attached(), ['report.pdf', 'big.pdf']);
  assert.equal(await attach(), 'Attachments exceed 5 MiB in total. Remove one or choose a smaller file.');
  assert.equal(await attach(), TOO_LARGE);
  assert.equal(await attach(), KNOWN[5][2]);
  assert.equal(await attach(), TYPES);
  assert.equal(await attach(), 'The selected file is no longer available. Select it again.');
  assert.equal(await attach(), 'Attachment unavailable');
  assert.deepEqual(c.attached(), ['report.pdf', 'big.pdf'], 'no refused file joined the draft');
  assert.deepEqual(c.toasts.filter(text => KNOWN.some(([raw]) => raw === text)), [], 'no picker or review text is shown as is');
});

test('a reviewed Files attachment starts its own draft, keeps the unfinished one as it was and returns one refusal', async () => {
  const c = await composer({maximumTotalBytes: 2 * MiB});
  // The unfinished email the owner typed before leaving Inbox: its composer closes and the draft stays.
  c.drafts.render().c.onBody({target: {value: 'Earlier text'}});
  const earlier = c.drafts.email().draftId;
  c.drafts.close();
  const add = file => c.drafts.attachReviewed(file, c.drafts.newDraftTarget().token);
  assert.equal(await add(pdf('notes.pdf')), null);
  const first = c.drafts.email();
  assert.notEqual(first.draftId, earlier, 'a new draft, never the unfinished one');
  assert.equal(first.proposal.bodyText, '');
  assert.deepEqual(c.attached(), ['notes.pdf']);
  assert.equal(c.drafts.render().composing, true, 'the new draft opens in the composer');
  assert.deepEqual(c.shelved().map(draft => [draft.id, draft.body, draft.attachments ?? []]), [[earlier, 'Earlier text', []]]);
  // The duplicate refusal: the same bytes again add nothing, and the email holding them stays where it is.
  const holding = c.drafts.email(), before = c.shelved();
  assert.equal(await add(pdf('notes.pdf')), 'This file is already attached to your unfinished email in Inbox. Nothing was added.');
  assert.deepEqual(c.drafts.email(), holding);
  assert.deepEqual(c.shelved(), before);
  // Other bytes start another draft; the one holding notes.pdf is set aside as it was.
  assert.equal(await add({...pdf('other.pdf'), dataBase64: b64(3, 1)}), null);
  assert.deepEqual(c.attached(), ['other.pdf']);
  assert.deepEqual(c.shelved().map(draft => (draft.attachments ?? []).map(file => file.name)), [[], ['notes.pdf']]);
  assert.equal(c.shelved()[0].body, 'Earlier text');
  // The account's size policy is the one reason, returned to the Email action: no toast, nothing changes.
  const shown = c.drafts.email(), shelf = c.shelved();
  assert.equal(await add({...pdf('large.pdf', 3 * MiB), dataBase64: b64(3 * MiB, 2)}), 'Attachments exceed 2 MiB in total. Remove one or choose a smaller file.');
  assert.equal(await c.drafts.attachReviewed(pdf('third.pdf'), 'stale'), 'The email account changed. Nothing was added.');
  assert.deepEqual(c.drafts.email(), shown);
  assert.deepEqual(c.shelved(), shelf);
  assert.deepEqual(c.toasts, []);
  // An account that takes one attachment per email still gets each shared file in its own draft.
  const single = await composer({maximumOutgoing: 1});
  const one = file => single.drafts.attachReviewed(file, single.drafts.newDraftTarget().token);
  assert.equal(await one(pdf('a.pdf')), null);
  assert.equal(await one({...pdf('b.pdf'), dataBase64: b64(3, 1)}), null);
  assert.deepEqual(single.attached(), ['b.pdf']);
  assert.deepEqual(single.shelved().map(draft => (draft.attachments ?? []).map(file => file.name)), [['a.pdf']]);
  assert.deepEqual(single.toasts, []);
});
