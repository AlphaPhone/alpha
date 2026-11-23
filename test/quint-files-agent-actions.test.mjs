import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs, call, captureSources, checkpoint, deferred, read, root, tick, trace} from '../specs/quint/refinement/application/support.mjs';
import {deviceExecutorSources, mountDeviceExecutor, proposalAllowed, settled} from '../specs/quint/refinement/application/device-action-executor.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';

// FilesAgentActions refinement: the installed device executor's Files branch with the real Files
// browser runner (files-browser-adapter.ts, the shared storage model and agent contract) mounted over
// a storage port. Navigation into Files is the adapter's own openInternalView; the coordinator's real
// context gate decides approval and the runner itself reads the reviewed identities.
const driver = fileURLToPath(import.meta.url);
const coordinator = 'apps/app/src/ui/device-actions/client-coordinator.ts';
const runnerSource = 'apps/app/src/ui/files/files-browser-adapter.ts';
const file = {name: 'Report.txt', path: 'Download/Report.txt', mimeType: 'text/plain', size: 4, modified: 1, directory: false};
const identity = 'A'.repeat(43);

async function compileRunner() {
  const built = await build({absWorkingDir: root, entryPoints: [runnerSource], bundle: true, platform: 'node',
    format: 'cjs', write: false, metafile: true, plugins: [{name: 'files-agent-observer', setup(builder) {
      builder.onLoad({filter: /\/files-browser-adapter\.ts$/}, ({path}) => {
        const input = readFileSync(path, 'utf8'), marker = '  const repaint = () =>';
        assert.equal(input.split(marker).length, 2, 'One Files observation seam');
        // The owner moving to another place in Files is the adapter's own navigation.
        return {loader: 'ts', contents: input.replace(marker, '  __port.go = (next) => go(next);\n' + marker)};
      });
    }}]});
  const sources = Object.keys(built.metafile.inputs).filter(path => !path.startsWith('node_modules/'));
  captureSources(sources);
  return {code: built.outputFiles[0].text, sources};
}

