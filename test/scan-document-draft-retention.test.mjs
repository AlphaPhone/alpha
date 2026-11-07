import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'esbuild';

// Exercise the same shared controller that Alpha's scan-document dialog uses.
const entry = resolve(import.meta.dirname, '../.eliza/client-features/plugins/plugin-native-camera/src/scan-document.ts');
const {outputFiles} = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent'});
const {createScanDocument} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
const page = {type: 'image/png', size: 100};

function fixture() {
  let stored;
  let revision = 0;
  const removed = [];
  const doc = createScanDocument({
    first: page,
    autosave: true,
    drafts: {
      async save(pages, expectedRevision, signal, textLayers) {
        signal.throwIfAborted();
        assert.equal(expectedRevision, stored?.revision, 'each write uses the current draft revision');
        stored = {revision: String(++revision), pages, textLayers};
        return {revision: stored.revision};
      },
      async read() { return stored; },
      async remove(expectedRevision, signal) {
        signal.throwIfAborted();
        assert.equal(expectedRevision, stored?.revision, 'cleanup deletes only the matching revision');
        removed.push(expectedRevision);
        stored = undefined;
      },
    },
  });
  return {doc, removed, stored: () => stored};
}

for (const route of ['document PDF', 'searchable PDF']) {
  const exportDocument = async doc => {
    if (route === 'document PDF') {
      await doc.exportPages(async pages => {
        assert.deepEqual(pages, [page]);
        return {status: 'exported', message: 'Saved'};
      });
    } else {
      await doc.run(async () => doc.exportFinished('exported'));
    }
    // Export cleanup intentionally runs asynchronously after queued draft writes.
    await new Promise(setImmediate);
  };

  test(`${route} export preserves an explicitly saved native autosave draft`, async () => {
    const {doc, removed, stored} = fixture();
    await doc.settled();
    assert.equal(doc.snapshot().autoSaved, true);
    assert.equal(await doc.saveDraft(), true);
    const saved = stored();
    assert.equal(doc.snapshot().autoSaved, false, 'explicit Save changes ownership of the saved draft');
    await exportDocument(doc);
    assert.equal(doc.snapshot().exported, true);
    assert.equal(stored(), saved, 'the explicit draft and its reviewed pages remain available');
    assert.deepEqual(removed, []);
    assert.equal(doc.snapshot().draftRevision, saved.revision);
    assert.equal(doc.snapshot().controls.deleteDraft, true, 'the user can still explicitly delete the draft');
    doc.close();
    assert.equal(stored(), saved, 'closing the exported review retains the explicit draft');
  });

  test(`${route} export still removes a draft saved only automatically`, async () => {
    const {doc, removed, stored} = fixture();
    await doc.settled();
    const revision = stored().revision;
    await exportDocument(doc);
    assert.deepEqual(removed, [revision]);
    assert.equal(stored(), undefined);
    assert.equal(doc.snapshot().draftRevision, undefined);
    doc.close();
  });
}
