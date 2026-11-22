import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

// The chat card offered with an agent answer uses the plan names the Account sheet uses
// ("Choose plan", "Manage plan"), never a separate "Subscription" name.
const source = readFileSync(new URL('../apps/app/src/prototype/agent-adapter.ts', import.meta.url), 'utf8');
const start = source.indexOf('function planActionCard('), end = source.indexOf('/** A saved row keeps', start);
assert.ok(start >= 0 && end > start, 'planActionCard source');
const planActionCard = runInNewContext(`${stripTypeScriptTypes(source.slice(start, end))};planActionCard`,
  {selectedCloudName: () => 'Eliza Cloud'});

test('a billing refusal offers the plan controls under the Account name', () => {
  const card = planActionCard('funding');
  assert.equal(card.title, 'Manage plan');
  assert.equal(card.planAction, 'funding');
});

test('no plan action card is titled Subscription', () => {
  for (const action of ['plan', 'sign-in', 'retry', 'provider', 'funding']) {
    const card = planActionCard(action);
    assert.ok(card, action);
    assert.doesNotMatch(card.title, /subscription/i, action);
  }
  assert.equal(planActionCard('unknown'), undefined);
});
