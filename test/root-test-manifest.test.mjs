import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rootTestProblems} from '../scripts/run-root-tests.ts';

function tree(retirement, files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'root-tests-'));
  for (const file of ['scripts/.keep', 'apps/app/spec/notes/list.md', 'test/run.test.mjs', 'test/area.test.mjs', ...files]) {
    fs.mkdirSync(path.dirname(path.join(directory, file)), {recursive: true});
    fs.writeFileSync(path.join(directory, file), '');
  }
  fs.writeFileSync(path.join(directory, 'test/root-tests.json'), JSON.stringify({schema: 1, run: ['test/run.test.mjs'], held: []}));
  fs.writeFileSync(path.join(directory, 'scripts/legacy-retirement.json'), JSON.stringify({
    tests: [{legacy: 'test/area.test.mjs', area: 'notes', spec: 'apps/app/spec/notes/list.md', status: 'mapped'}, ...retirement],
    quint: [], lemma: [], scripts: [],
  }));
  return directory;
}

test('the tree passes when every root test is run, held or mapped to an existing area spec', () => {
  const directory = tree([], []);
  try { assert.deepEqual(rootTestProblems(directory), []); } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('an unclassified test, a missing spec, a gone mapped file and a present removed file each fail', () => {
  const directory = tree([
    {legacy: 'test/moved.test.mjs', area: 'notes', spec: 'apps/app/spec/notes/query.md', status: 'mapped'},
    {legacy: 'test/gone.test.mjs', area: 'notes', spec: 'apps/app/spec/notes/list.md', status: 'mapped'},
    {legacy: 'test/kept.test.mjs', area: 'notes', spec: 'apps/app/spec/notes/list.md', status: 'removed', note: 'replaced by scripts/absent.ts'},
  ], ['test/stray.test.mjs', 'test/moved.test.mjs', 'test/kept.test.mjs']);
  try {
    const problems = rootTestProblems(directory).join('\n');
    assert.match(problems, /test\/stray\.test\.mjs is neither run, held, nor mapped/);
    assert.match(problems, /test\/moved\.test\.mjs names the spec apps\/app\/spec\/notes\/query\.md, which does not exist/);
    assert.match(problems, /test\/gone\.test\.mjs is mapped but the file is gone/);
    assert.match(problems, /test\/kept\.test\.mjs is removed but the file is still here/);
    assert.match(problems, /names scripts\/absent\.ts, which does not exist/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
