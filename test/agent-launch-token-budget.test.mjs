import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

// One phone exhausted the hosted model's per-minute token limit in a short conversation:
// every request repeated the conversation under fresh references, so none shared a prefix.
test('the phone launches its agent with stable references and a planner output cap the pinned runtime reads', () => {
  const host = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  const env = Object.fromEntries([...host.matchAll(/env\.put\("([A-Z_]+)","([^"]*)"\)/g)].map(match => [match[1], match[2]]));
  assert.equal(env.ELIZA_SECRET_SWAP_ENABLED, 'true');
  assert.equal(env.ELIZA_SECRET_SWAP_STABLE_REFERENCES, 'true');
  const cap = Number(env.ELIZA_PLANNER_MAX_TOKENS);
  assert.ok(Number.isInteger(cap) && cap >= 2048 && cap < 8192, 'room for a long note in one tool call, below the runaway bound');
  // A flag the pinned runtime does not read would change nothing on the phone.
  assert.match(read('vendor/eliza/packages/core/src/security/secret-swap.ts'), /"ELIZA_SECRET_SWAP_STABLE_REFERENCES"/);
  assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/planner-loop.ts'), /"ELIZA_PLANNER_MAX_TOKENS"/);
});
