import test from 'node:test';
import assert from 'node:assert/strict';
import {audit, bucketsOf, CEREBRAS_QWEN, estimateTokens, readUsage, renderReport, renderSimulation, simulateProvider, stageOf, wireText} from '../scripts/agent-context-audit.ts';

const system = 'You are Alpha.\n\n';
// The limit tests below state their thresholds in tokens a call uses: no estimate margin, no hold for a missing cap.
const PLAIN = {...CEREBRAS_QWEN, admissionInputFactor: 1, uncappedOutputHold: 0};
// About 1,900 tokens of history, the same on every call that carries it.
const receipts = JSON.stringify(Array.from({length: 120}, (_, row) => [`history:${row}`, [['NOTES_CREATE', true, [row]]]]));
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

// Measured on the provider: a prompt prefix is reused in whole 1,024-token units, tool
// definitions first, then the system prompt, then the messages.
test('the provider simulation caches whole prefix units in tools, system, messages order', () => {
  // Every boundary ends in a 1,024-token unit of its own, so each rule below gives a
  // different count: first tool 3,500 tokens, both tools 4,250, half the system prompt
  // 5,505, all of it 6,757, the whole request 8,651.
  const rule = 'Keep replies short and say what you did. ';
  const longSystem = `${system}${rule.repeat(306)}`;
  assert.equal(estimateTokens(longSystem), 2507);
  assert.equal(estimateTokens(`${system}${rule.repeat(153)}`), 1255);
  const tools = [{name: 'HANDLE_RESPONSE', chars: 14_000, hash: 'aaaa'}, {name: 'READ_CONTEXT', chars: 3_000, hash: 'bbbb'}];
  const first = stage1(0, receipts, 'one', {tools, system: longSystem});
  const next = stage1(20_000, receipts, 'two', {tools, system: longSystem});
  const cached = later => simulateProvider([first, later]).cachedTokens;
  const result = simulateProvider([first, next]);
  assert.equal(CEREBRAS_QWEN.cacheBlockTokens, 1024);
  assert.equal(result.inputTokens, 2 * 8651);
  // Only the end of the last message differs: all but the last partial unit is reused.
  assert.equal(result.cachedTokens, 8192);
  assert.equal(result.hitRate, 8192 / result.inputTokens);

  // A system prompt that changes keeps the tool definitions and the part of itself before
  // the change, and loses the messages.
  assert.equal(cached({...next, system: `Changed. ${longSystem}`}), 4096);
  assert.equal(cached({...next, system: `${system}${rule.repeat(153)}Changed. ${rule.repeat(153)}`}), 5120);
  // A changed second tool keeps the first tool only: not the second, not the system prompt.
  assert.equal(cached({...next, tools: [tools[0], {...tools[1], hash: 'cccc'}]}), 3072);
  // A changed first tool, or the same tools in another order, loses the whole request,
  // the unchanged system prompt included.
  assert.equal(cached({...next, tools: [{...tools[0], hash: 'dddd'}, tools[1]]}), 0);
  assert.equal(cached({...next, tools: [tools[1], tools[0]]}), 0);
  // One tool fewer or one more keeps the tools they share and stops there.
  assert.equal(cached({...next, tools: [tools[0]]}), 3072);
  assert.equal(cached({...next, tools: [...tools, {name: 'EXTRA', chars: 6_000, hash: 'eeee'}]}), 4096);
  // A prefix older than the provider keeps it, or one still being read, is not reused.
  assert.equal(cached(stage1(400_000, receipts, 'two', {tools, system: longSystem})), 0);
  assert.equal(cached({...next, at: 500, ms: 900}), 0);
  // Under one unit nothing is reused.
  assert.equal(simulateProvider([stage1(0, '[]', 'one'), stage1(20_000, '[]', 'one')]).cachedTokens, 0);
});

test('a call with no tool record is compared only with another such call, on its system prompt and messages', () => {
  const tools = [{name: 'HANDLE_RESPONSE', chars: 14_000, hash: 'aaaa'}];
  const [first, next] = [stage1(0, receipts, 'one'), stage1(20_000, receipts, 'two')];
  const cached = (...calls) => simulateProvider(calls).cachedTokens;
  // Older runtimes record no definitions on either call: only the recorded text is compared.
  assert.equal(cached(first, next), 1024);
  // A recorded empty list is a call that sent none, and the same text gives the same count.
  assert.equal(cached({...first, tools: []}, {...next, tools: []}), 1024);
  // Unknown definitions never match recorded ones, whichever call came first, even an empty list.
  assert.equal(cached({...first, tools}, next), 0);
  assert.equal(cached(first, {...next, tools}), 0);
  assert.equal(cached({...first, tools: []}, next), 0);
  assert.equal(cached(first, {...next, tools: []}), 0);
});

