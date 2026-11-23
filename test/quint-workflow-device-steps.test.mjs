import test from 'node:test';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
const {runWorkflowDeviceStepScenarios, runWorkflowDeviceStepWalks} = await import('../specs/quint/refinement/application/workflow-device-steps.mjs');

test('the real workflow adapter follows every step of the workflow device-step scenarios', {timeout: scaledTimeout(120000)}, async () => runWorkflowDeviceStepScenarios());
test('the real workflow adapter follows random workflow device-step walks step by step', {timeout: scaledTimeout(240000)}, async () => runWorkflowDeviceStepWalks());
