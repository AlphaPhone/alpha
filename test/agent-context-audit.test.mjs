import test from 'node:test';
import assert from 'node:assert/strict';
import {audit, bucketsOf, estimateTokens, renderReport, stageOf, wireText} from '../scripts/agent-context-audit.ts';

const system = 'You are Alpha.\n\n';
const stage1 = (at, history, message, extra = {}) => ({
  id: `call-${at}`, type: 'RESPONSE_HANDLER', at, room: 'room', runId: `turn-${at}`, ms: 900, system,
  prompt: JSON.stringify({messages: [{role: 'user', content: `# Task\nDecide.\n\nruntime:historical_effects:\n${history}\n\n# Conversation\n[message_at=2026-11-18T08:00:00.000Z] user: hi\n\n# Current message\n${message}`}]}),
  ...extra,
});

test('identifiers and JSON punctuation cost more tokens per character than prose', () => {
  const prose = 'Please remind me to call the dentist tomorrow morning at nine. '.repeat(20);
  const receipt = '["history:95bfdea6-4445-04d9-b8b7-3dabacc87869",[["NOTES_CREATE",true,[0,["b00a87bb-ef95-0907-af08-bfee302d1699"]]]]]'.repeat(11);
  assert.ok(Math.abs(prose.length - receipt.length) < 60);
  assert.ok(estimateTokens(receipt) > 2 * estimateTokens(prose));
  assert.ok(prose.length / estimateTokens(prose) > 4);
});

test('a call is attributed to its stage and its characters to what they carry', () => {
  const planner = {type: 'ACTION_PLANNER', system: `${system}planner_stage:\ntask: Plan next native tool calls.`};
  assert.equal(stageOf(planner), 'planner');
  assert.equal(stageOf({type: 'RESPONSE_HANDLER', system: `${system}evaluator_stage:\ntask: Evaluate latest action.`}), 'evaluator');
  const call = stage1(0, '["receipt"]', 'text mom', {tools: [{name: 'HANDLE_RESPONSE', chars: 14000}]});
  assert.equal(stageOf(call), 'stage1');
  const buckets = bucketsOf(call);
  assert.equal(buckets['tool schemas'], 14000);
  assert.ok(buckets['history: effect receipts'] > 0 && buckets['history: messages'] > 0 && buckets['section: Current message'] > 0);
  assert.equal(buckets['system prompt'], system.length);
  assert.ok(wireText(call).includes('text mom'));
});

test('the shareable prefix stops at the first byte that differs from an earlier call of the stage', () => {
  const stable = audit([stage1(0, '["a"]', 'one'), stage1(20_000, '["a"]', 'two')]);
  const rewritten = audit([stage1(0, '["__ELIZA_SECRET_aaaa_1__"]', 'one'), stage1(20_000, '["__ELIZA_SECRET_bbbb_1__"]', 'two')]);
  assert.ok(stable.stages.stage1.shareablePrefix > 0.45);
  assert.ok(rewritten.stages.stage1.shareablePrefix < stable.stages.stage1.shareablePrefix / 1.5);
  assert.match(rewritten.prefixBreaks[0].where, /^stage1: messages/);
  // Outside the provider's retention window nothing is shareable.
  assert.equal(audit([stage1(0, '["a"]', 'one'), stage1(600_000, '["a"]', 'two')], {cacheMinutes: 5}).stages.stage1.shareablePrefix, 0);
});

test('provider usage, when recorded, replaces estimates and yields the cache hit rate', () => {
  const calls = [
    stage1(0, '["a"]', 'one', {usage: {input: 10_000, output: 50, cached: 0}, maxTokens: 2048, tools: []}),
    stage1(20_000, '["a"]', 'two', {usage: {input: 10_400, output: 40, cached: 9_984}, maxTokens: 2048, tools: []}),
    stage1(90_000, '["a"]', 'three', {usage: {input: 10_800, output: 40, cached: 9_984}, maxTokens: 2048, tools: []}),
  ];
  const result = audit(calls, {tpm: 15_000});
  assert.equal(result.inputTokens, 31_200);
  assert.deepEqual(result.providerUsage, {calls: 3, input: 31_200, output: 130, cached: 19_968, cacheHitRate: 19_968 / 31_200});
  assert.equal(result.minute.max, 20_400);
  assert.equal(result.minute.overLimit, 1 / 3);
  assert.equal(result.outputCaps['stage1: 2048'], 3);
  const report = renderReport(result, {tpm: 15_000});
  assert.match(report, /cached 19968 \(64\.0%\)/);
  assert.doesNotMatch(report, /text mom|three/);
});
