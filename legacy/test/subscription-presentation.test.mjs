// Alpha's own subscription presentation (apps/app/src/ui/cloud/subscription-presentation.ts): the
// plan description, allowance line, Cloud refusal and redemption copy, retry times and the account
// summary, over the shared entitlement client's plan view and refusal. These are the presentation
// cases of the upstream client's tests at the copied commit, now owned here; refusal parsing,
// verification and admission stay tested with the shared client. Plan names and allowance numbers
// are synthetic test data, never product prices or quotas.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowanceText, CHOOSE_PLAN_LABEL, describeSubscription, MANAGE_PLAN_LABEL, redeemFailureMessage, redeemSuccessMessage,
  retryDuration, serviceLimitMessage, serviceLimitNextChange, subscriptionSummary,
} from '../apps/app/src/ui/cloud/subscription-presentation.ts';
import {SubscriptionRedeemError} from '../apps/app/src/runtime/subscription-entitlement.ts';

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
const limit = (kind, retryAfterMs = null, resetsAt = null) => ({kind, retryAfterMs, resetsAt});

test('presentation uses only Cloud numbers, injects the product name and never mentions credits for plans', () => {
  const copy = {serviceName: 'Nebula', productName: 'Synthetic Phone', deviceNoun: 'phone'};
  assert.equal(allowanceText(null), 'Plan allowance details are in Cloud.');
  assert.match(allowanceText({unit: 'requests', period: 'month', limit: 40, used: 3, resetsAt: null}), /^3 of 40 requests used this month\.$/);
  const period = {unit: 'usd_micros', granted: 25_000_000, remaining: 12_345_678, periodStart: NOW - 86400000, resetsAt: NOW + 86400000};
  assert.match(allowanceText(period, NOW), /^49% of this billing period's plan allowance is left\. Resets .+\.$/);
  assert.match(allowanceText({...period, remaining: 100}, NOW), /^Less than 1% of this billing period's plan allowance is left\./);
  assert.match(allowanceText({...period, remaining: 0}, NOW), /^This billing period's plan allowance is used up\. Resets /);
  assert.equal(allowanceText({...period, resetsAt: NOW - 1}, NOW), "49% of this billing period's plan allowance is left.");
  const views = [
    {kind: 'checking'},
    {kind: 'active', planName: 'Synthetic plan', status: 'active', allowance: null, expiresAt: NOW, refreshFailed: false},
    {kind: 'active', planName: 'Synthetic plan', status: 'past_due', allowance: null, expiresAt: NOW, refreshFailed: true},
    {kind: 'inactive', planName: null, status: 'none', source: 'billing-limits'},
    {kind: 'inactive', planName: 'Synthetic plan', status: 'canceled', source: 'entitlement'},
    {kind: 'unavailable', reason: 'outage'},
    {kind: 'unavailable', reason: 'not-published'},
    {kind: 'expired', planName: 'Synthetic plan'},
  ];
  for (const view of views)
    assert.doesNotMatch(JSON.stringify(describeSubscription(view, copy)), /credit|top.?up|\$|price|upgrade now/i, view.kind);
  assert.deepEqual(describeSubscription(views[0], copy), {headline: 'Checking your plan…', detail: '', manage: false, manageLabel: 'Manage plan in Nebula'});
  const none = describeSubscription(views[3], copy);
  assert.equal(none.headline, 'No active plan');
  assert.equal(none.manageLabel, 'Choose a plan');
  assert.equal(none.detail, 'Synthetic Phone needs an active Nebula plan. Redeem a subscription code or choose a plan in Nebula. Nothing is purchased automatically, and your data on this phone is kept.');
  assert.match(describeSubscription(views[3]).detail, /^This app needs an active Cloud plan\..*this device is kept\.$/);
  assert.equal(describeSubscription(views[4]).headline, 'Synthetic plan has ended');
  assert.equal(describeSubscription(views[2]).manage, true);
  assert.match(describeSubscription(views[2]).detail, /Payment is past due/);
  assert.match(describeSubscription(views[5]).detail, /Local apps keep working/);
  const credits = describeSubscription({kind: 'credits', source: 'billing-limits'}, copy);
  assert.equal(credits.headline, 'Nebula credits');
  assert.equal(credits.manageLabel, 'Manage billing in Nebula');
  assert.equal(MANAGE_PLAN_LABEL, 'Manage plan');
  assert.equal(CHOOSE_PLAN_LABEL, 'Choose a plan');
});

test('the account summary carries plan, allowance, plan end and a current rate-limit retry', () => {
  const copy = {serviceName: 'Nebula', productName: 'Synthetic Phone'};
  const view = {kind: 'active', planName: 'Synthetic plan', status: 'active',
    allowance: {unit: 'usd_micros', granted: 100, remaining: 25, periodStart: NOW - 1000, resetsAt: NOW + 86400000},
    expiresAt: NOW + 600000, refreshFailed: false, planEndsAt: NOW + 30 * 86400000};
  const rate = limit('rate-limited', 30_000);
  const summary = subscriptionSummary(view, {lastLimit: rate, lastLimitAt: NOW - 10_000, now: NOW, copy});
  assert.equal(summary.headline, 'Synthetic plan');
  assert.equal(summary.admission, 'admit');
  assert.match(summary.allowance, /^25% of this billing period's plan allowance is left\./);
  assert.equal(summary.planEndsAt, NOW + 30 * 86400000);
  assert.equal(summary.limit, 'The AI request rate limit was reached. Try again in about 20 seconds. Synthetic Phone did not retry your message.');
  // A wait that has passed no longer applies; an allowance reset still in the future does.
  assert.equal(subscriptionSummary(view, {lastLimit: rate, lastLimitAt: NOW - 31_000, now: NOW}).limit, null);
  assert.match(subscriptionSummary(view, {lastLimit: limit('allowance-exhausted', null, NOW + 86400000), lastLimitAt: NOW - 3_600_000, now: NOW}).limit,
    /allowance for this period is used up\. It resets /);
  // A countdown that ran out is never shown as "about 1 second": the reset still ahead says when to try again.
  assert.equal(subscriptionSummary(view, {lastLimit: limit('rate-limited', 30_000, NOW + 120_000), lastLimitAt: NOW - 60_000, now: NOW, copy}).limit,
    'The AI request rate limit was reached. Try again in about 2 minutes. Synthetic Phone did not retry your message.');
  // An unsigned snapshot plan reports its period end but no invented allowance.
  const snapshot = subscriptionSummary({kind: 'active', planName: 'Plus', status: 'active', allowance: null, expiresAt: NOW + 1000, refreshFailed: false, source: 'billing-limits'}, {now: NOW});
  assert.equal(snapshot.allowance, null);
  assert.equal(snapshot.planEndsAt, NOW + 1000);
  assert.equal(subscriptionSummary(null, {now: NOW}).admission, 'unknown');
});

test('Cloud refusal copy carries retry times and never implies a purchase or an automatic retry', () => {
  const copy = {serviceName: 'Nebula', productName: 'Synthetic Phone'};
  assert.equal(serviceLimitMessage(limit('rate-limited', 42000), NOW, copy),
    'The AI request rate limit was reached. Try again in about 42 seconds. Synthetic Phone did not retry your message.');
  assert.equal(serviceLimitMessage(null, NOW),
    'The AI request rate limit was reached. Wait a moment before sending again. This app did not retry your message.');
  assert.match(serviceLimitMessage(limit('rate-limited', 2400, NOW + 30_000), NOW), /rate limit was reached\. Try again in about 3 seconds\./, 'retryAfterMs wins the countdown');
  const allowance = limit('allowance-exhausted', null, NOW + 86400000);
  assert.match(serviceLimitMessage(allowance, NOW), /allowance for this period is used up\. It resets .+\. Nothing is purchased automatically\. Local apps keep working\.$/);
  assert.equal(serviceLimitMessage(limit('allowance-exhausted'), NOW),
    "Your plan's AI allowance for this period is used up. Nothing is purchased automatically. Local apps keep working.");
  const subscription = limit('subscription-required');
  assert.match(serviceLimitMessage(subscription, NOW, copy), /active Nebula plan.*Nothing is purchased automatically/);
  const bare = limit('billing-refused');
  assert.doesNotMatch(serviceLimitMessage(bare, NOW), /resets|plan/i);
  assert.match(serviceLimitMessage(limit('billing-refused', null, NOW + 3 * 86400000), NOW, {serviceName: 'Nebula'}),
    /^Nebula declined this AI request for your account's billing\. Nebula reports your plan allowance resets .+\. Check your account in Settings\./);
  for (const shown of [limit('rate-limited', 42000), allowance, subscription, bare])
    assert.doesNotMatch(serviceLimitMessage(shown, NOW), /credit|top.?up|upgrade|buy/i);
  assert.equal(retryDuration(0), 'about 1 second');
  assert.equal(retryDuration(89_000), 'about 89 seconds');
  assert.equal(retryDuration(90_000), 'about 2 minutes');
  assert.equal(retryDuration(89 * 60_000), 'about 89 minutes');
  assert.equal(retryDuration(90 * 60_000), 'about 2 hours');
});

test('redemption copy never echoes the code and keeps a paid plan in effect', () => {
  assert.equal(redeemFailureMessage(new SubscriptionRedeemError('invalid')), 'This code could not be redeemed. Check the code and try again.');
  assert.match(redeemFailureMessage(new SubscriptionRedeemError('rate-limited', 90_000)), /^Too many attempts\. Try again in about 2 minutes\.$/);
  assert.match(redeemFailureMessage(new SubscriptionRedeemError('account'), {serviceName: 'Nebula'}), /^Nebula could not apply a code/);
  assert.doesNotMatch(redeemFailureMessage(new Error('ABCD-EFGH-JKMN-PQRS')), /ABCD/);
  assert.match(redeemFailureMessage(new SubscriptionRedeemError('paid-plan-active')), /already has a paid plan/);
  assert.match(redeemFailureMessage(new SubscriptionRedeemError('ended')), /has ended for this account/);
  assert.match(redeemFailureMessage(new SubscriptionRedeemError('already-redeemed')), /already received this subscription/);
  assert.equal(redeemFailureMessage(new SubscriptionRedeemError('unavailable')), 'The code could not be redeemed right now. Try again.');
  assert.match(redeemSuccessMessage({replayed: false, grantEndsAt: Date.UTC(2027, 3, 14), paidPlanTakesPrecedence: false, planName: 'Plus'}), /^Code redeemed for Plus\. It runs until /);
  assert.match(redeemSuccessMessage({replayed: true, grantEndsAt: null, paidPlanTakesPrecedence: true, planName: null}), /current paid plan stays in effect/);
  assert.equal(redeemSuccessMessage({replayed: false, grantEndsAt: null, paidPlanTakesPrecedence: false, planName: null}), 'Code redeemed.');
});

test('a shown Cloud limit re-renders only when its wait, reset or notice window ends', () => {
  const at = 1_000_000;
  const rate = (retryAfterMs, resetsAt) => limit('rate-limited', retryAfterMs, resetsAt);
  assert.equal(serviceLimitNextChange(rate(30_000, null), at, at), 30_000);
  assert.equal(serviceLimitNextChange(rate(30_000, null), at, at + 29_500), 1000);
  assert.equal(serviceLimitNextChange(rate(30_000, null), at, at + 30_000), null);
  // The earlier of the wait and the reset, then the reset alone once the wait has passed.
  assert.equal(serviceLimitNextChange(rate(30_000, at + 90_000), at, at), 30_000);
  assert.equal(serviceLimitNextChange(rate(30_000, at + 90_000), at, at + 40_000), 50_000);
  // A reset days away is checked again within an hour, not scheduled days ahead.
  assert.equal(serviceLimitNextChange(rate(null, at + 3 * 86_400_000), at, at), 3_600_000);
  // A limit with neither time is shown for one minute.
  assert.equal(serviceLimitNextChange(rate(null, null), at, at + 10_000), 50_000);
  assert.equal(serviceLimitNextChange(rate(null, null), at, at + 60_000), null);
});

test('the wrapper re-exports Alpha presentation, not the shared client copy', async () => {
  const wrapper = await import('../apps/app/src/runtime/subscription-entitlement.ts');
  const local = await import('../apps/app/src/ui/cloud/subscription-presentation.ts');
  for (const name of ['CHOOSE_PLAN_LABEL', 'MANAGE_PLAN_LABEL', 'redeemSuccessMessage', 'retryDuration', 'serviceLimitNextChange'])
    assert.equal(wrapper[name], local[name], name);
  for (const name of ['subscriptionView', 'CLOUD_PLAN_NAMES'])
    assert.equal(name in wrapper, false, `${name} is not re-exported`);
});
