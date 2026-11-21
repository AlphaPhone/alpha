import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

// One phone exhausted the hosted model's per-minute token limit in a short conversation:
// every request repeated the conversation under fresh references, so none shared a prefix.
test('the phone launches its agent with stable references and no output cap', () => {
  const host = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  const env = Object.fromEntries([...host.matchAll(/env\.put\("([A-Z0-9_]+)","([^"]*)"\)/g)].map(match => [match[1], match[2]]));
  assert.equal(env.ELIZA_SECRET_SWAP_ENABLED, 'true');
  assert.equal(env.ELIZA_SECRET_SWAP_STABLE_REFERENCES, 'true');
  // A call that sends no cap may write the model's maximum and holds no more of the per-minute
  // limit than a cap of 16,384 does. A smaller cap cut off calls that reason before they answer.
  for (const name of ['ELIZA_STAGE1_MAX_TOKENS', 'ELIZA_EVALUATOR_MAX_TOKENS', 'TEXT_SMALL_MAX_TOKENS', 'TEXT_LARGE_MAX_TOKENS', 'DEFAULT_MAX_TOKENS'])
    assert.equal(env[name], undefined, `${name} caps the phone's calls`);
  // The planner may only be given the model's maximum.
  assert.ok(env.ELIZA_PLANNER_MAX_TOKENS === undefined || env.ELIZA_PLANNER_MAX_TOKENS === 'model', env.ELIZA_PLANNER_MAX_TOKENS);
  // A flag the pinned runtime does not read would change nothing on the phone.
  assert.match(read('vendor/eliza/packages/core/src/security/secret-swap.ts'), /"ELIZA_SECRET_SWAP_STABLE_REFERENCES"/);
});

// Measured on the hosted model: a request refused with Retry-After 59 is admitted seconds
// later, because the allowance refills all the time. Held for the stated minute, the model
// failed every turn in it.
test('the phone holds a refused model for seconds, not for the provider\'s stated minute', () => {
  const host = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  const hold = Number(/env\.put\("OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS","([^"]*)"\)/.exec(host)?.[1]);
  // The hold must be over before the runtime's one re-send, five seconds after the refusal,
  // or the re-send is refused on the phone without reaching the provider.
  assert.ok(hold >= 1 && hold < 5, String(hold));
  assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/evaluator.ts'), /RATE_LIMIT_RETRY_MAX_WAIT_MS = 5_000/);
  // A setting the pinned runtime does not read would change nothing on the phone.
  assert.match(read('vendor/eliza/plugins/plugin-openai/models/text.ts'), /"OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS"/);
});
