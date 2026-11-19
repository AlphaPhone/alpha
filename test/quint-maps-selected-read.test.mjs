import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs, call, captureSources, checkpoint, trace} from '../specs/quint/refinement/application/support.mjs';
import {deviceExecutorSources, mountDeviceExecutor, proposalAllowed, settled} from '../specs/quint/refinement/application/device-action-executor.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';

// MapsSelectedRead refinement: the installed device executor's maps_read_selected branch reads the
// real process-local Maps selection registry, and the coordinator's real context gate
// (proposalContextNotice / assertMapsContext) decides the card, the approval and the receipt upload.
const driver = fileURLToPath(import.meta.url);
const fields = {providerId: 'synthetic-provider', providerRevision: 'r1', attribution: 'Synthetic map data',
  kind: 'map-place', label: 'Synthetic place', coordinate: {latitude: 1, longitude: 2}};
const routeFields = {providerId: 'synthetic-provider', providerRevision: 'r1', attribution: 'Synthetic map data',
  kind: 'map-route', from: {latitude: 1, longitude: 2}, to: {latitude: 3, longitude: 4}, mode: 'walk',
  distanceMeters: 10, durationSeconds: 20, traffic: 'none'};

async function fixture() {
  const screen = {view: 'maps', sensitive: false};
  let kind = 'map-place', live = 0, registered = true, reads = [], card = null, approved = false, phase = 'none';
  let outcome = 'none', receipt = null, reviewed = null, uploaded = false, uploadedRevision = -1;
  const owner = {};
  let helpers;
  const contextNow = () => ({view: screen.view, sensitive: screen.sensitive, revision: 1, timeZone: 'UTC',
    ...(screen.view === 'maps' && helpers.getMapsSelectedObject() ? {selectedObject: helpers.getMapsSelectedObject()} : {})});
  const shell = {live: true};
  const mounted = await mountDeviceExecutor(shell, {
    alphaClient: {getState: () => ({context: contextNow()})},
    context() {},
    document: {hidden: false},
  });
  helpers = mounted.helpers;
  let moveDuringRead = false;
  const reader = selectedKind => () => {
    reads.push(live);
    // The owner picks again while the provider is being read: the registry re-checks after the read.
    if (moveDuringRead) {moveDuringRead = false; live++; publish();}
    return selectedKind === 'map-route' ? routeFields : fields;
  };
  const publish = () => helpers.publishMapsSelection(kind, owner, live, kind === 'map-search' ? undefined : reader(kind));
  helpers.clearMapsSelection();
  publish();
  const gate = operation => proposalAllowed(operation, contextNow(), {mapsSelectionCurrent: helpers.validateMapsSelectedObject});
  const target = () => {
    const selected = helpers.getMapsSelectedObject();
    return {type: 'maps_read_selected', target: {kind: selected.kind === 'map-route' ? 'map-route' : 'map-place',
      id: selected.id, revision: selected.revision}};
  };
  return {
    observe: () => ({'s.kind': kind, 's.liveRevision': live, 's.registered': !!helpers.getMapsSelectedObject(),
      's.view': screen.view, 's.sensitive': screen.sensitive, 's.card': !!card && !approved && outcome === 'none',
      's.cardRevision': card ? Number(card.target.revision) : 0, 's.approved': approved, 's.phase': phase,
      // A read counts once the executor returned its result; a read the registry discarded shares nothing.
      's.read': !!receipt?.mapsResult, 's.readRevision': receipt?.mapsResult ? reads.at(-1) : -1, 's.uploaded': uploaded,
      's.uploadedRevision': uploadedRevision, 's.outcome': outcome}),
    pick(next) {kind = next; live = 0; card = null; approved = false; reads = []; outcome = 'none'; receipt = null;
      uploaded = false; uploadedRevision = -1; screen.view = 'maps'; screen.sensitive = false; publish();},
    async review() {
      // A search list publishes no readable target: neither kind of card passes the gate.
      if (kind === 'map-search') {
        const selected = helpers.getMapsSelectedObject();
        for (const as of ['map-place', 'map-route'])
          assert.equal(await gate({type: 'maps_read_selected', target: {kind: as, id: selected.id, revision: selected.revision}}), false);
        return false;
      }
      const operation = target();
      assert.equal(await gate(operation), true, 'The current selection gives a card');
      card = operation;
      return true;
    },
    reselect() {live++; publish();},
    reselectDuringRead() {moveDuringRead = true;},
    clearSelection() {helpers.clearMapsSelection();},
    /** The owner leaves Maps; the published context no longer names the selection. */
    leave() {screen.view = 'home';},
    async approve() {
      if (!(await gate(card))) {outcome = 'refused'; return false;}
      approved = true; phase = 'executing'; reviewed = contextNow();
      return true;
    },
    async execute() {
      // The coordinator hands the executor the context the card was approved on.
      receipt = await settled(mounted.run(card, crypto.randomUUID(), reviewed));
      outcome = receipt.status;
      if (receipt.status === 'succeeded') {
        assert.equal(receipt.mapsResult.target.revision, card.target.revision);
        assert.equal(receipt.summary, 'Shared the selected Maps place.');
      } else {
        assert.equal(receipt.threw, 'not-started', 'A stale selection refuses as not started');
        assert.equal(receipt.mapsResult, undefined);
      }
      phase = 'journaled';
    },
    async upload() {
      // A failed receipt carries no Maps content; a successful one leaves only through the gate.
      if (outcome !== 'succeeded') {phase = 'done'; return 'upload';}
      if (!(await gate(card))) {phase = 'done'; return 'withhold';}
      uploaded = true; uploadedRevision = Number(receipt.mapsResult.target.revision); phase = 'done';
      return 'upload';
    },
  };
}

