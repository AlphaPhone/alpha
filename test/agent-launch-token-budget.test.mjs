import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const launcher = () => read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
const launchEnv = () => Object.fromEntries([...launcher().matchAll(/env\.put\("([A-Z0-9_]+)","([^"]*)"\)/g)].map(match => [match[1], match[2]]));

// Settings the phone never sets. The caps and the stable-reference switch are no longer read, so
// setting one would change nothing and suggest a cap that does not exist; the two rate-limit holds
// are read only as a host override, and the phone leaves the hold to the runtime.
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
  for (const name of RETIRED) assert.equal(env[name], undefined, `the phone does not set ${name}`);
});

test('the pinned runtime sends no output cap and keeps references stable without a setting', () => {
  // The agent's chat request carries a cap only when its caller asks for one; no setting adds one.
  assert.match(read('vendor/eliza/packages/agent/src/models/chat.vibe'), /params\.maxTokens === undefined \? \{ tag: "NoCapAsked" \}/);
  for (const file of ['packages/agent/src/conversation/planning.vibe', 'packages/agent/src/models/binding.vibe', 'packages/agent/src/device-actions/reply-draft.vibe'])
    assert.doesNotMatch(read(`vendor/eliza/${file}`), /PLANNER_DEFAULT_MAX_TOKENS|ELIZA_PLANNER_MAX_TOKENS|DRAFT_MAX_TOKENS|outputCapSettingsFromEnv/, file);
  const swap = read('vendor/eliza/packages/core/src/security/secret-swap.vibe');
  assert.match(swap, /SECRET_SWAP_ENABLED_SETTING = "ELIZA_SECRET_SWAP_ENABLED"/);
  assert.doesNotMatch(swap, /ELIZA_SECRET_SWAP_STABLE_REFERENCES/);
});

// No launch setting changes a rate-limit hold (spec/agent/models/binding.md, "A rate limit holds the
// account for the provider's whole retry time, and for at most 4 s on a Cerebras own-key endpoint"); the
// phone sets none (first test), so the pinned runtime's own bound decides how long a turn waits.
test('the pinned runtime bounds a Cerebras own-key rate-limit hold itself, with no launch override', () => {
  const binding = read('vendor/eliza/packages/agent/src/models/binding.vibe');
  assert.doesNotMatch(binding, /RATE_LIMIT_MAX_HOLD_SECONDS|holdSettings|rateLimitHold/);
  assert.match(binding, /cerebrasRoute = launch\.model\.backend === "own-key" && onCerebras\(launch\.model\.ownKeyBaseUrl\)/);
  assert.match(read('vendor/eliza/spec/agent/models/binding.md'), /pure val maxHoldMs = 4000/);
});
