#!/usr/bin/env node
// Build the resident's isolated workflow worker from the pinned upstream @elizaos/plugin-workflow, with upstream's
// worker provenance (vendor/eliza spec/workflow/worker.md, "Producer, package and installed tree must each prove
// their own identity"). The package is built first, so its dist/workflow-worker.json pins the worker digest the agent
// bundle records (spec/agent/plugins/bundle.md); the artifact this writes is what agent:stage-android stages under
// assets/agent/workflow-worker, and the runtime payload refuses a worker that differs from that pin.
//   node --conditions=eliza-source --import vibelang/register scripts/build-workflow-worker.ts [--out DIR]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {Effect} from 'effect';
import {sha256File} from './sha256.ts';
import {pinnedCommit} from './upstream-pin.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The upstream workflow plugin package the worker is built from. */
export const WORKFLOW_PACKAGE = path.join(root, 'vendor/eliza/packages/plugin-workflows');
/** The worker artifact directory agent:stage-android reads. */
export const WORKFLOW_WORKER_DIRECTORY = path.join(root, '.eliza/workflow-worker');

/** The source the worker is built from: the pinned upstream record and the installed lockfile. */
export function workerIdentity() {
  pinnedCommit(root);
  return {sourceStampSha256: sha256File(path.join(root, 'upstream.lock.json')), lockSha256: sha256File(path.join(root, 'pnpm-lock.yaml'))};
}

/** The staging input for stageRuntimePayload, after checking the artifact against its own manifest and identity. */
export async function workflowWorkerArtifact(directory = WORKFLOW_WORKER_DIRECTORY) {
  if (!fs.existsSync(path.join(directory, 'manifest.json'))) throw new Error('Build the workflow worker first: pnpm agent:build-workflow-worker');
  const {WORKER_EXECUTABLE, verifyWorkerArtifact} = await import('@elizaos/plugin-workflow/worker');
  await Effect.runPromise(verifyWorkerArtifact(directory, workerIdentity()));
  return {dir: directory, executable: WORKER_EXECUTABLE};
}

export async function buildWorkflowWorker(outputDir = WORKFLOW_WORKER_DIRECTORY) {
  execFileSync('pnpm', ['--dir', path.join(root, 'vendor/eliza'), 'exec', 'turbo', 'run', 'build', '--filter=@elizaos/plugin-workflow'], {stdio: 'inherit'});
  // The worker's source export depends on machines that the SDK build generates.
  const {workerProvenance} = await import('@elizaos/plugin-workflow/worker');
  fs.rmSync(outputDir, {recursive: true, force: true});
  fs.mkdirSync(path.dirname(outputDir), {recursive: true});
  const identity = workerIdentity();
  const provenance = await Effect.runPromise(workerProvenance());
  const worker = await Effect.runPromise(provenance.build({
    packageDir: WORKFLOW_PACKAGE, outputDir, identity,
    observeIdentity: () => Effect.sync(workerIdentity),
  }));
  const {executable} = await workflowWorkerArtifact(outputDir);
  return {outputDir, executable, phase: worker.phase};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {out: {type: 'string'}}});
  const built = await buildWorkflowWorker(values.out ? path.resolve(values.out) : undefined);
  console.log(JSON.stringify({...built, outputDir: path.relative(root, built.outputDir)}, null, 1));
  console.log('Workflow worker built from the pinned source. This is not device execution evidence.');
}
