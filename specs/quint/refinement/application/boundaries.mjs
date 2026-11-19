import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {checkTraces as check} from '../check-traces.mjs';
import {root, bundledSource, sourceContext, deferred, tick, trace, checkpoint, call, captureSources, boundInputs} from './support.mjs';
captureSources(['specs/quint/refinement/application/boundaries.mjs']);
const checkTraces = options => check(boundInputs({...options, sources: [...options.sources,
  'specs/quint/refinement/application/boundaries.mjs', 'specs/quint/refinement/application/support.mjs']}));

export async function filesAndSharing() {
  const source = 'apps/app/src/prototype/file-email-review.ts';
  const attachment = await bundledSource('apps/app/src/runtime/inbox-attachment.ts');
  const drafts = await bundledSource('apps/app/src/ui/mailbox/drafts-controller.ts', {'import.meta.env': '{}'});
  const traces = [];
  const earlierText = {1: 'Earlier unfinished text', 2: 'Earlier unfinished text, edited'};
  // `duplicate`: the owner attached the selected file to the unfinished draft first, so the share is the duplicate refusal.
  for (const [name, changed, edited, duplicate] of [['exact', false, false, false], ['changed', true, false, false], ['edited-earlier', false, true, false], ['duplicate', false, false, true]]) {
    const page = new JSDOM('<div></div>', {pretendToBeVisual: true});
    let readCount = 0, opened = 0, carryNotice = '';
    const {document} = page.window, held = deferred(), rows = new Map(), toasts = [];
    const file = {name: 'Owned.txt', mimeType: 'text/plain', dataBase64: Buffer.from('first').toString('base64')};
    const reviewed = await attachment.exports.reviewMailAttachment(file);
    const second = {...file, dataBase64: Buffer.from('changed').toString('base64')};
    const changedReview = await attachment.exports.reviewMailAttachment(second);
    // The actual drafts controller on in-memory compare-and-exchange slots: no provider, network or device.
    const identity = {sessionId: 'session', account: {environment: 'test', userId: 'owner', sessionId: 'session'}};
    const mail = drafts.exports.createMailDraftsController({
      publish() {}, toast: text => toasts.push(text), identity: () => identity, confirm: () => true,
      provider: {prepare: async () => { throw Error('No provider operation'); },
        capabilities: () => ({send: false, providerDrafts: false, from: 'owner@example.invalid', attachmentPolicy: {maximumOutgoing: 10, maximumTotalBytes: 5 * 1024 * 1024}})},
      store: {read: async key => structuredClone(rows.get(key) ?? null), compareExchange: async (key, before, next) => {
        if (JSON.stringify(rows.get(key) ?? null) !== JSON.stringify(before)) return {status: 'conflict'};
        if (next === null) rows.delete(key); else rows.set(key, structuredClone(next));
        return {status: 'saved'};
      }},
      retained: () => ({ready: Promise.resolve(), available: false, peek: () => null, conflict: false, error: false, status: '',
        edit() {}, resume() {}, replace() {}, retry() {}, clear: async () => {}, recover() {}, retire() {}}),
      // The composer's own Attach picks the same selected file.
      attachments: {select: async () => ({status: 'selected', selectionId: 'owner-pick', name: file.name}), read: async () => ({...file, ...reviewed}), forget: async () => {}},
      reviewAttachment: async value => value,
    });
    await mail.bind('grant', 'owner@example.invalid');
    for (let attempt = 0; !mail.newDraftTarget().ready && attempt < 12; attempt++) await tick();
    // The owner's unfinished email, left when they went Home: its composer is closed, the draft is kept.
    assert.equal(mail.useSuggestion(earlierText[1]), true);
    const earlierId = mail.email().draftId;
    mail.close();
    const observe = () => {
      const shelf = [...rows].find(([key]) => key.startsWith('inbox-drafts:v1:shelf:'))?.[1];
      const kept = shelf?.items.find(row => row.draft.id === earlierId)?.draft;
      const open = mail.email(), fresh = open && open.draftId !== earlierId ? open.proposal : null;
      const earlier = kept || (open?.draftId === earlierId ? {body: open.proposal.bodyText, attachments: open.proposal.attachments} : null);
      const content = draft => Number(Object.keys(earlierText).find(key => earlierText[key] === draft?.body) ?? -1);
      // The source whose bytes a draft holds: 0 for none, -1 for anything the model does not name.
      const bytes = draft => { const list = draft?.attachments || []; return !list.length ? 0 : list.length > 1 ? -1 : list[0].dataBase64 === file.dataBase64 ? 1 : list[0].dataBase64 === second.dataBase64 ? 2 : -1; };
      return {'s.inserted': !!fresh && fresh.attachments.length === 1 && fresh.attachments[0].dataBase64 === file.dataBase64 && !fresh.bodyText,
        's.newDraft': !!fresh, 's.earlier': content(earlier), 's.kept': kept ? content(kept) : 0,
        's.earlierBytes': earlier ? bytes(earlier) : -1, 's.keptBytes': kept ? bytes(kept) : 0};
    };
    const module = sourceContext([source], ['reviewFileEmail'], {window: page.window, document,
      AbortController: page.window.AbortController, reviewMailAttachment: attachment.exports.reviewMailAttachment,
      rethrowAttachmentRefusal: drafts.exports.rethrowAttachmentRefusal});
    const t = trace(`attachment-${name}`, observe());
    if (duplicate) {
      mail.begin();mail.render().c.attach();
      for (let attempt = 0; (observe()['s.earlierBytes'] !== 1 || mail.render().c.busy) && attempt < 40; attempt++) await tick();
      mail.close();
      checkpoint(t, 'the owner attaches the selected file to the unfinished draft in its composer', call('attachEarlier'), observe());
    }
    const close = module.reviewFileEmail({read: async () => {
      if (++readCount === 1) return {...file, ...reviewed};
      await held.promise;
      return changed ? {...second, ...changedReview} : {...file, ...reviewed};
    }, current: () => true, target: () => mail.newDraftTarget(),
    insert: (value, token, live) => mail.attachReviewed(value, token, live),
    inserted() {opened++;}, notify(message) {carryNotice=message;}});
    for(let attempt=0;readCount<2&&attempt<12;attempt++) await tick();
    assert.equal(readCount,2);
    checkpoint(t, 'Email click binds the account and validates the first read', call('read'), observe());
    if (changed) checkpoint(t, 'selected bytes change before the second read', call('changeSource'), observe());
    if (edited) {
      mail.render().c.onBody({target: {value: earlierText[2]}});
      checkpoint(t, 'the owner edits the unfinished draft during the read', call('editEarlier'), observe());
    }
    held.resolve();
    for (let attempt = 0; !opened && !carryNotice && attempt < 40; attempt++) await tick();
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(opened, changed || duplicate ? 0 : 1);
    if (changed) assert.match(carryNotice,/selected file changed/);
    else if (duplicate) assert.equal(carryNotice, 'This file is already attached to your unfinished email in Inbox. Nothing was added.');
    else assert.equal(carryNotice, '');
    assert.deepEqual(toasts, [], 'the review shows its one outcome; the draft side adds no notice');
    checkpoint(t, 'only new matching bytes start a new draft; the unfinished one is kept as it was', call(changed ? 'insertFailed' : duplicate ? 'duplicateRefused' : 'insert'), observe());
    close(); page.window.close(); traces.push(t);
  }
  return checkTraces({model: 'FilesAndSharing', sources: [source, ...attachment.sources, ...drafts.sources], traces, scope: 'bounded-component', assumptions: [
    'The actual Email action, shared validator, exact-byte reread, drafts controller and composer Attach execute on in-memory draft slots.',
    'Native grant changes, the Inbox account binding and cross-tab persistence are separate check boundaries.']});
}

