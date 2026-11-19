import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

// One phone exhausted the hosted model's per-minute token limit in a short conversation:
// every request repeated the conversation under fresh references, so none shared a prefix.
test('the phone launches its agent with stable references and output caps the pinned runtime reads', () => {
  const host = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  const env = Object.fromEntries([...host.matchAll(/env\.put\("([A-Z_]+)","([^"]*)"\)/g)].map(match => [match[1], match[2]]));
  assert.equal(env.ELIZA_SECRET_SWAP_ENABLED, 'true');
  assert.equal(env.ELIZA_SECRET_SWAP_STABLE_REFERENCES, 'true');
  // A call holds its cap against the per-minute limit when it starts; one that sends none holds 16,384.
  for (const name of ['ELIZA_PLANNER_MAX_TOKENS', 'ELIZA_STAGE1_MAX_TOKENS', 'ELIZA_EVALUATOR_MAX_TOKENS']) {
    const cap = Number(env[name]);
    assert.ok(Number.isInteger(cap) && cap >= 2048 && cap < 8192, `${name}: room for a long note or reply, below what an uncapped call holds`);
  }
  // A flag the pinned runtime does not read would change nothing on the phone.
  assert.match(read('vendor/eliza/packages/core/src/security/secret-swap.ts'), /"ELIZA_SECRET_SWAP_STABLE_REFERENCES"/);
  assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/planner-loop.ts'), /"ELIZA_PLANNER_MAX_TOKENS"/);
  const caps = read('vendor/eliza/plugins/plugin-assistant/src/runtime/output-cap.ts');
  assert.match(caps, /"ELIZA_STAGE1_MAX_TOKENS"/);
  assert.match(caps, /"ELIZA_EVALUATOR_MAX_TOKENS"/);
});
