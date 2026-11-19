import test from 'node:test';
import assert from 'node:assert/strict';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import {modelNames, modelTraces} from '../specs/quint/refinement/services/maps-model-traces.mjs';
import {replayMapsScreenModes} from '../specs/quint/refinement/services/maps-screen-modes.mjs';

test('the mounted Maps screen follows every MapsScreenModes model trace step by step', {timeout: scaledTimeout(600000)}, async () => {
  const {scenarios, witnesses} = modelNames('specs/quint/services/MapsScreenModes.qnt');
  assert.equal(scenarios.length, 34);
  assert.equal(witnesses.length, 9);
  const result = await replayMapsScreenModes({scenarios, witnesses});
  console.log(JSON.stringify(result));
  assert.equal(result.traces, scenarios.length + witnesses.length + 150);
  assert.ok(result.checkpoints > result.traces * 5);
  for (const action of ['focusSearch', 'typeQuery', 'clearQuery', 'submitSearch', 'debounceInput', 'lateInputTimer', 'pickResult', 'pickSaved', 'closePlace', 'openDirections', 'openGrantedDirections',
    'locate', 'fixArrives', 'editOrigin', 'searchOrigin', 'chooseOrigin', 'submitLocatedOrigin', 'swapEnds', 'routePlanned', 'start', 'screenOffStarted', 'screenOffRefused',
    'screenOffLost', 'end', 'back', 'leave', 'hide', 'show', 'agentShowPlace', 'agentShowDirections', 'agentPlanFrom', 'crossAppQuery',
    'offerHandoff', 'consumeHandoff', 'providerResponse', 'providerChanged']) assert.ok(result.actions[action] > 0, action);
});

test('random MapsScreenModes walks sample every provider outcome, provider changes and located-origin Enter', {timeout: scaledTimeout(120000)}, () => {
  // The same seed and bounds as the replayed random traces, without the scenarios that call these actions by hand.
  const traces = modelTraces({path: 'specs/quint/services/MapsScreenModes.qnt', module: 'MapsScreenModes', random: 150, steps: 60});
  const steps = traces.flatMap(trace => trace.steps);
  for (const outcome of ['ready', 'empty', 'error', 'pending'])
    assert.ok(steps.some(step => step.action === 'providerResponse' && step.args[0] === outcome), outcome);
  for (const action of ['providerChanged', 'submitLocatedOrigin']) assert.ok(steps.some(step => step.action === action), action);
  assert.ok(steps.some(step => step.state.originFailed), 'a sampled origin request fails');
  assert.ok(steps.some(step => step.state.queryFailed), 'a sampled destination search fails');
});