export async function notificationCollection() {
  const source = 'apps/app/src/browser/notifications.ts', traces = [];
  for (const preview of [false, true]) for (const secret of [false, true]) {
    const page = new JSDOM('<div></div>', {pretendToBeVisual: true});
    let revision = 0;
    const state = {revision: 'r0', epoch: 'e0', enabled: false, paused: false, history: false, accessGranted: true,
      apps: [], events: [], dismissed: [], appEnabled: true, channels: {}, deviceEvents: []};
    const module = sourceContext([source], ['BrowserNotifications'], {
      window: page.window, document: page.window.document, crypto: webcrypto,
      Event: page.window.Event, CustomEvent: page.window.CustomEvent,
      WebPlugin: class {async notifyListeners() {}}, BrowserCalendar: class {},
      browserApps: [{packageName: 'browser.messages', label: 'Messages', view: 'messages'}],
      revision: () => `r${++revision}`, notificationState: async () => structuredClone(state),
      notificationDocument: {async edit(editor) {const next = structuredClone(state); const result = await editor(next); Object.assign(state, next); return result;}},
      readDevicePreferences: async () => ({}), browserScreenLocked: () => false, focusActive: () => false,
      focusHoldsNotice: () => false, focusAllowedNotices: () => [], listWorkflowNotices: async () => [],
      browserHostedResults: {list: async () => []}, NotificationPolicyChanged: class extends Error {},
    });
    const notifications = new module.BrowserNotifications({listReminders: async () => ({reminders: []})});
    const t = trace(`notice-preview-${preview}-secret-${secret}`, {'s.enabled': (await notifications.crossAppStatus()).enabled}, call('initFor', false));
    checkpoint(t, 'browser permission readback', call('grantAccess'), {'s.access': (await notifications.crossAppStatus()).accessGranted});
    await notifications.setNotificationPolicy({expectedRevision: state.revision, enabled: true, history: false, apps: [{packageName: 'browser.messages', preview}]});
    checkpoint(t, 'real policy mutation', [call('reviewPolicy', true, true, preview, false), call('commitPolicy', true)], {'s.enabled': state.enabled, 's.preview': state.apps[0].preview});
    await notifications.inject({packageName: 'browser.messages', title: 'Private title', text: 'Private text', secret});
    checkpoint(t, 'real source event arrives', call('post', secret), {'s.eventPresent': state.deviceEvents.length > 0});
    let rows = (await notifications.list()).items;
    checkpoint(t, 'actual list and redaction', [call('beginRead'), call('readComplete')], {'s.rowPresent': rows.length > 0, 's.rowText': rows.some(row => !!row.text)});
    Object.defineProperty(page.window.document, 'hidden', {value: true, configurable: true});
    rows = (await notifications.list()).items;
    checkpoint(t, 'lock while source event persists', [call('lock'), call('beginRead'), call('readComplete')],
      {'s.rowPresent': rows.length > 0, 's.rowText': rows.some(row => !!row.text)});
    assert.equal(rows.every(row => !row.canOpen), true);
    page.window.close(); traces.push(t);
  }
  return checkTraces({model: 'NotificationCollection', sources: [source], traces, scope: 'bounded-component', assumptions: [
    'Actual browser policy, event injection, listing and redaction bodies execute for four preview/secret combinations.',
    'Document and non-notification service dependencies are controlled ports. Native signature/user identity, history failures, action races and cross-tab CAS remain additional obligations.']});
}

