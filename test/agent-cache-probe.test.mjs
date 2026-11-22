import test from 'node:test';
import assert from 'node:assert/strict';
import {admissionOf, orderOf, probeRequest, refillOf, sizedRequest, unitOf} from '../scripts/agent-cache-probe.ts';

// What the provider reported on 18 November 2026 for the same request sent twice.
const measured = [[579, 0], [999, 0], [1143, 1024], [1314, 1024], [1942, 1024], [2150, 2048], [2887, 2048], [11829, 11264]].map(([prompt, cached]) => ({prompt, cached}));

test('the unit of reuse is the largest size every cached count is a multiple of', () => {
  assert.equal(unitOf(measured), 1024);
  assert.equal(unitOf([{prompt: 600, cached: 512}, {prompt: 900, cached: 768}]), 256);
  assert.equal(unitOf([{prompt: 600, cached: 0}]), null);
});

test('the part whose change leaves least reused is the part read first', () => {
  // Measured: new tools 0, new system prompt 7168, new messages 9216.
  assert.deepEqual(orderOf({tools: 0, system: 7168, messages: 9216}), ['tools', 'system', 'messages']);
  assert.deepEqual(orderOf({system: 0, tools: 2048, messages: 9216}), ['system', 'tools', 'messages']);
  // Two parts that leave the same amount do not show an order.
  assert.equal(orderOf({tools: 0, system: 0, messages: 9216}), null);
});

test('a probe request changes one part at its first character and nothing else', () => {
  const marks = {tools: 'a', system: 'b', messages: 'c'};
  const base = probeRequest('model', marks);
  const tools = probeRequest('model', {...marks, tools: 'x'});
  assert.deepEqual(tools.messages, base.messages);
  assert.notDeepEqual(tools.tools[0], base.tools[0]);
  assert.deepEqual(tools.tools.slice(1), base.tools.slice(1));
  assert.ok(tools.tools[0].function.description.startsWith('[x] '));
  const system = probeRequest('model', {...marks, system: 'x'});
  assert.deepEqual(system.tools, base.tools);
  assert.deepEqual(system.messages[1], base.messages[1]);
  assert.ok(system.messages[0].content.startsWith('[x] '));
  // Nothing identifying goes out: no key, no phone text, a small output cap.
  assert.equal(base.max_tokens, 16);
  assert.ok(sizedRequest('model', 'm', 60).messages[0].content.length > 6000);
  assert.doesNotMatch(JSON.stringify([base, sizedRequest('model', 'm', 25)]), /csk-|Bearer/);
});

test('what a request holds at admission gives the input estimate and the hold for a missing cap', () => {
  // Measured on 20 November 2026: an 888-token prompt held 1,106 with a cap of 16, 5,186 with 4,096 and 17,474 with none.
  const measured = [{cap: 16, prompt: 888, held: 1106}, {cap: 4096, prompt: 890, held: 5186}, {cap: null, prompt: 888, held: 17_474}];
  const admission = admissionOf(measured);
  assert.equal(admission.uncappedHold, 16_384);
  assert.ok(Math.abs(admission.inputFactor - 1.23) < 0.01);
  assert.equal(admissionOf(measured.slice(0, 2)), null);
  assert.equal(admissionOf(measured.slice(2)), null);
});

test('the refill rate is the rise between readings still below the limit', () => {
  // Measured on 20 November 2026 after a request of 18,947 tokens: readings a second apart, in steps.
  const measured = [[1300, 131036], [2200, 136022], [3200, 136008], [4300, 140994], [5300, 140980], [6300, 145966], [7200, 145952], [8200, 149999], [9100, 149985]].map(([at, left]) => ({at, left}));
  const rate = refillOf(measured, 150_000);
  // A sixtieth of the 150,000 limit a second.
  assert.ok(Math.abs(rate - 2500) < 100, String(rate));
  // Readings at the limit, or too close together, show nothing.
  assert.equal(refillOf(measured.slice(-2), 150_000), null);
  assert.equal(refillOf(measured.slice(0, 2), 150_000), null);
});