async function fixture(compiled) {
  const screen = {view: 'home', sensitive: false, hidden: false, granted: true};
  let op = 'files_filter', authority = 'none', outcome = 'none', proposal = null, reviewed = false;
  let navigated = false, filtered = false, preview = false, shareSheet = false, identityCurrent = true;
  const counts = {folders: 0, moved: 0, trashed: 0};
  const held = {select: null};
  const document = Object.assign(new EventTarget(), {querySelector: () => null});
  Object.defineProperty(document, 'hidden', {get: () => screen.hidden});
  const access = () => ({status: 'ready', access: screen.granted ? 'granted' : 'denied', volumes: [{id: 'primary', primary: true}]});
  const outcomes = (paths, done) => paths.map(path => ({path, status: identityCurrent ? done : 'changed'}));
  const storage = {
    async storageState() {return access();},
    async storageRequestAccess() {return access();},
    async storageList() {return {status: 'ready', entries: [file]};},
    async storageCategory() {return {status: 'ready', entries: [], count: 0};},
    async storageQuery() {return {status: 'ready', entries: [file], truncated: false};},
    async storageReviewedIdentities({paths, volume}) {
      assert.equal(volume, 'primary');
      return {status: 'ready', reviewed: paths.map(() => identity)};
    },
    async storageSelect({path}) {
      held.select = deferred();
      await held.select.promise;
      held.select = null;
      return path === file.path ? {status: 'selected', selectionId: 'selection-1'} : {status: 'missing'};
    },
    async storageShare() {shareSheet = true; return {status: 'opened'};},
    async storageCreateFolder({name}) {counts.folders++; return {status: 'ready', path: 'Download/' + name};},
    async storageTransfer({paths, reviewed: ids}) {
      assert.deepEqual(ids, [identity]);
      const result = outcomes(paths, 'moved');
      counts.moved += result.filter(row => row.status === 'moved').length;
      return {status: 'ready', outcomes: result};
    },
    async storageTrash({paths, reviewed: ids}) {
      assert.deepEqual(ids, [identity]);
      const result = outcomes(paths, 'trashed');
      counts.trashed += result.filter(row => row.status === 'trashed').length;
      return {status: 'ready', outcomes: result};
    },
    async storageTrashList() {return {status: 'ready', items: []};},
    async storageWatch() {return {status: 'ready'};},
    async storageUnwatch() {return {status: 'ready'};},
    async storageRename() {assert.fail('No rename');},
    async storageRestore() {assert.fail('No restore');},
    async storageEmptyTrash() {assert.fail('No empty Trash');},
    async storageOpen() {assert.fail('No external open');},
    async addListener() {return {async remove() {}};},
  };
  const port = {}, module = {exports: {}};
  new Function('require', 'module', 'exports', '__port', 'document', 'window', compiled.code)(
    createRequire(import.meta.url), module, module.exports, port, document, new EventTarget());
  const local = {}, api = {ic: {}, get: () => local, isActive: () => screen.view === 'files', toast() {},
    set(patch) {Object.assign(local, patch);}, open() {assert.fail('The executor opens Files itself');}};
  const view = {render: () => ({}), onLeave() {}};
  const runner = module.exports.installFilesBrowserAdapter(view, async () => {preview = true;}, () => {}, {
    storage, createInlineModal: () => ({ref() {}}), menuFocus() {}, async forgetSelected() {},
  });
  const show = async () => {view.render(local, api); await tick(); await tick();};
  const shell = {live: true, filesAgent: runner, S: () => ({view: screen.view, chat: 'hidden'}),
    setState(_patch, done) {done?.();},
    openView(target) {assert.equal(target, 'files'); screen.view = 'files'; navigated = true; view.render(local, api);},
    goHome() {assert.fail('No Home navigation');}};
  const contextNow = () => ({view: screen.view, sensitive: screen.sensitive, revision: 1, timeZone: 'UTC'});
  const session = {sessionId: 'session'};
  const mounted = await mountDeviceExecutor(shell, {
    alphaClient: {getState: () => ({context: contextNow()})},
    context() {},
    document,
    activeShell: shell,
    views: {files: view},
    connectionController: {getSnapshot: () => ({session})},
  });
  const helpers = mounted.helpers;
  const operations = {
    files_filter: () => ({type: 'files_filter', text: 'Report'}),
    files_open: () => ({type: 'files_open', path: file.path}),
    files_share: () => ({type: 'files_share', paths: [file.path]}),
    files_folder_create: () => ({type: 'files_folder_create', parent: 'Download', name: 'Agent folder'}),
    files_move: () => ({type: 'files_move', paths: [file.path], dest: 'Documents'}),
    files_trash: () => ({type: 'files_trash', paths: [file.path]}),
  };
  let pending = null;
  proposal = helpers.validateFilesOperation(operations[op]());
  return {
    observe: () => ({'s.op': op, 's.authority': authority, 's.view': screen.view, 's.sensitive': screen.sensitive,
      's.foreground': !screen.hidden, 's.granted': screen.granted, 's.reviewed': reviewed, 's.navigated': navigated,
      's.filtered': filtered, 's.preview': preview, 's.shareSheet': shareSheet, 's.folders': counts.folders,
      's.moved': counts.moved, 's.trashed': counts.trashed, 's.outcome': outcome}),
    async scene(next, sensitive, foreground, granted) {
      if (screen.view === 'files' && next !== 'files') view.onLeave(api);
      Object.assign(screen, {view: next, sensitive, hidden: !foreground, granted});
      if (next === 'files') await show();
    },
    propose(next) {
      op = next; proposal = helpers.validateFilesOperation(operations[next]()); reviewed = false; outcome = 'none';
      navigated = filtered = preview = shareSheet = false; identityCurrent = true;
    },
    /** Building the card reads each file's identity from the open Files view (setFilesReviewIdentity). */
    async bindIdentities() {
      const ids = await runner.reviewedIdentities(proposal.paths, new AbortController().signal);
      proposal = helpers.validateFilesOperation({...proposal, reviewed: ids});
      reviewed = true;
    },
    filesChange() {identityCurrent = false;},
    /** The owner moves to another folder in Files while the open waits on storage. */
    async selectionChanges() {port.go({kind: 'folder', path: 'Documents'}); await tick();},
    gate: () => proposalAllowed(proposal, contextNow(), {mapsSelectionCurrent: () => false}),
    async begin(as, gated = true) {
      if (as === 'request') assert.ok(helpers.FILES_DIRECT_TYPES.includes(op), 'Only a direct type runs without a card');
      if (as === 'review' && gated) assert.equal(await this.gate(), true, 'The coordinator admits the card on this screen');
      authority = as;
      navigated = filtered = preview = shareSheet = false;
      const expected = contextNow();
      pending = settled(mounted.run(proposal, crypto.randomUUID(), expected));
      for (let i = 0; i < 8 && !held.select; i++) await tick();
      if (!held.select) return this.finish();
    },
    releaseSelect() {held.select.resolve();},
    async finish() {
      const result = await pending;
      pending = null;
      assert.equal(result.threw, null, result.summary);
      outcome = result.status;
      if (op === 'files_filter' && result.status === 'succeeded') {filtered = true; assert.equal(result.summary, 'Showing 1 item in Files.');}
      if (op === 'files_open' && result.status !== 'succeeded') preview = false;
      return result;
    },
    settle() {authority = 'none'; outcome = 'none';},
  };
}