export async function developmentHost() {
  const source = 'scripts/cloud-resident-host.ts';
  captureSources([source, 'scripts/local-agent-source.ts', 'scripts/native-view-policy.ts',
    'scripts/cloud-sdk-authority.ts', 'vendor/eliza/packages/agent/native-host/private-runtime-launch.mjs',
    'test/fixtures/product-character-host.mjs', 'scripts/native-google-host-artifact.ts', 'scripts/workflow-worker-artifact.ts']);
  const fixtureGraph=buildSync({absWorkingDir:root,entryPoints:['test/fixtures/product-character-host.mjs'],bundle:true,write:false,platform:'node',format:'esm',metafile:true});
  captureSources(Object.keys(fixtureGraph.metafile.inputs).filter(path=>!path.startsWith('node_modules/')));
  const {createCloudResidentHost} = await import(new URL('../../../../test/fixtures/product-character-host.mjs', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'alpha-refinement-host-'));
  const launches = [];
  const host = await createCloudResidentHost({profile: directory, port: 48768,
    launch: async options => {const completion = deferred(); const child = {options, completion: completion.promise, async stop() {completion.resolve({code: 0});}}; launches.push(child); return child;},
    inherited: {PATH: process.env.PATH}});
  try {
    const observe = () => ({'s.bound': host.status('one').attachable ? 1 : 0});
    const t = trace('real-host-binding-retirement', observe());
    await host.bind({token: 'synthetic-credential', credentialId: 'one', reference: 'reference-one'});
    checkpoint(t, 'source host accepts verified binding and launches owned process', [call('beginLogin'), call('receiveClaim'), call('commitCredential'), call('bind'), call('ready')], observe());
    await host.bind({token: 'synthetic-credential', credentialId: 'one', reference: 'reference-one'});
    assert.equal(launches.length, 1); checkpoint(t, 'same binding reuses source process', null, observe());
    await host.clear(); checkpoint(t, 'real host retires binding', [call('retireResident'), call('stopped'), call('signOut')], observe());
    assert.equal(launches.at(-1).options.env.ELIZAOS_CLOUD_API_KEY, undefined);
    await host.close();
    assert.throws(()=>host.status('one'),{code:'provider-changed'},'closed hosts retire provider-status authority');
    checkpoint(t, 'close source host', call('close'), {'s.bound':0});
    return checkTraces({model: 'DevelopmentHost', sources: [source, 'scripts/local-agent-source.ts', 'scripts/native-view-policy.ts',
      'scripts/cloud-sdk-authority.ts', 'vendor/eliza/packages/agent/native-host/private-runtime-launch.mjs'], traces: [t], scope: 'bounded-component', assumptions: [
      'Actual private-profile and resident-host logic execute through the existing product-character fixture with a relocated synthetic SDK/worker root and a process-launch port. All source and worker admission checks run; no network or real child starts.',
      'Binding observation covers attachability, retirement and same-binding reuse. Browser credential claims, requests, failed stop and launcher shutdown schedules remain untested.']});
  } finally {await host.close(); await rm(directory, {recursive: true, force: true});}
}
