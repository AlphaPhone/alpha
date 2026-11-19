/**
 * Replays WorkflowDeviceSteps against the real workflow adapter: its phone-step review
 * (reviewPhone), the two-tap decision (decidePhone) and the step list it renders. The agent's
 * phone review and the connection controller's phone-step ports are controlled stand-ins: they
 * issue one proposal bound to the run's spec digest, refuse it once expired, decided or cancelled,
 * and count every effect and denial that reaches them.
 */
import assert from 'node:assert/strict';
import {recordComparedObservation} from '../observed-replay.mjs';
const {actionCounter, modelScenario, modelWalks} = await import('../services/inbox-workflows-model-traces.mjs');
const {workflowAdapter, wait} = await import('../services/workflow-adapter-fixture.mjs');

const model = 'specs/quint/application/WorkflowDeviceSteps.qnt', main = 'WorkflowDeviceSteps';
export const scenarios = ['approveExecutesOnceTest', 'denySendsNoEffectTest', 'otherDecisionNeedsItsOwnTapTest', 'backgroundCannotDecideTest',
  'changedReviewIsRefusedTest', 'movedAnchorNeedsNewReviewTest', 'cancelledRunIsRefusedTest', 'expiredStepCannotBeDecidedTest', 'expiredStepIsNotOfferedAgainTest'];
const actions = ['review', 'tapApprove', 'tapDeny', 'leave', 'returnTo', 'changeDigest', 'changeAnchor', 'cancelRun', 'expire'];
const anchors = {1: '2027-03-15T03:56:00.000Z', 2: '2027-03-15T04:56:00.000Z'};
const statusText = {'': '', '1 waiting': 'waiting', 'None pending': 'none', 'Done': 'done', 'Denied': 'denied',
  'The workflow run time changed. Review the device actions again.': 'anchor'};
let observedTraces = 0, observedCheckpoints = 0;

