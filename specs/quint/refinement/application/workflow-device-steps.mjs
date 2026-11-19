/**
 * Replays WorkflowDeviceSteps against the real workflow adapter (reviewPhone, the two-tap
 * decidePhone, syncPhone and the step list it renders) over the real DeviceActionCoordinator with
 * Alpha's device-action profile (pendingForWorkflow, approve, reject, syncReceipts and its journal
 * protocol). The agent's proposal endpoints, the journal store and the executor port are controlled
 * stand-ins. The executor applies the real workflowStepScreenCurrent guard agent-adapter's workflow
 * executors use. The second tap's four awaited points (the phone review read, the agent's
 * decision, the executor and the receipt upload) are held open as gates, so the model's agent and
 * phone events interleave inside the decision; an aborted gate is refused before it reaches the agent.
 */
import assert from 'node:assert/strict';
import {recordComparedObservation} from '../observed-replay.mjs';
import {sourceModule} from './support.mjs';
const {actionCounter, modelScenario, modelWalks} = await import('../services/inbox-workflows-model-traces.mjs');
const {workflowAdapter, session, wait} = await import('../services/workflow-adapter-fixture.mjs');
const {DeviceActions} = await sourceModule('apps/app/src/runtime/device-actions.ts');
const {workflowStepScreenCurrent} = await sourceModule('apps/app/src/runtime/workflow-device-contract.ts');

const model = 'specs/quint/application/WorkflowDeviceSteps.qnt', main = 'WorkflowDeviceSteps';
export const scenarios = ['approveExecutesOnceTest', 'denySendsNoEffectTest', 'otherDecisionNeedsItsOwnTapTest', 'backgroundCannotDecideTest',
  'changedReviewIsRefusedTest', 'movedAnchorNeedsNewReviewTest', 'cancelledRunIsRefusedTest', 'expiredStepCannotBeDecidedTest', 'expiredStepIsNotOfferedAgainTest',
  'expiryDuringReadIsRefusedByCoordinatorTest', 'digestChangeAfterReadIsRefusedByAgentTest', 'cancelAfterReadIsRefusedByAgentTest',
  'leavingBeforeTheExecutorLeavesTheOutcomeUnknownTest', 'suspendAbortsTheDecisionTest', 'suspendWhileRunningIsSyncedLaterTest',
  'lostReceiptIsSyncedOnceTest', 'receiptOfAnOlderDigestIsNotSyncedTest', 'anchorMoveAfterReadDoesNotStopAnAdmittedStepTest',
  'quietAgentChangesNothingTest'];
const actions = ['review', 'tapApprove', 'tapDeny', 'readReview', 'admit', 'execute', 'receiptSent', 'receiptLost', 'sync',
  'leave', 'suspend', 'returnTo', 'reopen', 'changeDigest', 'changeAnchor', 'cancelRun', 'expire', 'quietAgent'];
const anchors = {1: '2027-03-15T03:56:00.000Z', 2: '2027-03-15T04:56:00.000Z'};
const specDigests = {1: 'a'.repeat(64), 2: 'b'.repeat(64)};
const device = {installationId: 'installation', enrollmentId: 'enrollment'};
const phoneStep = {id: 'notify', kind: 'Notify', operation: 'app_notification', title: 'Calendar brief'};
const posted = 'Posted the reviewed notification in the browser Inbox.';
const unknownSummary = 'The outcome needs review and won\'t be repeated automatically.';
const statusText = {'': '', '1 waiting': 'waiting', 'None pending': 'none', 'Denied': 'denied', 'Receipts sent': 'synced',
  'The workflow run time changed. Review the device actions again.': 'anchor', [posted]: 'done', [unknownSummary]: 'unknown',
  'Not started, so nothing was sent.': 'notStarted', 'Posted the reviewed notification in the browser Inbox, but it isn\'t synced yet.': 'unsynced',
  'The outcome needs review and won\'t be repeated automatically, but it isn\'t synced yet.': 'unsyncedUnknown'};
