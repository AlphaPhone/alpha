import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fixture, jvmSkip, nativeSource, runJvm} from './fixtures/jvm-tools.mjs';

const skip = jvmSkip('javac');
const between = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `${start.trim()} is in the native source`);
  return source.slice(from, to);
};
// Compile the production storageSelect and picker details bodies over closed ports (FILE-13).
function run(caseName) {
  const files = readFileSync(nativeSource('AlphaFilesPlugin.java'), 'utf8');
  const daily = readFileSync(nativeSource('DailyAppsPlugin.java'), 'utf8');
  const select = between(files, ' /** Opens a file in this app', ' /** Opens a file in the Android app').replace('@PluginMethod ', '');
  const picked = between(daily, ' /** Size and last change of a picked document', ' private void resolveResult(');
  const temp = mkdtempSync(join(tmpdir(), 'alpha-file-details-'));
  try {
    const path = join(temp, 'AlphaFileDetailsTest.java');
    const source = readFileSync(fixture('AlphaFileDetailsTest.java.txt'), 'utf8');
    writeFileSync(path, source.replace('/* production select */', select).replace('/* production picked */', picked));
    return runJvm([path], 'AlphaFileDetailsTest', {args:[caseName]}).trim().split('\n');
  } finally {
    rmSync(temp, {recursive:true, force:true});
  }
}

test('a file opened from Files reports its size and last change for the preview subtitle', {skip}, () => {
  assert.deepEqual(run('select'), [
    'status=selected;size=12;modified=1600000000000;',
    'status=missing;size=-;modified=-;',
  ]);
});

test('a picked file reports the size and date its provider knows, and nothing it does not', {skip}, () => {
  assert.deepEqual(run('picked'), [
    'status=selected;size=2048;modified=1600000000000;',
    'status=selected;size=-;modified=-;',
    'status=selected;size=2048;modified=-;',
  ]);
});
