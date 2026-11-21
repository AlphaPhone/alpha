import test from 'node:test';
import assert from 'node:assert/strict';
import {audit, bucketsOf, CEREBRAS_QWEN, estimateTokens, readUsage, renderReport, renderSimulation, simulateProvider, stageOf, wireText, withAssumedTools} from '../scripts/agent-context-audit.ts';

const system = 'You are Alpha.\n\n';
// The limit tests below state their thresholds in tokens a call uses: no estimate margin, no hold for a missing cap.
const PLAIN = {...CEREBRAS_QWEN, admissionInputFactor: 1, uncappedOutputHold: 0};
// About 1,600 tokens of history, the same on every call that carries it.
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
  // 5,504, all of it 6,754, the whole request 8,403.
  const rule = 'Keep replies short and say what you did. ';
  const longSystem = `${system}${rule.repeat(250)}`;
  assert.equal(estimateTokens(longSystem), 2504);
  assert.equal(estimateTokens(`${system}${rule.repeat(125)}`), 1254);
  const tools = [{name: 'HANDLE_RESPONSE', chars: 13_300, hash: 'aaaa'}, {name: 'READ_CONTEXT', chars: 2_850, hash: 'bbbb'}];
  const first = stage1(0, receipts, 'one', {tools, system: longSystem});
  const next = stage1(20_000, receipts, 'two', {tools, system: longSystem});
  const cached = later => simulateProvider([first, later]).cachedTokens;
  const result = simulateProvider([first, next]);
  assert.equal(CEREBRAS_QWEN.cacheBlockTokens, 1024);
  assert.equal(result.inputTokens, 2 * 8403);
  // Only the end of the last message differs: all but the last partial unit is reused.
  assert.equal(result.cachedTokens, 8192);
  assert.equal(result.hitRate, 8192 / result.inputTokens);

  // A system prompt that changes keeps the tool definitions and the part of itself before
  // the change, and loses the messages.
  assert.equal(cached({...next, system: `Changed. ${longSystem}`}), 4096);
  assert.equal(cached({...next, system: `${system}${rule.repeat(125)}Changed. ${rule.repeat(125)}`}), 5120);
  // A changed second tool keeps the first tool only: not the second, not the system prompt.
  assert.equal(cached({...next, tools: [tools[0], {...tools[1], hash: 'cccc'}]}), 3072);
  // A changed first tool, or the same tools in another order, loses the whole request,
  // the unchanged system prompt included.
  assert.equal(cached({...next, tools: [{...tools[0], hash: 'dddd'}, tools[1]]}), 0);
  assert.equal(cached({...next, tools: [tools[1], tools[0]]}), 0);
  // One tool fewer or one more keeps the tools they share and stops there.
  assert.equal(cached({...next, tools: [tools[0]]}), 3072);
  assert.equal(cached({...next, tools: [...tools, {name: 'EXTRA', chars: 5_700, hash: 'eeee'}]}), 4096);
  // A prefix older than the provider keeps it, or one still being read, is not reused.
  assert.equal(cached(stage1(400_000, receipts, 'two', {tools, system: longSystem})), 0);
  assert.equal(cached({...next, at: 500, ms: 900}), 0);
  // Under one unit nothing is reused.
  assert.equal(simulateProvider([stage1(0, '[]', 'one'), stage1(20_000, '[]', 'one')]).cachedTokens, 0);
});

