import test from 'node:test';
import assert from 'node:assert/strict';
import {audit, bucketsOf, CEREBRAS_QWEN, estimateTokens, renderReport, renderSimulation, simulateProvider, stageOf, wireText} from '../scripts/agent-context-audit.ts';

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

// The provider reuses a prompt prefix in whole 128-token blocks, system prompt first, then
// tool definitions, then messages, and bills what misses against a smaller per-minute limit.
test('the provider simulation caches whole prefix blocks in system, tools, messages order', () => {
  const receipts = JSON.stringify(Array.from({length: 120}, (_, row) => [`history:${row}`, [['NOTES_CREATE', true, [row]]]]));
  const tools = [{name: 'HANDLE_RESPONSE', chars: 14_000}];
  const first = stage1(0, receipts, 'one', {tools});
  const next = stage1(20_000, receipts, 'two', {tools});
  const result = simulateProvider([first, next]);
  const [cold, warm] = [result.stages.stage1.input / 2, result.cachedTokens];
  assert.equal(warm % CEREBRAS_QWEN.cacheBlockTokens, 0);
  // Everything but the last message differs by a few tokens, so nearly all of it is reused.
  assert.ok(warm > 0.9 * cold && warm < cold, `${warm} of ${cold}`);
  assert.equal(result.hitRate, warm / result.inputTokens);

  // One changed character at the end of the system prompt loses the tools and the messages.
  const drifted = simulateProvider([first, {...next, system: `${system}Current contact reference kinds: a.`}]);
  assert.ok(drifted.cachedTokens <= estimateTokens(system));
  // Another tool list keeps the system prompt and nothing after it.
  const otherTools = simulateProvider([first, {...next, tools: [{name: 'HANDLE_RESPONSE', chars: 14_001}]}]);
  assert.ok(otherTools.cachedTokens <= estimateTokens(system));
  // A prefix older than the provider keeps it, or one still being read, is not reused.
  assert.equal(simulateProvider([first, stage1(400_000, receipts, 'two', {tools})]).cachedTokens, 0);
  assert.equal(simulateProvider([first, {...next, at: 500, ms: 900}]).cachedTokens, 0);
});

test('the provider simulation counts a call against both per-minute limits, with its output cap, when it starts', () => {
  const receipts = 'x '.repeat(4000);
  const calls = [0, 10_000, 20_000].map((at, index) => stage1(at, `${index}${receipts}`, 'go', {maxTokens: 2000}));
  const each = simulateProvider([calls[0]]).inputTokens;
  const fits = simulateProvider(calls, {...CEREBRAS_QWEN, uncachedTpm: 3 * each + 2000, totalTpm: 10 * each});
  assert.equal(fits.uncachedMinute.callsOver, 0);
  assert.equal(fits.uncachedMinute.max, 3 * each);
  // The third call's cap no longer fits, though what was used so far does.
  const tight = simulateProvider(calls, {...CEREBRAS_QWEN, uncachedTpm: 3 * each + 1999, totalTpm: 10 * each});
  assert.equal(tight.uncachedMinute.callsOver, 1);
  assert.equal(tight.turnsOver, 1);
  // A stage with no recorded cap takes the reserve given for it; cached tokens are exempt
  // from the uncached limit and not from the total one.
  const shared = [0, 10_000].map(at => stage1(at, receipts, 'go'));
  const reused = simulateProvider(shared, {...CEREBRAS_QWEN, outputReserve: {stage1: 500}});
  assert.ok(reused.uncachedMinute.max < reused.totalMinute.max);
  assert.equal(reused.totalMinute.max, reused.inputTokens);
  assert.match(renderSimulation(reused), /Cached \d+ of \d+ input tokens: \d+\.\d%/);
  assert.doesNotMatch(renderSimulation(reused), /x x x/);
});

test('where the provider reported its own cached count, the simulation shows both', () => {
  const calls = [
    stage1(0, '["a"]', 'one', {usage: {input: 9000, output: 30, cached: 0}}),
    stage1(20_000, '["a"]', 'two', {usage: {input: 9000, output: 30, cached: 8064}}),
  ];
  const result = simulateProvider(calls);
  assert.equal(result.inputTokens, 18_000);
  assert.equal(result.reported.provider, 8064);
  assert.ok(result.reported.simulated >= 0);
  assert.match(renderSimulation(result), /provider counted 8064 cached tokens/);
});