test('the provider simulation counts a call against both per-minute limits, with its output cap, when it starts', () => {
  const receipts = 'x '.repeat(4000);
  const calls = [0, 10_000, 20_000].map((at, index) => stage1(at, `${index}${receipts}`, 'go', {maxTokens: 2000}));
  const each = simulateProvider([calls[0]]).inputTokens;
  const fits = simulateProvider(calls, {...PLAIN, uncachedTpm: 3 * each + 2000, totalTpm: 10 * each});
  assert.equal(fits.uncachedMinute.callsOver, 0);
  assert.equal(fits.uncachedMinute.max, 3 * each);
  // The third call's cap no longer fits, though what was used so far does.
  const tight = simulateProvider(calls, {...PLAIN, uncachedTpm: 3 * each + 1999, totalTpm: 10 * each});
  assert.equal(tight.uncachedMinute.callsOver, 1);
  assert.equal(tight.turnsOver, 1);
  // A stage with no recorded cap takes the reserve given for it; cached tokens are exempt
  // from the uncached limit and not from the total one.
  const shared = [0, 10_000].map(at => stage1(at, receipts, 'go'));
  const reused = simulateProvider(shared, {...PLAIN, outputReserve: {stage1: 500}});
  assert.ok(reused.uncachedMinute.max < reused.totalMinute.max);
  assert.equal(reused.totalMinute.max, reused.inputTokens);
  assert.match(renderSimulation(reused), /Cached \d+ of \d+ input tokens: \d+\.\d%/);
  assert.doesNotMatch(renderSimulation(reused), /x x x/);
});

test('the per-minute windows follow when calls start, not when they finish', () => {
  const history = 'x '.repeat(4000);
  // Started at 0 s, 30 s and 70 s; finished at 100 s, 31 s and 71 s.
  const calls = [[100_000, 100_000], [31_000, 1_000], [71_000, 1_000]].map(([at, ms], index) => stage1(at, `${index}${history}`, 'go', {ms}));
  const each = simulateProvider([calls[0]]).inputTokens;
  const result = simulateProvider(calls, {...PLAIN, uncachedTpm: 2 * each, totalTpm: 2 * each});
  assert.equal(result.cachedTokens, 0);
  // The third call starts more than 60 s after the first did, so no window holds all three.
  assert.equal(result.uncachedMinute.max, 2 * each);
  assert.equal(result.totalMinute.max, 2 * each);
  assert.equal(result.uncachedMinute.callsOver, 0);
  assert.equal(result.totalMinute.callsOver, 0);
});

test('a call still running when another starts is held at its output cap, a finished one at what it used', () => {
  const running = (start, hash, extra = {}) => stage1(start + 30_000, '[]', 'go', {ms: 30_000, maxTokens: 8192, usage: {input: 20_000, output: 300, cached: 0}, tools: [{name: 'PROPOSE_DEVICE_ACTION', chars: 28_000, hash}], ...extra});
  const over = (calls, uncachedTpm, model = {}) => simulateProvider(calls, {...PLAIN, uncachedTpm, ...model}).uncachedMinute.callsOver;
  // The second starts 5 s into the first: 20,000 in and the 8,192 cap for each.
  const overlapping = [running(0, 'aaaa'), running(5_000, 'bbbb')];
  assert.equal(over(overlapping, 56_384), 0);
  assert.equal(over(overlapping, 56_383), 1);
  // The second starts after the first finished having used 300 of its cap.
  const sequential = [running(0, 'aaaa'), running(31_000, 'bbbb')];
  assert.equal(over(sequential, 48_492), 0);
  assert.equal(over(sequential, 48_491), 1);
  // The total limit holds the cap the same way.
  assert.equal(simulateProvider(overlapping, {...PLAIN, totalTpm: 56_384}).totalMinute.callsOver, 0);
  assert.equal(simulateProvider(overlapping, {...PLAIN, totalTpm: 56_383}).totalMinute.callsOver, 1);
  // The 60-second figures report what was used, not what was held.
  assert.equal(simulateProvider(overlapping).uncachedMinute.max, 40_600);

  // Without usage the output is unknown: the stage's reserve while the call runs, nothing once it has finished.
  const silent = {usage: undefined, maxTokens: undefined};
  const reserve = {outputReserve: {stage1: 500}};
  const each = simulateProvider([running(0, 'aaaa', silent)]).inputTokens;
  const overlappingSilent = [running(0, 'aaaa', silent), running(5_000, 'bbbb', silent)];
  assert.equal(over(overlappingSilent, 2 * each + 1000, reserve), 0);
  assert.equal(over(overlappingSilent, 2 * each + 999, reserve), 1);
  const sequentialSilent = [running(0, 'aaaa', silent), running(31_000, 'bbbb', silent)];
  assert.equal(over(sequentialSilent, 2 * each + 500, reserve), 0);
  assert.equal(over(sequentialSilent, 2 * each + 499, reserve), 1);
  assert.equal(simulateProvider(overlappingSilent, {...PLAIN, ...reserve}).uncachedMinute.max, 2 * each);
});