test('a call with no tool record is compared only with another such call, on its system prompt and messages', () => {
  const tools = [{name: 'HANDLE_RESPONSE', chars: 13_300, hash: 'aaaa'}];
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

test('a log that records no tool definitions can be given them at a known size', () => {
  const calls = [stage1(0, receipts, 'one'), stage1(20_000, receipts, 'two'), stage1(40_000, receipts, 'three', {tools: [{name: 'HANDLE_RESPONSE', chars: 9_000, hash: 'aaaa'}]})];
  const bare = simulateProvider(calls.slice(0, 2));
  // The same definition on every call adds its tokens and is reused with the text after it.
  const same = simulateProvider(withAssumedTools(calls.slice(0, 2), {stage1: 14_000}, false));
  assert.ok(same.inputTokens > bare.inputTokens + 2 * 3_000);
  assert.ok(same.cachedTokens > bare.cachedTokens);
  // A definition that changed on every call, read first, leaves nothing to reuse.
  assert.equal(simulateProvider(withAssumedTools(calls.slice(0, 2), {stage1: 14_000}, true)).cachedTokens, 0);
  // An unchanged definition sent before it is still reused, in whole units: 11,000 characters are 2,895 tokens.
  assert.equal(simulateProvider(withAssumedTools(calls.slice(0, 2), {stage1: 3_000}, true, {stage1: 11_000})).cachedTokens, 2048);
  // A recorded definition is kept, and a stage with no size named is left as it was.
  const given = withAssumedTools(calls, {stage1: 14_000}, true);
  assert.deepEqual(given[2].tools, calls[2].tools);
  assert.equal(withAssumedTools(calls, {planner: 29_000}, true)[0].tools, undefined);
});

// Measured on the provider: a per-minute limit is an allowance that refills a sixtieth of the
// limit each second, never above the limit. It is not a count over the last 60 seconds.
// A call that starts at `start` ms, runs for `ms`, and reports what it used.
const used = (start, input, extra = {}) => stage1(start + (extra.ms ?? 500), '[]', 'go', {ms: 500, usage: {input, output: 0, cached: 0}, ...extra});

test('an allowance refills all the time, and a call is refused when what is left is less than what it holds', () => {
  // 60,000 a minute is 1,000 a second.
  const model = {...PLAIN, uncachedTpm: 60_000, totalTpm: 600_000};
  const three = [0, 1_000, 2_000].map(start => used(start, 20_000));
  const result = simulateProvider(three, model);
  // Each call is charged 20,000 when it finishes half a second in, and 1,000 comes back a
  // second: the third starts with 38,500 still charged and holds 20,000.
  assert.equal(result.allowanceLeft.lowest, 1_500);
  assert.equal(result.uncachedMinute.callsOver, 0);
  // The 60-second sum is at the limit, which decides nothing.
  assert.equal(result.uncachedMinute.max, 60_000);
  // A fourth call half a second later finds 2,500; one 18 seconds later finds the 20,000 it holds.
  const fourth = start => simulateProvider([...three, used(start, 20_000)], model);
  assert.equal(fourth(3_000).uncachedMinute.callsOver, 1);
  assert.equal(fourth(3_000).turnsOver, 1);
  assert.equal(fourth(20_499).uncachedMinute.callsOver, 1);
  assert.equal(fourth(20_500).uncachedMinute.callsOver, 0);
  // A minute of 60,000 tokens would have been refused whole under a 60-second count; here ten
  // calls of 6,000, six seconds apart, never leave less than 53,500.
  const steady = simulateProvider(Array.from({length: 10}, (_, index) => used(index * 6_000, 6_000)), model);
  assert.equal(steady.uncachedMinute.max, 60_000);
  assert.equal(steady.allowanceLeft.lowest, 53_500);
  // An allowance never refills above the limit.
  assert.equal(simulateProvider([used(0, 1_000), used(600_000, 1_000)], model).allowanceLeft.lowest, 59_000);
  assert.match(renderSimulation(result), /left once a call holds its share: p50 \d+, p10 \d+, lowest 1500; 0 of 3 calls start without enough/);
  assert.match(renderSimulation(result), /Cached \d+ of \d+ input tokens: \d+\.\d%/);
});

test('a running call holds its input and its output cap; a finished one was charged only what it used', () => {
  const model = {...PLAIN, uncachedTpm: 60_000, totalTpm: 600_000};
  // 20,000 in and a cap of 8,192, of which 300 were used, over three seconds.
  const call = start => used(start, 20_000, {ms: 3_000, maxTokens: 8192, usage: {input: 20_000, output: 300, cached: 0}});
  const lowest = calls => simulateProvider(calls, model).allowanceLeft.lowest;
  // The second starts two seconds into the first: both hold 28,192.
  assert.equal(lowest([call(0), call(2_000)]), 60_000 - 28_192 - 28_192);
  // The second starts a second after the first finished, charged 20,300 of the 28,192 it held.
  assert.equal(lowest([call(0), call(4_000)]), 60_000 - 20_300 + 1_000 - 28_192);
  // The total limit holds a call the same way.
  const total = simulateProvider([call(0), call(2_000)], {...PLAIN, totalTpm: 56_000});
  assert.equal(total.totalMinute.callsOver, 1);
  assert.equal(simulateProvider([call(0), call(2_000)], {...PLAIN, totalTpm: 60_000}).totalMinute.callsOver, 0);
  // The 60-second figures report what was charged, not what was held.
  assert.equal(simulateProvider([call(0), call(2_000)], model).uncachedMinute.max, 40_600);

  // Without usage the output is unknown: the stage's reserve while the call runs, nothing once it has finished.
  const silent = start => stage1(start + 3_000, receipts, start ? 'go later' : 'go first', {ms: 3_000});
  const each = simulateProvider([silent(0)]).inputTokens;
  const reserve = {...model, outputReserve: {stage1: 500}};
  assert.equal(simulateProvider([silent(0), silent(2_000)], reserve).allowanceLeft.lowest, 60_000 - (each + 500) - (each + 500));
  assert.equal(simulateProvider([silent(0), silent(4_000)], reserve).allowanceLeft.lowest, 60_000 - each + 1_000 - (each + 500));
});

test('where a call carries the provider\'s cached count, the hit rate and the uncached windows use it and not the rules', () => {
  const tools = [{name: 'HANDLE_RESPONSE', chars: 13_300, hash: 'aaaa'}, {name: 'READ_CONTEXT', chars: 2_850, hash: 'bbbb'}];
  const calls = cached => [0, 20_000, 40_000].map((at, index) => stage1(at, receipts, `message ${index}`, {tools, usage: {input: 12_000, output: 50, ...cached(index)}}));
  // 30,000 a minute is 500 a second.
  const tight = {...PLAIN, uncachedTpm: 30_000};
  // By the rules the second and third calls would each reuse 5,120 tokens. The provider reused none.
  const missed = simulateProvider(calls(() => ({cached: 0})), tight);
  assert.deepEqual(missed.reported, {calls: 3, provider: 0, simulated: 10_240});
  assert.equal(missed.cachedTokens, 0);
  assert.equal(missed.hitRate, 0);
  assert.equal(missed.stages.stage1.cached, 0);
  assert.equal(missed.uncachedMinute.max, 3 * 12_050);
  // Each call is charged 12,050: 14,100 is still charged after the second, 4,550 when the third starts.
  assert.equal(missed.allowanceLeft.lowest, 30_000 - 4_550 - 12_000);
  assert.equal(missed.uncachedMinute.callsOver, 0);
  // At 18,000 a minute the second and third calls both start without the 12,000 they hold.
  const tighter = {...PLAIN, uncachedTpm: 18_000};
  assert.equal(simulateProvider(calls(() => ({cached: 0})), tighter).uncachedMinute.callsOver, 2);
  // The provider reused more than the rules give.
  const hit = simulateProvider(calls(index => ({cached: index ? 11_264 : 0})), tight);
  assert.deepEqual(hit.reported, {calls: 3, provider: 22_528, simulated: 10_240});
  assert.equal(hit.cachedTokens, 22_528);
  assert.equal(hit.hitRate, 22_528 / 36_000);
  assert.equal(hit.uncachedMinute.max, 3 * 12_050 - 22_528);
  // A cached prefix is not charged: the lowest point is the second call, after the uncached first.
  assert.equal(hit.allowanceLeft.lowest, 30_000 - 2_500 - 12_000);
  // And the third call fits where it did not.
  assert.equal(simulateProvider(calls(index => ({cached: index ? 11_264 : 0})), tighter).uncachedMinute.callsOver, 1);
  assert.match(renderSimulation(hit), /provider counted 22528 cached tokens, these rules give 10240/);
  // Usage that carries no cached count is not a count of zero: the rules stand in for it.
  const silent = simulateProvider(calls(() => ({})), tight);
  assert.equal(silent.reported, null);
  assert.equal(silent.cachedTokens, 10_240);
  assert.equal(silent.uncachedMinute.max, 3 * 12_050 - 10_240);
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
  // A cached prefix lowers what a call is charged, not what it needs to start: the call after
  // one that reused its prefix finds that much more allowance than after one that did not.
  const roomy = {...CEREBRAS_QWEN, uncachedTpm: 60_000};
  const three = history => [call(0, {maxTokens: 16}), stage1(20_000, history, 'go', {maxTokens: 16}), stage1(21_000, history, 'go', {maxTokens: 16})];
  const reused = simulateProvider(three(receipts).slice(0, 2), roomy).cachedTokens;
  assert.ok(reused > 0);
  assert.equal(simulateProvider(three('y '.repeat(4000)).slice(0, 2), roomy).cachedTokens, 0);
  const lowest = history => simulateProvider(three(history), roomy).allowanceLeft.lowest;
  assert.equal(lowest(receipts) - lowest('y '.repeat(4000)), reused);
  // Both third calls held the same amount to start.
  assert.equal(lowest('y '.repeat(4000)), 60_000 - input + 100 - held - 16);
});