const wireState = {pending: 'pending', approved: 'pending', executing: 'executing', done: 'done', rejected: 'denied'};
let observedTraces = 0, observedCheckpoints = 0;

/** One awaited point the model holds open; it rejects as a cancelled request does when its signal aborts. */
function gates() {
  const open = new Map();
  return {
    hold(name, signal) {
      if (signal?.aborted) return Promise.reject(signal.reason);
      assert.ok(!open.has(name), `two ${name} requests in flight`);
      return new Promise((resolve, reject) => {
        const abort = () => { open.delete(name); reject(signal.reason); };
        signal?.addEventListener('abort', abort, {once: true});
        open.set(name, () => { signal?.removeEventListener('abort', abort); open.delete(name); resolve(); });
      });
    },
    release(name) { const release = open.get(name); assert.ok(release, `the model resolves ${name}, but the source is not waiting there`); release(); },
    pending: () => [...open.keys()],
  };
}

async function subject() {
  const realNow = Date.now;
  let clock = Date.parse('2027-03-15T03:00:00.000Z');
  Date.now = () => clock;
  const gate = gates();
  const agent = {digest: 1, anchor: 1, closed: false, issued: 1, state: 'pending', proposalDigest: 1, receipt: 'none',
    expires: {1: clock + 3_600_000}, effects: 0, denials: 0, admitted: null};
  const current = () => 'step-' + agent.issued;
  const expired = () => Object.values(agent.expires).every(at => at <= clock);
  const wire = () => ({id: current(), digest: 'c'.repeat(64), state: agent.state, subjectUserId: session.ownerId, requestedBy: session.agentId,
    action: 'device_action', expiresAt: new Date(agent.expires[agent.issued]).toISOString(),
    payload: {version: 1, action: 'device_action', ...device, operation: {type: 'post_notification', title: 'Calendar brief', body: 'Your day is ready.'},
      workflow: {workflowId: 'flow', versionId: 'v1', runId: 'run', stepId: 'notify', specDigest: specDigests[agent.proposalDigest]}},
    ...(agent.state === 'executing' || agent.state === 'done' ? {execution: {attemptId: 'attempt-' + agent.issued}} : {})});
  // The agent decides only its current, pending, unexpired proposal of an open run.
  const admissible = id => id === current() && agent.state === 'pending' && clock < agent.expires[agent.issued] && !agent.closed;
  // `lost`: the held receipt upload fails in the network before it reaches the agent.
  let syncing = false, lost = false;
  const request = async (path, body, signal) => {
    if (signal?.aborted) throw signal.reason;
    if (body === undefined) { assert.equal(path, '/api/client-devices/proposals'); return {proposals: [wire()]}; }
    const [, id, suffix] = path.match(/^\/api\/client-devices\/proposals\/([^/]+)\/(\w+)$/);
    if (suffix === 'decision' && body.decision === 'approve') {
      await gate.hold('admit', signal);
      if (!admissible(id)) throw Error('This proposal is no longer pending');
      agent.state = 'approved';
    } else if (suffix === 'decision') {
      if (!admissible(id)) throw Error('This proposal is no longer pending');
      agent.state = 'rejected'; agent.denials++;
    } else if (suffix === 'claim') {
      assert.equal(agent.state, 'approved'); agent.state = 'executing'; agent.admitted = id;
    } else if (suffix === 'receipt') {
      if (!syncing) await gate.hold('receipt', signal);
      if (lost) { lost = false; throw Error('The receipt upload failed'); }
      if (id !== current() || agent.state !== 'executing' || body.attemptId !== 'attempt-' + agent.issued) throw Error('No receipt is awaited');
      agent.state = 'done'; agent.receipt = body.receipt.outcome;
    } else assert.fail(`unexpected agent request ${path}`);
    return {proposal: wire(), digest: 'c'.repeat(64)};
  };
  const entries = new Map();
  const journal = {
    reserve: async input => entries.has(input.proposalId) ? {created: false, entry: entries.get(input.proposalId)} : (entries.set(input.proposalId, {...input, phase: 'reserved'}), {created: true, entry: entries.get(input.proposalId)}),
    markApplying: async input => Object.assign(entries.get(input.proposalId), {phase: 'applying', attemptId: input.attemptId}),
    finish: async input => Object.assign(entries.get(input.proposalId), input, {phase: 'terminal'}),
    get: async input => ({entry: entries.get(input.proposalId) ?? null}),
    list: async () => ({entries: [...entries.values()]}),
  };
  const document = {hidden: false, listeners: [], addEventListener(type, listener) { if (type === 'visibilitychange') this.listeners.push(listener); },
    removeEventListener(type, listener) { this.listeners = this.listeners.filter(entry => entry !== listener); }};
  const context = {view: 'workflows', sensitive: false, selectedObject: {kind: 'workflow-run', id: 'run', revision: 'v1'}};
  const alphaClient = {getState: () => ({context})};
  // The executor port: agent-adapter's workflow presentation executor reduced to its screen guard and one recorded effect.
  const execute = async (operation, operationId, approved, signal) => {
    assert.equal(operation.type, 'post_notification');
    await gate.hold('execute', signal);
    signal.throwIfAborted();
    if (!workflowStepScreenCurrent({live: true, hidden: document.hidden, current: alphaClient.getState().context, approved, read: false}))
      throw Error('Workflow review context changed');
    agent.effects++;
    return {status: 'succeeded', summary: posted};
  };
  const coordinator = new DeviceActions(session, {...device, key: 'k'.repeat(64)}, 'd'.repeat(64), request, journal, execute);
  // connection-ui's phone-step ports, which forward to the coordinator.
  let calls = 0;
  const port = run => async (...args) => { calls++; try { return await run(...args); } finally { calls--; } };
  // No device target is reported, so the background approval-notice poster stays idle; notices are a separate obligation.
  const controller = {
    workflowPhoneActions: port(async (review, viewContext, signal) => {
      if (document.hidden || viewContext.sensitive) throw Error('Open this workflow on the selected phone agent');
      return coordinator.pendingForWorkflow(review, viewContext, signal);
    }),
    execute: port((proposal, viewContext, signal) => coordinator.approve(proposal.id, viewContext, signal)),
    rejectWorkflowPhoneAction: port(async (id, review, viewContext, signal) => {
      if (document.hidden || viewContext.sensitive) throw Error('Open this workflow to deny its phone step');
      const proposals = await coordinator.pendingForWorkflow(review, viewContext, signal);
      if (!proposals.some(proposal => proposal.id === id)) throw Error('Phone step is no longer pending');
      signal.throwIfAborted();
      await coordinator.reject(id, signal);
    }),
    syncWorkflowPhoneReceipts: port(async (review, signal) => {
      if (document.hidden) throw Error('Open this workflow to finish updating its history');
      syncing = true;
      try { await coordinator.syncReceipts(signal, {runId: review.runId, versionId: review.versionId, specDigest: review.specDigest}); } finally { syncing = false; }
    }),
  };
  const workflow = {id: 'flow', name: 'Calendar brief', description: 'Posts the day', versionId: 'v1', active: false, removed: false, steps: [{label: 'Notify', description: 'Post a notification'}], phoneSpec: {device, steps: [phoneStep]}};
  const run = () => ({id: 'run', workflowId: 'flow', versionId: 'v1', status: 'waiting-approval', finished: false, startedAt: anchors[1], events: []});
  let readArmed = false;
  const phoneReview = async (_run, signal) => {
    if (readArmed) { readArmed = false; await gate.hold('read', signal); }
    return {runId: 'run', workflowId: 'flow', versionId: 'v1', specDigest: specDigests[agent.digest], calendarAnchorAt: anchors[agent.anchor],
      spec: {device, steps: [phoneStep]},
      status: 'waiting-approval', finished: false, cancellationRequestedAt: agent.closed ? '2027-03-15T04:00:00.000Z' : null};
  };
  const client = {lifecycleSupported: async () => true, supportsSubmissionReconciliation: async () => true, list: async () => [workflow], removedWorkflows: async () => [],
    detail: async () => workflow, executions: async () => [run()], receipt: async () => run(), approvals: async () => null,
    phoneReview, reconcile: async () => null, reconcileLifecycle: async () => null};
  let app;
  try { app = await workflowAdapter({client, controller, globals: {document, alphaClient, structuredClone}}); } catch (error) { Date.now = realNow; throw error; }
  // Settled: the source waits at a gate the model holds, or nothing is in flight.
  const settled = () => wait(() => gate.pending().length > 0 || (calls === 0 && !app.render().r?.phoneBusy), 'the phone step operation did not settle');
  const openRun = async () => {
    app.render().openWorkflow('flow');
    await wait(() => app.render().detail && !app.render().fd.busy, 'the workflow did not open');
    app.render().fd.runs[0].open();
    await wait(() => app.render().r && !app.render().r.phoneBusy, 'the run did not open');
  };
  try { await openRun(); } catch (error) { app.close(); Date.now = realNow; throw error; }
  const visibility = () => { for (const listener of [...document.listeners]) listener(); };
  const tap = async approved => {
    const step = app.render().r.phoneSteps[0];
    assert.ok(step && !step.disabled, 'the model decides a step the phone does not offer');
    readArmed = true;
    approved ? step.approve() : step.deny();
    await settled();
    readArmed = false;
  };
  const apply = async action => {
    if (action === 'review') { app.render().r.phoneReview(); await settled(); }
    else if (action === 'tapApprove') await tap(true);
    else if (action === 'tapDeny') await tap(false);
    else if (action === 'readReview') { gate.release('read'); await settled(); }
    else if (action === 'admit') { gate.release('admit'); await settled(); }
    else if (action === 'execute') { gate.release('execute'); await settled(); }
    else if (action === 'receiptSent') { gate.release('receipt'); await settled(); }
    else if (action === 'receiptLost') { lost = true; gate.release('receipt'); await settled(); }
    else if (action === 'sync') { assert.ok(app.render().r.phoneSyncAvailable); app.render().r.phoneSync(); await settled(); }
    else if (action === 'leave') document.hidden = true;
    else if (action === 'suspend') { visibility(); await settled(); }
    else if (action === 'returnTo') { document.hidden = false; visibility(); await settled(); }
    else if (action === 'reopen') await openRun();
    else if (action === 'changeDigest') {
      agent.digest = 2;
      if (agent.state === 'pending') { agent.issued++; agent.proposalDigest = 2; agent.expires[agent.issued] = clock + 3_600_000; }
    }
    else if (action === 'changeAnchor') agent.anchor = 2;
    else if (action === 'cancelRun') agent.closed = true;
    else if (action === 'expire') clock = Math.max(...Object.values(agent.expires)) + 1;
    else if (action === 'quietAgent') { /* An exploration ghost: nothing in the source changes. */ }
    else assert.equal(action, '', `unmapped model action ${action}`);
  };
  const inflight = () => { const pending = gate.pending(); assert.ok(pending.length <= 1, pending.join()); return pending[0] ?? 'none'; };
  const journalOutcome = () => {
    const entry = agent.admitted && entries.get(agent.admitted);
    return entry?.phase !== 'terminal' ? 'none' : entry.status === 'succeeded' ? 'applied' : entry.status === 'unknown' ? 'unknown' : 'notStarted';
  };
  const observe = () => {
    const view = app.render().r, step = view?.phoneSteps[0];
    assert.ok(!view || view.phoneSteps.length <= 1);
    assert.ok(!view || view.phoneStatus in statusText, `unexpected phone status ${view?.phoneStatus}`);
    return {agent: {digest: agent.digest, anchor: agent.anchor, closed: agent.closed, expired: expired(), issued: agent.issued,
      proposal: wireState[agent.state], proposalDigest: agent.proposalDigest, receipt: agent.receipt === 'applied' ? 'applied' : agent.receipt === 'unknown' ? 'unknown' : agent.receipt === 'none' ? 'none' : 'notStarted'},
    foreground: !document.hidden, open: !!view, shown: !!step, shownIssue: step ? issueOf(step) : 0,
    disabled: step ? step.disabled : null,
    confirm: step ? (step.approveLabel === 'Confirm approve' ? 'approve' : step.denyLabel === 'Confirm deny' ? 'deny' : 'none') : 'none',
    status: view ? statusText[view.phoneStatus] : '', inflight: inflight(), journal: journalOutcome(), effects: agent.effects, denials: agent.denials};
  };
  // Each proposal is bound to its own spec digest, which the card's identity lines name.
  const issueOf = step => { const issue = Object.keys(specDigests).find(key => step.identity.includes('Spec: ' + specDigests[key])); assert.ok(issue, step.identity); return Number(issue); };
  return {apply, observe, close: () => { app.close(); Date.now = realNow; }};
}

