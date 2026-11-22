// PhotosAgentHost against runHostItemsRequest and createDeviceLibrary in
// apps/app/src/prototype/photo-library-adapter.ts. The assistant's requests enter through the
// mounted library's agent (photo_library_select, photos_album_create); the main host is a fixture
// whose ports follow camera-adapter's host.run: its visit (bumped on leave and hide), busy state,
// album review and selection. Library reads outside the loaded window are answered by settle
// steps, from the library as it is then. The library's own review is a real
// photo_library_review over a port that validates at once.
import assert from 'node:assert/strict';
import {loadProductModule, modelTraces, replayTraces, settle, witnessTraces} from './notes-files-media-itf.mjs';
import {countListeners, installDocument} from './browser-model-traces.mjs';

const source = 'apps/app/src/prototype/photo-library-adapter.ts';
const model = {path: 'specs/quint/application/PhotosAgentHost.qnt', main: 'PhotosAgentHost'};
const stubs = {
  '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>true};',
  '../platform-plugins': 'export const registerPlugin=()=>({});',
};
const witnesses = ['OlderItemSelectedWitness', 'MissingCountedWitness', 'LeftDuringReadWitness', 'ReviewRefusedWitness',
  'BusyRefusedWitness', 'AlbumConfirmedWitness'];
const bump = count => Math.min(2, count + 1);
const media = n => `lib:i:${n}:${n * 10}`, number = id => Number(id.split(":")[2]);
const sorted = values => [...values].sort((a, b) => a - b);

