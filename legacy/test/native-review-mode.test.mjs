import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReviewMode} from '../scripts/native-review-mode.ts';

const scratch = () => '/tmp/alpha-native-review-cloud-test';

test('a token file alone never attaches the native UI review to the resident agent', () => {
  const env = {ALPHA_LOCAL_AGENT_TOKEN_FILE: '/home/owner/token', VITE_LOCAL_AGENT: '1', ALPHA_BROWSER_CLOUD_PROFILE: '/home/owner/browser-cloud'};
  const mode = nativeReviewMode(env, scratch);
  assert.equal(mode.attached, false);
  // An inherited VITE_LOCAL_AGENT=1 is cleared, so the owner-token bridge is not mounted.
  assert.equal(env.VITE_LOCAL_AGENT, '');
  assert.notEqual(env.ALPHA_DEV_CONNECTION_TOOLS, '0');
  // The developer's own browser Cloud profile is never used by the synthetic review.
  assert.equal(env.ALPHA_BROWSER_CLOUD_PROFILE, scratch());
  assert.match(mode.meta, /no SIM, personal account or hardware access/);
  assert.match(mode.banner, /simulated providers only/);
});

test('the explicit opt-in attaches the resident agent and says real accounts are connected', () => {
  const env = {ALPHA_NATIVE_REVIEW_LOCAL_AGENT: '1', ALPHA_LOCAL_AGENT_TOKEN_FILE: '/home/owner/token'};
  const mode = nativeReviewMode(env, () => assert.fail('an attached review keeps the configured profile'));
  assert.equal(mode.attached, true);
  assert.equal(env.VITE_LOCAL_AGENT, '1');
  assert.equal(env.ALPHA_DEV_CONNECTION_TOOLS, '0');
  for (const label of [mode.meta, mode.banner]) {
    assert.match(label, /real local agent and any accounts it holds/);
    assert.doesNotMatch(label, /personal account|simulated providers only/);
  }
});

test('the opt-in needs a token file and accepts only 1', () => {
  assert.throws(() => nativeReviewMode({ALPHA_NATIVE_REVIEW_LOCAL_AGENT: '1'}, scratch), /needs ALPHA_LOCAL_AGENT_TOKEN_FILE/);
  assert.throws(() => nativeReviewMode({ALPHA_NATIVE_REVIEW_LOCAL_AGENT: 'yes', ALPHA_LOCAL_AGENT_TOKEN_FILE: '/t'}, scratch), /must be 1 or unset/);
});