test('where a call carries the provider\'s cached count, the hit rate and the uncached windows use it and not the rules', () => {
  const tools = [{name: 'HANDLE_RESPONSE', chars: 14_000, hash: 'aaaa'}, {name: 'READ_CONTEXT', chars: 3_000, hash: 'bbbb'}];
  const calls = cached => [0, 20_000, 40_000].map((at, index) => stage1(at, receipts, `message ${index}`, {tools, usage: {input: 12_000, output: 50, ...cached(index)}}));
  const tight = {...PLAIN, uncachedTpm: 30_000};
  // By the rules the second and third calls would each reuse 6,144 tokens. The provider reused none.
  const missed = simulateProvider(calls(() => ({cached: 0})), tight);
  assert.deepEqual(missed.reported, {calls: 3, provider: 0, simulated: 12_288});
  assert.equal(missed.cachedTokens, 0);
  assert.equal(missed.hitRate, 0);
  assert.equal(missed.stages.stage1.cached, 0);
  assert.equal(missed.uncachedMinute.max, 3 * 12_050);
  // The third call starts with 24,100 uncached tokens already in its minute.
  assert.equal(missed.uncachedMinute.callsOver, 1);
  assert.equal(missed.turnsOver, 1);
  // The provider reused more than the rules give.
  const hit = simulateProvider(calls(index => ({cached: index ? 11_264 : 0})), tight);
  assert.deepEqual(hit.reported, {calls: 3, provider: 22_528, simulated: 12_288});
  assert.equal(hit.cachedTokens, 22_528);
  assert.equal(hit.hitRate, 22_528 / 36_000);
  assert.equal(hit.uncachedMinute.max, 3 * 12_050 - 22_528);
  assert.equal(hit.uncachedMinute.callsOver, 0);
  assert.match(renderSimulation(hit), /provider counted 22528 cached tokens, these rules give 12288/);
  // Usage that carries no cached count is not a count of zero: the rules stand in for it.
  const silent = simulateProvider(calls(() => ({})), tight);
  assert.equal(silent.reported, null);
  assert.equal(silent.cachedTokens, 12_288);
  assert.equal(silent.uncachedMinute.max, 3 * 12_050 - 12_288);
  assert.doesNotMatch(renderSimulation(silent), /provider counted/);
});

test('a cached count the provider did not report stays absent when a logged call is read', () => {
  assert.deepEqual(readUsage({usage: {promptTokens: 9000, completionTokens: 30}}), {input: 9000, output: 30});
  assert.deepEqual(readUsage({usage: {promptTokens: 9000, completionTokens: 30, cacheReadInputTokens: 0}}), {input: 9000, output: 30, cached: 0});
  assert.deepEqual(readUsage({response: {usage: {prompt_tokens: 9000, completion_tokens: 30, prompt_tokens_details: {cached_tokens: 8192}}}}), {input: 9000, output: 30, cached: 8192});
  assert.equal(readUsage({}), undefined);
  assert.equal(audit([stage1(0, '[]', 'one', {usage: {input: 9000, output: 30}})]).providerUsage.cached, 0);
});

// Measured on the provider: at admission a call holds its whole input, cached or not, estimated
// about a quarter high, plus its output cap, or 16,384 tokens when it sends no cap.
test('a call is admitted against its estimated input and its cap, and charged what it used', () => {
  assert.equal(CEREBRAS_QWEN.admissionInputFactor, 1.25);
  assert.equal(CEREBRAS_QWEN.uncappedOutputHold, 16_384);
  const receipts = 'x '.repeat(4000);
  const call = (at, extra = {}) => stage1(at, receipts, 'go', extra);
  const input = simulateProvider([call(0)]).inputTokens;
  const over = (calls, uncachedTpm) => simulateProvider(calls, {...CEREBRAS_QWEN, uncachedTpm}).uncachedMinute.callsOver;
  const held = Math.round(1.25 * input);
  // No cap sent: the provider holds 16,384 for the output.
  assert.equal(over([call(0)], held + 16_384), 0);
  assert.equal(over([call(0)], held + 16_383), 1);
  // A cap replaces that hold.
  assert.equal(over([call(0, {maxTokens: 4096})], held + 4096), 0);
  assert.equal(over([call(0, {maxTokens: 4096})], held + 4095), 1);
  // A cached prefix lowers what the call is charged, not what it needs to start.
  const warm = [call(0, {maxTokens: 16}), call(20_000, {maxTokens: 16})];
  const result = simulateProvider(warm, {...CEREBRAS_QWEN, uncachedTpm: input + held + 16});
  assert.ok(result.cachedTokens > 0);
  assert.equal(result.uncachedMinute.callsOver, 0);
  assert.equal(over(warm, input + held + 15), 1);
  assert.ok(result.uncachedMinute.max < 2 * input);
});