export async function replayPhotosAgentHost({rewrite, ...options} = {}) {
  const traces = [...modelTraces({...model, ...options}), ...witnessTraces({...model, witnesses})];
  const product = await loadProductModule(source, {rewrite, stubs});
  const page = await installDocument();
  const visibilityListeners = countListeners(page.document, ['visibilitychange']);
  return replayTraces(traces, {
    required: ['request', 'settle', 'libraryReviewOpens', 'libraryReviewEnds', 'confirmAlbum', 'cancelAlbum', 'leave', 'enter',
      'hide', 'show', 'busyStarts', 'busyEnds', 'remove', 'restore', 'dispose'],
    reached: {
      'an item older than the window selected': ({s}) => s.selection.includes(2) && !s.window.includes(2),
      'a missing item counted': ({s}) => s.results.some(result => result.missing > 0),
      'a request retired by leaving or hiding Photos': ({s}) => s.refusedLeft > 0,
      'an album request refused by the library review': ({s}) => s.refusedReview > 0,
      'a request refused while Photos was busy': ({s}) => s.refusedBusy > 0,
      'an album review confirmed': ({s}) => s.confirmed.length > 0,
    },
    project: ({s}) => ({inPhotos: s.inPhotos, hidden: s.hidden, disposed: s.disposed, visit: s.visit, busy: s.busy, library: s.library,
      window: s.window, reading: Object.entries(s.requests).filter(([, request]) => request.phase === 'reading').map(([slot]) => Number(slot)),
      selection: s.selection, selectionAsked: s.selectionAsked, albumReview: s.albumReview, libraryReview: s.libraryReview,
      results: s.results, confirmed: s.confirmed, refusedLeft: s.refusedLeft, refusedBusy: s.refusedBusy, refusedNone: s.refusedNone,
      refusedReview: s.refusedReview}),
    async start() {
      page.setHidden(false);
      let inPhotos = true, disposed = false, busy = false, visit = 0, slot = 0, albumReview, selection = [], selectionAsked = [];
      let refusedLeft = 0, refusedBusy = 0, refusedNone = 0, refusedReview = 0;
      const library = new Set([1, 2]), reads = new Map(), pending = new Map(), results = [], confirmed = [];
      let windowRows = [{id: media(1)}];
      const scope = {scope: 'full', images: true, videos: true, canSelectMore: false, canEditOthers: true, locked: false, version: 'v1'};
      const revision = '1700000000:1000:0';
      const port = {
        async scope() { return scope; },
        async inspect({id}) { return {id, revision, kind: 'image', mime: 'image/jpeg', name: 'IMG.jpg', album: 'Camera', width: 400,
          height: 300, takenAt: 1700000000000, modifiedAt: 1700000000000, size: 1000, duration: 0, favorite: false, owned: false, image: ''}; },
        async validate({items}) { return {...scope, items: items.map(item => ({id: item.id, status: 'current'}))}; },
        requestChange() { assert.fail('no library change is confirmed'); },
        share() { assert.fail('no share review is opened'); },
      };
      const devices = product.createDeviceLibrary(port, () => true), signal = new AbortController().signal;
      const release = product.setMainLibraryHost({
        visible: () => !disposed && !page.document.hidden && inPhotos,
        reviewOpen: () => !!albumReview,
        reviewChanged() {},
        trashed() {},
        // camera-adapter host.run: the visit is taken first, an inactive or busy host refuses at once.
        async run(operation, requestSignal) {
          const from = visit, mine = slot;
          if (!inPhotos || disposed) throw new product.LibraryAgentRefusal('Open Photos, then ask again.');
          if (busy) throw new product.LibraryAgentRefusal('Photos is busy right now.');
          return product.runHostItemsRequest(operation, {
            loaded: () => windowRows, idOf: row => row.id,
            read: id => new Promise(resolve => reads.get(mine).push(() => resolve(library.has(number(id)) ? {id} : undefined))),
            current: () => !disposed && !page.document.hidden && inPhotos && from === visit,
            busy: () => busy,
            reviewOpen: () => !!albumReview || devices.reviewBusy(),
            select(rows) { selection = rows.map(row => number(row.id)); selectionAsked = operation.ids.map(number); },
            openReview(_request, rows) { albumReview = rows.map(row => number(row.id)); },
          }, requestSignal);
        },
      });
      assert.equal(visibilityListeners(), 1, 'The mounted library owns one visibility listener');
      const item = (await devices.agent.run({type: 'photo_library_inspect', id: media(1)}, signal)).item;
      const refused = refusal => {
        assert.ok(refusal instanceof product.LibraryAgentRefusal, String(refusal));
        if (refusal.message === 'Open Photos, then ask again.') refusedLeft = bump(refusedLeft);
        else if (refusal.message === 'Photos is busy right now.') refusedBusy = bump(refusedBusy);
        else if (refusal.message === 'Finish the open review first.') refusedReview = bump(refusedReview);
        else { assert.match(refusal.message, /^(None of those items are in Photos|Those items are not in Photos)\.$/);refusedNone = bump(refusedNone); }
      };
      const endVisit = () => { visit++;selection = [];albumReview = undefined; };
      return {
        actions: {
          async request({slot: from, kind, ids}) {
            slot = from;reads.set(from, []);
            const named = sorted(ids).map(media), state = {done: false};pending.set(from, state);
            const work = kind === 'select'
              ? devices.agent.run({type: 'photo_library_select', ids: named}, signal)
              : devices.agent.runView({type: 'photos_album_create', name: 'Trip', ids: named}, signal);
            void work.then(result => {
              const selected = kind === 'select' ? result.selected : result.count;
              assert.equal(kind === 'select' ? result.kind : `${result.kind}:${result.status}`, kind === 'select' ? 'photo_library_select' : 'photos_album_create:review_opened');
              results.push({kind, asked: named.length, selected, missing: result.missing});
            }, refused).finally(() => { state.done = true; });
            await settle();
          },
          async settle({slot: from}) {
            const state = pending.get(from);
            for (let rounds = 0; !state.done; rounds++) {
              assert.ok(rounds < 8, 'the request did not finish');
              const answer = reads.get(from).shift();
              if (answer) answer();
              await settle();
            }
          },
          async libraryReviewOpens() {
            const result = await devices.agent.run({type: 'photo_library_review', action: 'favorite', items: [{id: item.id, revision: item.revision}]}, signal);
            assert.equal(result.status, 'review_opened');
          },
          libraryReviewEnds() { devices.reviewCard().cancel(); },
          confirmAlbum() { confirmed.push(albumReview);albumReview = undefined; },
          cancelAlbum() { albumReview = undefined; },
          leave() { devices.leave();inPhotos = false;endVisit(); },
          enter() { inPhotos = true; },
          hide() { page.setHidden(true);endVisit(); },
          show() { page.setHidden(false); },
          busyStarts() { busy = true; },
          busyEnds() { busy = false; },
          remove({media: at}) { library.delete(at);windowRows = windowRows.filter(row => number(row.id) !== at); },
          restore({media: at}) { library.add(at); },
          dispose() { devices.dispose();release();disposed = true;inPhotos = false;selection = [];albumReview = undefined; },
        },
        observe() {
          return {inPhotos, hidden: page.document.hidden, disposed, visit, busy, library: sorted(library), window: sorted(windowRows.map(row => number(row.id))),
            reading: sorted([...pending].filter(([, state]) => !state.done).map(([from]) => from)),
            selection: sorted(selection), selectionAsked: sorted(selectionAsked), albumReview: sorted(albumReview ?? []), libraryReview: !!devices.reviewCard(),
            results: results.map(result => ({...result})), confirmed: confirmed.map(sorted), refusedLeft, refusedBusy, refusedNone, refusedReview};
        },
        async close() {
          for (const queue of reads.values()) for (const answer of queue.splice(0)) answer();
          await settle();
          if (!disposed) { devices.dispose();release(); }
          assert.equal(visibilityListeners(), 0, 'Retiring Photos released its visibility listener');
        },
      };
    },
  }).finally(() => page.restore());
}
