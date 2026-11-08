import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';

export const CORE_STATE_MANIFEST = 'patches/eliza/core-state-manifest.json';
export const CORE_STATE_TARGET = 'packages/core/src/services/task.ts';
export const CORE_STATE_INPUTS = ['scripts/core-state-patch.mjs', 'scripts/core-state-preload.mjs', 'scripts/combined-agent-source.mjs', CORE_STATE_MANIFEST, 'patches/eliza/task-service-stop.patch'];
const sha = value => createHash('sha256').update(value).digest('hex');
const hex = /^[a-f0-9]{64}$/;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
function readRegular(root, name) {
  const file = path.resolve(root, name);
  if (!file.startsWith(path.resolve(root) + path.sep)) throw Error('Core patch input escaped its root');
  for (let current = file; current !== path.resolve(root); current = path.dirname(current)) {
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('Linked core patch input');
  }
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw Error('Invalid core patch input');
  return fs.readFileSync(file);
}

/** The same receipt is used by source preload, bundling and packaged verification. */
export function coreStateReceipt(root) {
  const manifestBytes = readRegular(root, CORE_STATE_MANIFEST);
  const manifest = JSON.parse(manifestBytes);
  const pin = JSON.parse(readRegular(root, 'upstream.lock.json')).commit;
  if (!exact(manifest, ['schema', 'baseCommit', 'patches']) || manifest.schema !== 1 || manifest.baseCommit !== pin ||
      !/^[a-f0-9]{40}$/.test(pin) || !Array.isArray(manifest.patches) || manifest.patches.length !== 1) throw Error('Core patch pin/schema mismatch');
  const patch = manifest.patches[0];
  if (!exact(patch, ['file', 'sha256', 'targets']) || patch.file !== 'task-service-stop.patch' || !hex.test(patch.sha256) ||
      !Array.isArray(patch.targets) || patch.targets.length !== 1) throw Error('Invalid core patch record');
  const target = patch.targets[0];
  if (!exact(target, ['path', 'beforeSha256', 'afterSha256']) || target.path !== CORE_STATE_TARGET ||
      !hex.test(target.beforeSha256) || !hex.test(target.afterSha256)) throw Error('Core patch target is not allowed');
  const bytes = readRegular(root, 'patches/eliza/' + patch.file);
  if (sha(bytes) !== patch.sha256) throw Error('Core patch digest mismatch');
  const headers = bytes.toString('utf8').split('\n').filter(line => line.startsWith('--- ') || line.startsWith('+++ '));
  if (JSON.stringify(headers) !== JSON.stringify(['--- a/' + target.path, '+++ b/' + target.path])) throw Error('Core patch headers mismatch');
  return {version: 1, baseCommit: pin, manifestSha256: sha(manifestBytes),
    inputHashes: Object.fromEntries(CORE_STATE_INPUTS.map(name => [name, sha(readRegular(root, name))])),
    patches: [{file: patch.file, sha256: patch.sha256}],
    files: {[target.path]: {beforeSha256: target.beforeSha256, afterSha256: target.afterSha256}}};
}

/** Materialize only the allowlisted file in scratch space. Never change source checkouts. */
export function coreStatePatch(root, source = path.join(root, 'vendor/eliza')) {
  root = path.resolve(root); source = path.resolve(source);
  const receipt = coreStateReceipt(root);
  const expected = receipt.files[CORE_STATE_TARGET];
  const patchBytes = readRegular(root, 'patches/eliza/task-service-stop.patch');
  if (sha(patchBytes) !== receipt.patches[0].sha256) throw Error('Core patch changed before application');
  const original = readRegular(source, CORE_STATE_TARGET);
  if (sha(original) !== expected.beforeSha256) throw Error('Core patch preimage mismatch');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-core-patch-'));
  try {
    const file = path.join(temporary, CORE_STATE_TARGET);
    fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, original, {mode: 0o644});
    execFileSync('patch', ['--batch', '--fuzz=0', '--forward', '-p1'], {cwd: temporary, input: patchBytes, stdio: 'pipe', timeout: 30000});
    const output = readRegular(temporary, CORE_STATE_TARGET);
    const inventory = fs.readdirSync(temporary, {recursive: true, withFileTypes: true})
      .filter(entry => !entry.isDirectory()).map(entry => path.relative(temporary, path.join(entry.parentPath, entry.name)));
    if (inventory.length !== 1 || inventory[0] !== CORE_STATE_TARGET) throw Error('Core patch created unexpected files');
    if (sha(output) !== expected.afterSha256) throw Error('Core patch postimage mismatch');
    const files = new Map([[CORE_STATE_TARGET, {bytes: output, ...expected}]]);
    return {files, receipt};
  } finally { fs.rmSync(temporary, {recursive: true, force: true}); }
}

