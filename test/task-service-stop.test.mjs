import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {coreStateBuildPlugin} from '../scripts/core-state-patch.mjs';

async function taskClass(patched) {
  const core = patched ? coreStateBuildPlugin(process.cwd(), process.cwd()+'/vendor/eliza') : null;
  const built = await build({stdin: {contents: "export {TaskService} from './vendor/eliza/packages/core/src/services/task.ts';", resolveDir: process.cwd()},
    bundle: true, write: false, format: 'esm', platform: 'node', plugins: core ? [core.plugin] : []});
  return (await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))).TaskService;
}
const classes = Promise.all([taskClass(false), taskClass(true)]);
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
function fixture(TaskService, holdWorker = false) {
  const intervals = new Set(), entered = deferred(), released = deferred();
  const state = {calls: 0, queries: 0};
  const task = {id: '00000000-0000-4000-8000-000000000002', name: 'CONTROLLED_WORKER', tags: ['queue', 'repeat'], metadata: {updatedAt: 0, updateInterval: 1}};
  const worker = {async execute() { state.calls++; entered.resolve(); if (holdWorker) await released.promise; return {preserveTask: true}; }};
  const runtime = {agentId: '00000000-0000-4000-8000-000000000001',
    logger: {debug() {}, info() {}, warn() {}, error() {}}, reportError() {}, getService() { return null; },
    async getTask() { return task; }, async getTasks() { state.queries++; return [task]; }, getTaskWorker() { return worker; }};
  const service = new TaskService(runtime, {now: () => 100000, setInterval(callback) { intervals.add(callback); return callback; }, clearInterval(callback) { intervals.delete(callback); }});
  return {service, runtime, state, task, intervals, entered, released};
}

test('patched stop refuses manual execution and timer resurrection while original source reproduces both', async () => {
  const [Original, Patched] = await classes;
  const old = fixture(Original); await old.service.stop(); await old.service.executeTaskById(old.task.id); old.service.startTimer();
  assert.equal(old.state.calls, 1); assert.equal(old.intervals.size, 1); await old.service.stop();
  const current = fixture(Patched); await current.service.stop();
  await assert.rejects(current.service.executeTaskById(current.task.id), error => error.code === 'TASK_SERVICE_STOPPED');
  current.service.startTimer(); assert.equal(current.state.calls, 0); assert.equal(current.intervals.size, 0);
});

test('stop while the public task read is held fences later worker admission', async () => {
  const [Original, Patched] = await classes;
  for (const [TaskService, expectedCalls] of [[Original, 1], [Patched, 0]]) {
    const f = fixture(TaskService), read = deferred(), entered = deferred();
    f.runtime.getTask = async () => { entered.resolve(); await read.promise; return f.task; };
    const execution = f.service.executeTaskById(f.task.id).then(() => null, error => error);
    await entered.promise; await f.service.stop(); read.resolve(); const error = await execution;
    assert.equal(f.state.calls, expectedCalls);
    if (TaskService === Patched) assert.equal(error?.code, 'TASK_SERVICE_STOPPED'); else assert.equal(error, null);
  }
});

test('stop drains already-admitted work and suppresses a queued due-task read', async () => {
  const [Original, Patched] = await classes;
  for (const [TaskService, expectedQueries] of [[Original, 2], [Patched, 1]]) {
    const f = fixture(TaskService, true); f.service.startTimer();
    const first = f.service.runDueTasks(); await f.entered.promise;
    const queued = f.service.runDueTasks(); let stopped = false;
    const stop = f.service.stop().then(() => { stopped = true; });
    await Promise.resolve(); assert.equal(stopped, false); assert.equal(f.intervals.size, 0);
    f.released.resolve(); await Promise.all([first, queued, stop]);
    assert.equal(stopped, true); assert.equal(f.state.calls, 1); assert.equal(f.state.queries, expectedQueries);
    assert.equal(f.service.executingTasks.size, 0); assert.equal(f.service.executingTaskPromises.size, 0);
  }
});
