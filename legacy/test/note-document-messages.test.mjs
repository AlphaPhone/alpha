import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {noteDocumentText} from '../apps/app/src/ui/notes/note-document-messages.ts';

// Alpha words every Notes document result. Android's AlphaNoteDocumentsPlugin reports distinct
// reasons under one status; each reviewed native sentence keeps the step that fixes it.
const plugin = readFileSync(new URL('../android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteDocumentsPlugin.java', import.meta.url), 'utf8');
const nativeSaid = message => assert.ok(plugin.includes(`"${message}"`), `AlphaNoteDocumentsPlugin no longer says: ${message}`);

test('a save that needs the note open and unlocked says so, not that saving is unavailable', () => {
  nativeSaid('Open and unlock the selected note before saving.');
  assert.equal(noteDocumentText('export-text', 'unavailable', 'Open and unlock the selected note before saving.'), 'Open and unlock the note, then save again.');
});

test('a busy picker and an unusable provider result each keep their own sentence', () => {
  nativeSaid('A document operation is already open.');
  nativeSaid('The document provider returned no accessible document.');
  for (const operation of ['import', 'export-text', 'export-pdf'])
    assert.equal(noteDocumentText(operation, 'unavailable', 'A document operation is already open.'), 'Another document is already open. Finish it, then try again.');
  assert.equal(noteDocumentText('export-text', 'unavailable', 'The document provider returned no accessible document.'), 'The chosen location could not be opened. Choose another location. Nothing exported.');
  assert.equal(noteDocumentText('export-pdf', 'unavailable', 'The document provider returned no accessible document.'), 'The chosen location could not be opened. Choose another location. Nothing exported.');
  assert.equal(noteDocumentText('import', 'unavailable', 'The document provider returned no accessible document.'), 'The chosen file could not be opened. Choose another file. Nothing imported.');
  const distinct = new Set([
    noteDocumentText('export-text', 'unavailable', 'Open and unlock the selected note before saving.'),
    noteDocumentText('export-text', 'unavailable', 'A document operation is already open.'),
    noteDocumentText('export-text', 'unavailable', 'The document provider returned no accessible document.'),
    noteDocumentText('export-text', 'unavailable', 'Android document selection is unavailable.'),
  ]);
  assert.equal(distinct.size, 4);
});

test('an interrupted operation, an unwritable destination and the PDF limit are kept', () => {
  nativeSaid('Document operation closed.');
  nativeSaid('The selected destination could not be written.');
  nativeSaid('PDF export requires valid PDF bytes of at most 8 MB.');
  assert.equal(noteDocumentText('export-text', 'cancelled', 'Document operation closed.'), 'Document operation closed. Nothing exported.');
  assert.equal(noteDocumentText('import', 'cancelled', 'Document operation closed.'), 'Document operation closed. Nothing imported.');
  assert.equal(noteDocumentText('export-text', 'failed', 'The selected destination could not be written.'), 'The chosen location could not be written. Nothing exported.');
  assert.equal(noteDocumentText('export-pdf', 'failed', 'The selected destination could not be written.'), 'The chosen location could not be written. Nothing exported.');
  assert.equal(noteDocumentText('export-pdf', 'failed', 'PDF export requires valid PDF bytes of at most 8 MB.'), 'Export requires a valid PDF of at most 8 MB.');
});

test('the status decides when the message is not a reviewed native sentence', () => {
  assert.equal(noteDocumentText('export-text', 'unavailable', 'Android document selection is unavailable.'), 'Saving a document is unavailable right now. Nothing exported.');
  assert.equal(noteDocumentText('import', 'unavailable', 'Android document selection is unavailable.'), 'Choosing a document is unavailable right now. Nothing imported.');
  assert.equal(noteDocumentText('export-text', 'cancelled', 'Document selection cancelled. Nothing imported or exported.'), 'Nothing exported.');
  assert.equal(noteDocumentText('export-text', 'too-large', 'Export requires valid UTF-8 text of at most 64 KiB.'), 'Export requires valid UTF-8 text of at most 64 KiB.');
  assert.equal(noteDocumentText('export-text', 'exported', 'Saved.'), 'Saved.');
  assert.equal(noteDocumentText('export-text', 'unverified', 'Save not confirmed. Check the file before trying again.'), 'Save not confirmed. Check the file before trying again.');
  assert.equal(noteDocumentText('import', 'unsupported', 'Notes import is unavailable.'), 'Notes import is unavailable.');
  assert.equal(noteDocumentText('export-text', 'requested'), 'Download requested. Check your browser downloads.');
  // A reviewed sentence under another status is not trusted to mean the same thing.
  assert.equal(noteDocumentText('export-text', 'failed', 'Open and unlock the selected note before saving.'), 'The note could not be exported.');
  // The busy refusal does not apply to an export-only sentence from another operation.
  assert.equal(noteDocumentText('import', 'unavailable', 'Open and unlock the selected note before saving.'), 'Choosing a document is unavailable right now. Nothing imported.');
  assert.equal(noteDocumentText('export-text', 'surprise', 'Something else'), 'The note could not be exported.');
  assert.equal(noteDocumentText('export-pdf', undefined), 'The PDF could not be exported.');
  assert.equal(noteDocumentText('export-text', 'unavailable', 'constructor'), 'Saving a document is unavailable right now. Nothing exported.');
});
