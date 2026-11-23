import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fixture, jvmSkip, nativeSource, runJvm} from './fixtures/jvm-tools.mjs';

const skip = jvmSkip('javac');
// Compile the production storageQuery body over closed ports. The Files adapter treats an answer
// without `truncated: false` as incomplete, so a file search that read every match must say so.
function run() {
  const files = readFileSync(nativeSource('AlphaFilesPlugin.java'), 'utf8');
  const start = ' @PluginMethod public void storageQuery(', end = ' private boolean filesReviewVisible(';
  const from = files.indexOf(start), to = files.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'storageQuery is in the native source');
  const query = files.slice(from, to);
  const temp = mkdtempSync(join(tmpdir(), 'alpha-file-query-'));
  try {
    const path = join(temp, 'AlphaFileQueryTest.java');
    writeFileSync(path, readFileSync(fixture('AlphaFileQueryTest.java.txt'), 'utf8').replace('/* production query */', query));
    return runJvm([path], 'AlphaFileQueryTest').trim().split('\n');
  } finally {
    rmSync(temp, {recursive:true, force:true});
  }
}

test('a native file search says whether it read every match; a folder walk leaves it unsaid', {skip}, () => {
  assert.deepEqual(run(), [
    'files found=0: entries=0;truncated=false;',
    'folders found=0: entries=0;truncated=-;',
    'files found=3: entries=3;truncated=false;',
    'folders found=3: entries=3;truncated=-;',
    'files found=499: entries=499;truncated=false;',
    'folders found=499: entries=499;truncated=-;',
    'files found=500: entries=500;truncated=true;',
    'folders found=500: entries=500;truncated=-;',
    'files found=900: entries=500;truncated=true;',
    'folders found=900: entries=500;truncated=-;',
  ]);
});
