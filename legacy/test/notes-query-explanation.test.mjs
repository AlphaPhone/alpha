import test from 'node:test';
import assert from 'node:assert/strict';
import {notesQueryExplanation} from '../apps/app/src/ui/notes/notes-query-explanation.ts';
import {queryLocalNotes} from '../.eliza/client-features/plugins/plugin-notes/src/client/notes-query.ts';

// The Share note review sentence. Each case runs the shared query so a change to its basis or
// to the explanation that tells the two uncertain cases apart fails here.
const latest = {kind: 'latest', by: 'updated'};
const note = (id, modifiedAt) => ({id, kind: 'text', title: id, body: id, pinned: false, ...(modifiedAt === undefined ? {} : {modifiedAt, createdAt: modifiedAt})});
const explain = (records, query = latest) => {
  const selection = queryLocalNotes(records, query);
  return {selection, text: notesQueryExplanation(selection.basis, selection.candidates.length, query, selection.explanation)};
};

test('notes tied on the latest recorded time say so and list only the tied notes', () => {
  const {selection, text} = explain([note('a', 500), note('b', 500), note('c', 100)]);
  assert.equal(selection.basis, 'owner-choice-uncertain');
  assert.deepEqual(selection.candidates.map(n => n.id), ['a', 'b']);
  assert.equal(text, 'These notes share the latest recorded time. Choose the note to share.');
  // Every note tied: the candidates are all the notes, and the reason is still the tie.
  assert.equal(explain([note('a', 500), note('b', 500)]).text, 'These notes share the latest recorded time. Choose the note to share.');
});

test('notes with unknown dates say the latest note cannot be verified', () => {
  const {selection, text} = explain([note('a', 500), note('legacy')]);
  assert.equal(selection.basis, 'owner-choice-uncertain');
  assert.equal(selection.candidates.length, 2);
  assert.equal(text, 'Some notes have unknown dates, so the latest note cannot be verified. Choose the note to share.');
  assert.equal(explain([note('a', 500), note('legacy')], {kind: 'latest', by: 'created'}).text, 'Some notes have unknown dates, so the latest note cannot be verified. Choose the note to share.');
});

test('an unrecognised uncertain explanation keeps the combined sentence', () => {
  const combined = 'The latest note cannot be verified: some notes have unknown dates or share the latest time. Choose the note to share.';
  assert.equal(notesQueryExplanation('owner-choice-uncertain', 2, latest), combined);
  assert.equal(notesQueryExplanation('owner-choice-uncertain', 2, latest, 'Something new.'), combined);
  assert.equal(notesQueryExplanation('owner-choice-uncertain', 2, latest, 'constructor'), combined);
});

test('the other bases keep their sentences', () => {
  assert.equal(explain([]).text, 'No saved notes were found.');
  assert.equal(explain([note('a', 1)], {kind: 'title', text: 'zzz'}).text, 'No saved note matches this title.');
  assert.equal(explain([note('alpha', 1), note('alphabet', 2)], {kind: 'title', text: 'alpha'}).text, 'Several notes match. Choose the one to share.');
  assert.equal(explain([note('alpha', 1)], {kind: 'title', text: 'alpha'}).text, 'Review the matching note before sharing it.');
  assert.equal(explain([note('a', 1)]).text, 'This is the only saved note. Review it before sharing.');
  assert.equal(explain([note('a', 1), note('b', 2)]).text, 'Review the latest updated note before sharing.');
  assert.equal(explain([note('a', 1), note('b', 2)], {kind: 'latest', by: 'created'}).text, 'Review the latest created note before sharing.');
});
