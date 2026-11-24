import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readApkSignerDigest } from '@elizaos/os/image';
import { run } from '../scripts/run-os-program.ts';

const first = 'A'.repeat(64);
const second = 'b'.repeat(64);
const legacy = `Signer #1 certificate SHA-256 digest: ${first}`;
const rotated = `Signer (minSdkVersion=24, maxSdkVersion=32) certificate SHA-256 digest: ${first}\nSigner (minSdkVersion=33, maxSdkVersion=2147483647) certificate SHA-256 digest: ${second}`;

function reportedSigner(t, output) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-signer-report-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const apksigner = path.join(directory, 'apksigner');
  fs.writeFileSync(apksigner, `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(output)});\n`, { mode: 0o700 });
  return (apiLevel) => run(readApkSignerDigest(path.join(directory, 'sample.apk'), { apksigner, apiLevel }));
}

test('legacy signer remains supported and normalized', async t => {
  assert.equal(await reportedSigner(t, legacy)(), first.toLowerCase());
});
test('rotated signer is selected for the exact Android API', async t => {
  const read = reportedSigner(t, rotated);
  assert.equal(await read(32), first.toLowerCase());
  assert.equal(await read(34), second);
});
test('rotated output requires an explicit valid API', async t => {
  const read = reportedSigner(t, rotated);
  for (const apiLevel of [undefined, 0, 1.5, '34']) await assert.rejects(() => read(apiLevel));
});
test('missing or overlapping applicable ranges are refused', async t => {
  await assert.rejects(() => reportedSigner(t, rotated)(23));
  await assert.rejects(() => reportedSigner(t, rotated + '\n' + rotated)(34));
});
test('mixed or multiple signer formats are refused', async t => {
  await assert.rejects(() => reportedSigner(t, legacy + '\n' + rotated)(34));
  await assert.rejects(() => reportedSigner(t, legacy + '\nSigner #2 certificate SHA-256 digest: ' + second)());
});
test('unsigned or malformed output cannot pass', async t => {
  await assert.rejects(() => reportedSigner(t, 'no signer')());
});
