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
  // Stable references are the pinned runtime's default whenever secret swap is on; the old opt-in
  // flag is gone, so setting it would change nothing.
  assert.equal(env.ELIZA_SECRET_SWAP_STABLE_REFERENCES, undefined);
  // A call that sends no cap may write the model's maximum and holds no more of the per-minute
  // limit than a cap of 16,384 does. A smaller cap cut off calls that reason before they answer.
  for (const name of ['ELIZA_STAGE1_MAX_TOKENS', 'ELIZA_EVALUATOR_MAX_TOKENS', 'TEXT_SMALL_MAX_TOKENS', 'TEXT_LARGE_MAX_TOKENS', 'DEFAULT_MAX_TOKENS'])
    assert.equal(env[name], undefined, `${name} caps the phone's calls`);
  // The planner may only be given the model's maximum, and only on a runtime that reads that
  // value: an older one refuses it on every planner call.
  assert.ok(env.ELIZA_PLANNER_MAX_TOKENS === undefined || env.ELIZA_PLANNER_MAX_TOKENS === 'model', env.ELIZA_PLANNER_MAX_TOKENS);
  if (env.ELIZA_PLANNER_MAX_TOKENS === 'model')
    assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/planner-loop.ts'), /"model"/);
  const runtime = read('vendor/eliza/packages/core/src/runtime.ts');
  assert.match(runtime, /stableKey: this\.swapStableKey\(conversation\)/);
  assert.match(runtime, /if \(conversation === undefined \|\| !this\.isSecretSwapEnabled\(\)\)\s*return undefined;/);
  assert.doesNotMatch(read('vendor/eliza/packages/core/src/security/secret-swap.ts'), /ELIZA_SECRET_SWAP_STABLE_REFERENCES/);
});

// Measured on the hosted model: a request refused with Retry-After 59 is admitted seconds
// later, because the allowance refills all the time. Held for the stated minute, the model
// failed every turn in it.
test('the phone holds a refused model for seconds, not for the provider\'s stated minute', () => {
  const host = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
  // The pinned runtime bounds the hold itself; the old setting is gone, so the launcher sets none.
  assert.doesNotMatch(host, /RATE_LIMIT_MAX_HOLD_SECONDS/);
  const text = read('vendor/eliza/plugins/plugin-openai/models/text.ts');
  const hold = Number(/export const RATE_LIMIT_MAX_HOLD_MS = ([\d_]+);/.exec(text)?.[1].replaceAll('_', ''));
  // The hold must be over before the runtime's one re-send, five seconds after the refusal,
  // or the re-send is refused on the phone without reaching the provider.
  assert.ok(hold >= 1_000 && hold < 5_000, String(hold));
  assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/evaluator.ts'), /RATE_LIMIT_RETRY_MAX_WAIT_MS = 5_000/);
});