const project = s => ({agent: {digest: s.digest, anchor: s.anchor, closed: s.closed, expired: s.expired, issued: s.issued, proposal: s.proposal,
  proposalDigest: s.proposalDigest, receipt: s.receipt},
foreground: s.foreground, open: s.open, shown: s.shown, shownIssue: s.shownIssue, disabled: s.shown ? s.expired || s.inflight !== 'none' : null,
confirm: s.confirm, status: s.status, inflight: s.inflight, journal: s.journal, effects: s.effects, denials: s.denials});

async function replay(walk, label, seen) {
  const code = await subject();
  try {
    const first = code.observe(), expectedFirst = project(walk[0].state);
    assert.deepEqual(first, expectedFirst, `${label} initial state`);
    recordComparedObservation({trace: label, step: 0, actual: first, expected: expectedFirst}); observedTraces++; observedCheckpoints++;
    for (let i = 1; i < walk.length; i++) {
      const {action, state, rejected} = walk[i];
      if (rejected) {
        // A refused tap: the phone must not offer it, either because nothing is shown or because the step is disabled.
        const actual = code.observe();
        assert.ok(!actual.shown || actual.disabled, `${label}: the phone offers a decision the model refuses`);
        const expected = project(state);
        assert.deepEqual(actual, expected, `${label} step ${i} refused ${action}`);
        recordComparedObservation({trace: label, step: i, action: null, actual, expected}); observedCheckpoints++;
        continue;
      }
      seen.note(action);
      await code.apply(action);
      const actual = code.observe(), expected = project(state);
      assert.deepEqual(actual, expected, `${label} step ${i} ${action || 'stutter'} after ${walk.slice(1, i).map(entry => entry.action).join(' ')}`);
      recordComparedObservation({trace: label, step: i, action, actual, expected}); observedCheckpoints++;
    }
  } finally { code.close(); }
}

export async function runWorkflowDeviceStepScenarios() {
  const seen = actionCounter();
  for (const scenario of scenarios) await replay(modelScenario(model, scenario, {main}), scenario, seen);
  for (const action of actions) assert.ok(seen.count(action) > 0, action);
}

export async function runWorkflowDeviceStepWalks({traces = 300, steps = 30} = {}) {
  const seen = actionCounter(), walks = modelWalks(model, {main, traces, steps});
  assert.equal(walks.length, traces);
  for (const [index, walk] of walks.entries()) await replay(walk.map(entry => ({...entry, rejected: false})), `walk ${index}`, seen);
  for (const action of actions) assert.ok(seen.count(action) > 0, `${action} ${JSON.stringify(seen.all())}`);
}

export async function runWorkflowDeviceStepsReplay() {
  const beforeTraces = observedTraces, beforeCheckpoints = observedCheckpoints;
  await runWorkflowDeviceStepScenarios(); await runWorkflowDeviceStepWalks();
  return {traces: observedTraces - beforeTraces, checkpoints: observedCheckpoints - beforeCheckpoints};
}
