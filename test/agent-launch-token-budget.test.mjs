import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const launcher = () => read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
const launchEnv = () => Object.fromEntries([...launcher().matchAll(/env\.put\("([A-Z0-9_]+)","([^"]*)"\)/g)].map(match => [match[1], match[2]]));

// Settings the runtime no longer reads. A launcher that set one would change nothing and suggest a
// cap or a hold that does not exist.
const RETIRED = [
  'ELIZA_PLANNER_MAX_TOKENS', 'ELIZA_CODING_PLANNER_MAX_TOKENS', 'ELIZA_STAGE1_MAX_TOKENS', 'ELIZA_EVALUATOR_MAX_TOKENS',
  'TEXT_SMALL_MAX_TOKENS', 'TEXT_LARGE_MAX_TOKENS', 'RESPONSE_HANDLER_MAX_TOKENS', 'ACTION_PLANNER_MAX_TOKENS', 'DEFAULT_MAX_TOKENS',
  'ELIZA_SECRET_SWAP_STABLE_REFERENCES', 'OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS', 'CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS',
  'OPENAI_ATTEMPT_IDLE_TIMEOUT_SECONDS',
];

// One phone exhausted the hosted model's per-minute token limit in a short conversation, and
// output caps cut off calls that reason before they answer (4,096 cut off reminder planning,
// Stage 1 after a history read and workflow authoring in every measured run).
test('the phone launches its agent with secret swap and no retired cap or hold setting', () => {
  const env = launchEnv();
  assert.equal(env.ELIZA_SECRET_SWAP_ENABLED, 'true');
  for (const name of RETIRED) assert.equal(env[name], undefined, `${name} is no longer read by the runtime`);
});

test('the pinned runtime sends no output cap and keeps references stable without a setting', () => {
  const planner = read('vendor/eliza/plugins/plugin-assistant/src/runtime/planner-loop.ts');
  assert.doesNotMatch(planner, /PLANNER_DEFAULT_MAX_TOKENS|ELIZA_PLANNER_MAX_TOKENS/);
  assert.doesNotMatch(read('vendor/eliza/packages/agent/src/runtime/runtime-settings.ts'), /outputCapSettingsFromEnv/);
  assert.doesNotMatch(read('vendor/eliza/packages/core/src/security/secret-swap.ts'), /ELIZA_SECRET_SWAP_STABLE_REFERENCES/);
  assert.doesNotMatch(read('vendor/eliza/plugins/plugin-native-phone/src/routes/reply-draft-route.ts'), /DRAFT_MAX_TOKENS/);
});

// Measured on the hosted model: a request refused with Retry-After 59 is admitted seconds later,
// because the allowance refills all the time. The runtime re-sends a refused step once after five
// seconds, so a local hold must end before that.
test('the pinned runtime ends a direct Cerebras rate-limit hold before its re-send', () => {
  const hold = Number(/RATE_LIMIT_MAX_HOLD_MS = ([0-9_]+)/.exec(read('vendor/eliza/plugins/plugin-openai/models/text.ts'))?.[1].replaceAll('_', ''));
  assert.ok(hold >= 1000 && hold < 5000, String(hold));
  assert.match(read('vendor/eliza/plugins/plugin-assistant/src/runtime/evaluator.ts'), /RATE_LIMIT_RETRY_MAX_WAIT_MS = 5_000/);
});