const scenarios = {
  'a direct filter brings Files forward and shows the filter': async (f, step) => {
    await f.begin('request'); step('filter runs without a card and opens Files', [call('runDirect'), call('openFiles'), call('showFilter')]);
    f.settle(); step('settled', call('settle'));
  },
  'a direct open from Home previews the file': async (f, step) => {
    f.propose('files_open'); step('open proposed', call('propose', 'files_open'));
    const early = await f.begin('request'); assert.equal(early, undefined, JSON.stringify(early));
    step('runs without a card and opens Files', [call('runDirect'), call('openFiles')]);
    f.releaseSelect(); await f.finish(); step('preview opens', call('open', true));
  },
  'a listing that changes during an open opens nothing': async (f, step) => {
    await f.scene('files', false, true, true); step('Files open', call('scene', 'files', false, true, true, true));
    f.propose('files_open'); step('open proposed', call('propose', 'files_open'));
    await f.begin('request'); step('runs without a card', call('runDirect'));
    await f.selectionChanges(); step('owner moves to another folder', call('selectionChanges'));
    f.releaseSelect(); const result = await f.finish(); step('nothing opens', call('open', true));
    assert.equal(result.summary, 'Nothing was opened because Files changed.');
  },
  'a move needs the identities the card read': async (f, step) => {
    await f.scene('files', false, true, true); step('Files open', call('scene', 'files', false, true, true, true));
    f.propose('files_move'); step('move proposed', call('propose', 'files_move'));
    await f.bindIdentities(); step('card binds identities', call('bindIdentities'));
    await f.begin('review'); step('approved and moved', [call('approve'), call('transfer')]);
  },
  'a file moved away after review is left alone': async (f, step) => {
    await f.scene('files', false, true, true); step('Files open', call('scene', 'files', false, true, true, true));
    f.propose('files_trash'); step('trash proposed', call('propose', 'files_trash'));
    await f.bindIdentities(); step('card binds identities', call('bindIdentities'));
    f.filesChange(); step('the file changes on disk', call('filesChange'));
    await f.begin('review'); step('approved, nothing trashed', [call('approve'), call('transfer')]);
  },
  'a reviewed share outside Files is refused by the executor': async (f, step) => {
    f.propose('files_share'); step('share proposed', call('propose', 'files_share'));
    assert.equal(await f.gate(), false, 'The coordinator offers no approval away from Files');
    await f.begin('review', false); step('executor refuses', [call('approve'), call('refuse')]);
  },
  'a share opens the system sheet and nothing else': async (f, step) => {
    await f.scene('files', false, true, true); step('Files open', call('scene', 'files', false, true, true, true));
    f.propose('files_share'); step('share proposed', call('propose', 'files_share'));
    await f.begin('review'); step('approved, sheet opens', [call('approve'), call('share', true)]);
  },
  'a reviewed new folder': async (f, step) => {
    await f.scene('files', false, true, true); step('Files open', call('scene', 'files', false, true, true, true));
    f.propose('files_folder_create'); step('folder proposed', call('propose', 'files_folder_create'));
    await f.begin('review'); step('approved, folder created', [call('approve'), call('createFolder', true)]);
  },
  'a protected screen refuses a direct filter': async (f, step) => {
    await f.scene('files', true, true, true); step('protected screen', call('scene', 'files', true, true, true, true));
    await f.begin('request'); step('refused', [call('runDirect'), call('refuse')]);
  },
  'a hidden phone refuses a direct filter': async (f, step) => {
    await f.scene('files', false, false, true); step('phone hidden', call('scene', 'files', false, false, true, true));
    await f.begin('request'); step('refused', [call('runDirect'), call('refuse')]);
  },
  'storage access off refuses a reviewed share': async (f, step) => {
    await f.scene('files', false, true, false); step('access off', call('scene', 'files', false, true, true, false));
    f.propose('files_share'); step('share proposed', call('propose', 'files_share'));
    await f.begin('review'); step('refused', [call('approve'), call('refuse')]);
  },
};

test('the installed executor runs Files tools through the real Files runner and only as reviewed', {timeout: scaledTimeout(120_000)}, async () => {
  captureSources([driver]);
  // DirectOnlyFilterAndOpen: the coordinator's direct-request list takes exactly the shared Files direct types.
  const coordinatorText = read(coordinator), start = coordinatorText.indexOf('const directTypes');
  assert.match(coordinatorText.slice(start, coordinatorText.indexOf('];', start)), /\.\.\.FILES_DIRECT_TYPES/);
  const compiled = await compileRunner();
  const sources = await deviceExecutorSources();
  const traces = [];
  for (const [name, run] of Object.entries(scenarios)) {
    const f = await fixture(compiled);
    assert.deepEqual([...(await mountDeviceExecutor({}, {})).helpers.FILES_DIRECT_TYPES], ['files_filter', 'files_open']);
    const t = trace(name, f.observe());
    await run(f, (label, action) => checkpoint(t, label, action, f.observe()));
    traces.push(t);
  }
  const receipt = await checkTraces(boundInputs({model: 'FilesAgentActions', sources: [driver, coordinator, ...compiled.sources, ...sources], traces,
    scope: 'bounded-component', assumptions: [
      'The executor callback and openInternalView are sliced from agent-adapter.ts and run unchanged; the Files runner is the real files-browser-adapter.ts bundle with one seam exposing its own folder navigation; the agent contract, the coordinator gate proposalContextNotice (filesContextAllowed) and the direct-request list are the real sources.',
      'Storage is a port over one primary-volume file; a file changed on disk is a transfer or trash outcome other than moved/trashed. Identities are read by the runner, as setFilesReviewIdentity does when the card is built.',
      'Primary storage only; external volumes, listing reloads, the owner’s choice in the share sheet and Android storage are not driven. Proposal parsing, journal, claim and receipt are DeviceActionReview.',
    ]}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.traces, Object.keys(scenarios).length);
});