const scenarios = {
  'approved read of the selected place uploads its revision': async (f, t, step) => {
    assert.equal(await f.review(), true); step('card', call('review'));
    assert.equal(await f.approve(), true); step('approve', call('approve'));
    await f.execute(); step('executor reads the registry', call('executorRead'));
    assert.equal(await f.upload(), 'upload'); step('receipt upload', call('upload'));
  },
  'approved read of the selected route': async (f, t, step) => {
    f.pick('map-route'); step('route selected', call('pick', 'map-route'));
    assert.equal(await f.review(), true); step('card', call('review'));
    assert.equal(await f.approve(), true); step('approve', call('approve'));
    await f.execute(); step('executor reads the registry', call('executorRead'));
    assert.equal(await f.upload(), 'upload'); step('receipt upload', call('upload'));
  },
  'a search result list gives no card': async (f, t, step) => {
    f.pick('map-search'); step('search list selected', call('pick', 'map-search'));
    assert.equal(await f.review(), false); step('no card is offered', {...call('review'), reject: true});
  },
  'the selection moves before approval': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    f.reselect(); step('owner picks again', call('reselect'));
    assert.equal(await f.approve(), false); step('stale approval refused', call('staleApprove'));
  },
  'the selection moves after the read and before the receipt': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    await f.approve(); step('approve', call('approve'));
    await f.execute(); step('executor reads the registry', call('executorRead'));
    f.reselect(); step('owner picks again', call('reselect'));
    assert.equal(await f.upload(), 'withhold'); step('receipt withheld', call('withhold'));
  },
  'the selection is cleared before the read': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    await f.approve(); step('approve', call('approve'));
    f.clearSelection(); step('selection cleared', call('clearSelection'));
    await f.execute(); step('executor refuses as not started', call('executorThrows'));
    assert.equal(await f.upload(), 'upload'); step('failed receipt carries nothing', call('upload'));
  },
  'the selection moves between approval and the read': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    await f.approve(); step('approve', call('approve'));
    f.reselect(); step('owner picks again', call('reselect'));
    await f.execute(); step('executor refuses as not started', call('executorThrows'));
  },
  'the selection moves during the read': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    await f.approve(); step('approve', call('approve'));
    f.reselectDuringRead();
    await f.execute(); step('owner picks again mid-read; executor refuses as not started', [call('reselect'), call('executorThrows')]);
    assert.equal(await f.upload(), 'upload'); step('failed receipt carries nothing', call('upload'));
  },
  'leaving Maps before the read refuses it': async (f, t, step) => {
    await f.review(); step('card', call('review'));
    await f.approve(); step('approve', call('approve'));
    f.leave(); step('owner leaves Maps', call('leaveMaps'));
    await f.execute(); step('executor refuses as not started', call('executorThrows'));
  },
};

test('the installed executor reads only the approved, still-registered Maps selection', {timeout: scaledTimeout(120_000)}, async () => {
  captureSources([driver]);
  const sources = await deviceExecutorSources();
  const traces = [];
  for (const [name, run] of Object.entries(scenarios)) {
    const f = await fixture();
    const t = trace(name, f.observe());
    const step = (label, action) => checkpoint(t, label, action, f.observe());
    await run(f, t, step);
    traces.push(t);
  }
  const receipt = await checkTraces(boundInputs({model: 'MapsSelectedRead', sources: [driver, ...sources], traces,
    scope: 'bounded-component', assumptions: [
      'The executor callback and the Previous notes refusal helper are sliced from agent-adapter.ts and run unchanged; the Maps contract, the selection registry and the coordinator context gate are the real modules.',
      'Card, approval and receipt upload are represented by the coordinator gate proposalContextNotice (assertMapsContext with validateMapsSelectedObject); proposal parsing, journal, claim and upload transport are DeviceActionReview.',
      'One selection owner and a synthetic provider read port; the read port records the registry revision it served.',
    ]}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.traces, Object.keys(scenarios).length);
});