export function coreStateBuildPlugin(root, source) {
  const prepared = coreStatePatch(root, source);
  const transforms = [];
  const filename = path.resolve(source, CORE_STATE_TARGET);
  const plugin = {name: 'authenticated-core-state', setup(build) {
    build.onLoad({filter: /[\\/]packages[\\/]core[\\/]src[\\/]services[\\/]task\.ts$/}, args => {
      if (path.resolve(args.path) !== filename) throw Error('Unexpected core patch module path');
      const entry = prepared.files.get(CORE_STATE_TARGET);
      if (sha(readRegular(source, CORE_STATE_TARGET)) !== entry.beforeSha256) throw Error('Core patch input changed before compilation');
      if (!transforms.some(value => value.path === CORE_STATE_TARGET)) transforms.push({path: CORE_STATE_TARGET, sourceSha256: entry.beforeSha256, outputSha256: entry.afterSha256});
      return {contents: entry.bytes.toString('utf8'), loader: 'ts', resolveDir: path.dirname(filename)};
    });
  }};
  return {...prepared, transforms, plugin};
}

export function verifyCoreStateTransforms(receipt, transforms, required = false) {
  if (!Array.isArray(transforms) || transforms.length > 1 || (required && transforms.length !== 1)) throw Error('Missing or invalid core patch transformation');
  for (const transform of transforms) {
    const expected = receipt.files[transform.path];
    if (!exact(transform, ['path', 'sourceSha256', 'outputSha256']) || !expected || transform.sourceSha256 !== expected.beforeSha256 || transform.outputSha256 !== expected.afterSha256) throw Error('Core patch transformation mismatch');
  }
}

export function coreStateBuildRecord(root, transforms, required = false) {
  const receipt = coreStateReceipt(root);
  verifyCoreStateTransforms(receipt, transforms, required);
  return {...receipt, transforms};
}

export function verifyCoreStateBuildRecord(root, record, required = false) {
  if (!isDeepStrictEqual(record, coreStateBuildRecord(root, record?.transforms, required))) throw Error('Core patch build receipt changed');
}

/** The preload authenticates the selected checkout before any core module is evaluated. */
export function coreRuntimeArguments(root, source, args) {
  if (!Array.isArray(args) || !args.every(value => typeof value === 'string')) throw Error('Invalid core runtime arguments');
  if (!path.isAbsolute(source)) throw Error('Core runtime source must be absolute');
  coreStateReceipt(root);
  return ['--preload', path.join(root, 'scripts/core-state-preload.mjs'), ...args];
}

/** Independently reviewed frozen snapshots retain their own version contract. */
export function combinedCoreRuntime(root, source, manifest, snapshot, args) {
  const receipt = coreStateReceipt(root);
  const target = receipt.files[CORE_STATE_TARGET];
  const matches = snapshot.revision === receipt.baseCommit &&
    snapshot.entries?.[CORE_STATE_TARGET]?.sha256 === target.beforeSha256;
  if (!matches) return {args, environment: {}, status: {applied: false,
    reason: 'independent-snapshot-requires-separate-patch-review', sourceRevision: snapshot.revision}};
  return {args: coreRuntimeArguments(root, source, args),
    environment: {ALPHA_CORE_STATE_SOURCE: source, ALPHA_CORE_STATE_FROZEN_MANIFEST: manifest},
    status: {applied: true, sourceRevision: snapshot.revision, manifestSha256: receipt.manifestSha256}};
}
