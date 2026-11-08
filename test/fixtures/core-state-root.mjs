import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CORE_STATE_INPUTS, CORE_STATE_TARGET, CORE_STATE_MANIFEST} from '../../scripts/core-state-patch.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const repository = path.resolve(import.meta.dirname, '../..');

/** A private source tree and reviewed manifest, with the same production verifier. */
export function writeCoreStateFixture(root, source, pin, simple = false) {
  const write = (name, bytes) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes);
  };
  for (const name of [...CORE_STATE_INPUTS.filter(name => name.startsWith('scripts/')),
    'scripts/local-agent-source.mjs', 'scripts/copy-file-clone.mjs',
    'vendor/eliza/packages/app/scripts/lib/immutable-workspace-source.mjs',
    'vendor/eliza/packages/app/scripts/lib/committed-source.mjs']) {
    write(name, fs.readFileSync(path.join(repository, name)));
  }
  const before = simple ? 'export const value = "before";\n' : fs.readFileSync(path.join(repository, 'vendor/eliza', CORE_STATE_TARGET));
  const after = simple ? 'export const value = "after";\n' : null;
  const patch = simple ? `--- a/${CORE_STATE_TARGET}\n+++ b/${CORE_STATE_TARGET}\n@@ -1 +1 @@\n-export const value = "before";\n+export const value = "after";\n` : fs.readFileSync(path.join(repository, 'patches/eliza/task-service-stop.patch'));
  fs.mkdirSync(path.dirname(path.join(source, CORE_STATE_TARGET)), {recursive: true});
  fs.writeFileSync(path.join(source, CORE_STATE_TARGET), before);
  write('patches/eliza/task-service-stop.patch', patch);
  const original = JSON.parse(fs.readFileSync(path.join(repository, CORE_STATE_MANIFEST)));
  write(CORE_STATE_MANIFEST, JSON.stringify({schema: 1, baseCommit: pin, patches: [{file: 'task-service-stop.patch', sha256: hash(patch), targets: [{path: CORE_STATE_TARGET, beforeSha256: hash(before), afterSha256: after ? hash(after) : original.patches[0].targets[0].afterSha256}]}]}, null, 2));
}