async function subject() {
  const agent = {digest: 1, anchor: 1, closed: false, proposal: 'pending', expired: false, effects: 0, denials: 0, refused: 0};
  const issued = [];
  const document = {hidden: false, addEventListener() {}, removeEventListener() {}};
  const workflow = {id: 'flow', name: 'Calendar brief', description: 'Reads Calendar', versionId: 'v1', active: false, removed: false, steps: [{label: 'Read', description: 'Read Calendar'}]};
  const run = () => ({id: 'run', workflowId: 'flow', versionId: 'v1', status: 'waiting-approval', finished: false, startedAt: anchors[1], events: []});
  const phoneReview = () => ({runId: 'run', workflowId: 'flow', versionId: 'v1', specDigest: 'digest-' + agent.digest, calendarAnchorAt: anchors[agent.anchor],
    status: 'waiting-approval', finished: false, cancellationRequestedAt: agent.closed ? '2027-03-15T04:00:00.000Z' : null});
  const client = {lifecycleSupported: async () => true, supportsSubmissionReconciliation: async () => true, list: async () => [workflow], removedWorkflows: async () => [],
    detail: async () => workflow, executions: async () => [run()], receipt: async () => run(), approvals: async () => null,
    phoneReview: async () => phoneReview(), reconcile: async () => null, reconcileLifecycle: async () => null};
  // The agent accepts a decision only for its pending, unexpired proposal on an open run with the reviewed spec digest.
  const admissible = proposal => agent.proposal === 'pending' && !agent.expired && !agent.closed && proposal.workflow.specDigest === 'digest-' + agent.digest;
  const controller = {
    workflowPhoneActions: async review => {
      if (review.cancellationRequestedAt || agent.proposal !== 'pending' || agent.expired) return [];
      const proposal = {id: 'step-' + issued.length, title: 'read calendar', description: 'Read Calendar', expiresAt: Date.now() + 3_600_000,
        workflow: {runId: 'run', workflowId: 'flow', versionId: 'v1', stepId: 'read', specDigest: review.specDigest}};
      issued.push(proposal);
      return [proposal];
    },
    execute: async proposal => {
      if (!admissible(proposal)) { agent.refused++; return {proposalId: proposal.id, status: 'failed', summary: 'Not run'}; }
      agent.proposal = 'approved'; agent.effects++;
      return {proposalId: proposal.id, status: 'succeeded', summary: 'Done'};
    },
    rejectWorkflowPhoneAction: async id => {
      const proposal = issued.find(entry => entry.id === id);
      if (!proposal || !admissible(proposal)) { agent.refused++; throw Error('Phone step is no longer pending'); }
      agent.proposal = 'denied'; agent.denials++;
    },
  };
  // The receipt of this exact run is the foreground context, as phoneContext requires.
  const alphaClient = {getState: () => ({context: {view: 'workflows', sensitive: false, selectedObject: {kind: 'workflow-run', id: 'run', revision: 'v1'}}})};
  const app = await workflowAdapter({client, controller, globals: {document, alphaClient, structuredClone}});
  const settled = () => wait(() => app.render().runOpen && !app.render().r.phoneBusy, 'the phone step operation did not settle');
  app.render().openWorkflow('flow');
  await wait(() => app.render().detail && !app.render().fd.busy, 'the workflow did not open');
  app.render().fd.runs[0].open();
  await settled();
  const tap = async approved => {
    const step = app.render().r.phoneSteps[0];
    assert.ok(step && !step.disabled, 'the model decides a step the phone does not offer');
    approved ? step.approve() : step.deny();
    await settled();
  };
  const apply = async action => {
    if (action === 'review') { app.render().r.phoneReview(); await settled(); }
    else if (action === 'tapApprove') await tap(true);
    else if (action === 'tapDeny') await tap(false);
    else if (action === 'leave') document.hidden = true;
    else if (action === 'returnTo') document.hidden = false;
    else if (action === 'changeDigest') agent.digest = 2;
    else if (action === 'changeAnchor') agent.anchor = 2;
    else if (action === 'cancelRun') agent.closed = true;
    else if (action === 'expire') { agent.expired = true; for (const proposal of issued) proposal.expiresAt = Date.now() - 1; }
    else assert.equal(action, '', `unmapped model action ${action}`);
  };
  const observe = () => {
    const view = app.render().r, step = view.phoneSteps[0];
    assert.ok(view.phoneSteps.length <= 1);
    assert.ok(view.phoneStatus in statusText, `unexpected phone status ${view.phoneStatus}`);
    return {agent: {digest: agent.digest, anchor: agent.anchor, closed: agent.closed, proposal: agent.proposal, expired: agent.expired},
      foreground: !document.hidden, shown: !!step, disabled: step ? step.disabled : null,
      confirm: step ? (step.approveLabel === 'Confirm approve' ? 'approve' : step.denyLabel === 'Confirm deny' ? 'deny' : 'none') : 'none',
      status: statusText[view.phoneStatus], effects: agent.effects, denials: agent.denials, refused: agent.refused};
  };
  return {apply, observe, close: () => app.close()};
}

const project = s => ({agent: {digest: s.digest, anchor: s.anchor, closed: s.closed, proposal: s.proposal, expired: s.expired},
  foreground: s.foreground, shown: s.shown, disabled: s.shown ? s.expired : null, confirm: s.confirm, status: s.status,
  effects: s.effects, denials: s.denials, refused: 0});

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
      assert.deepEqual(actual, expected, `${label} step ${i} ${action || 'stutter'}`);
      recordComparedObservation({trace: label, step: i, action, actual, expected}); observedCheckpoints++;
    }
  } finally { code.close(); }
}

export async function runWorkflowDeviceStepScenarios() {
  const seen = actionCounter();
  for (const scenario of scenarios) await replay(modelScenario(model, scenario, {main}), scenario, seen);
  for (const action of actions) assert.ok(seen.count(action) > 0, action);
}

export async function runWorkflowDeviceStepWalks({traces = 80, steps = 25} = {}) {
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
