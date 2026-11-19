import test from 'node:test';
import assert from 'node:assert/strict';
import {orderOf, probeRequest, sizedRequest, unitOf} from '../scripts/agent-cache-probe.ts';

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
