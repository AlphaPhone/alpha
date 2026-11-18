// Decision P-43 (owner, 2026-10-13): "there should NEVER be no agent connected since the agent
// should ALWAYS run locally on device, no exceptions." Eliza Cloud sign-in and plan state decide only
// whether Cloud inference is bound into the running agent. Structural source contracts for the
// renderer and the native start path. Evidence class: source/test only; not an APK, emulator, image
// or device run. The browser specs in test/browser/native-cloud-subscription.spec.ts exercise the
// composed flow with synthetic ports.
import test from 'node:test';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DENYLIST, RETIRED_NO_AGENT_TEXT, RETIRED_REMOTE_AGENT_TEXT} from '../scripts/audit-production-bundle.ts';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const ui = read('apps/app/src/runtime/connection-ui.tsx');
const plugin = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java');
const store = read('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCredentialStore.java');
const between = (text, start, end) => { const from = text.indexOf(start), to = text.indexOf(end, from + start.length); assert.ok(from >= 0 && to > from, `${start} … ${end} located`); return text.slice(from, to); };

test('production bundles forbid the retired no-agent copy', () => {
  for (const text of ['without AI', 'Continue offline', 'Connect an agent']) {
    assert.ok(RETIRED_NO_AGENT_TEXT.includes(text), text);
    assert.ok(DENYLIST.includes(text), text);
  }
});

test('production bundles forbid remote-agent fallback copy, which stays test-mocks only (#381)', () => {
  for (const text of ['Connect your remote agent', 'No remote agent connected', 'Connect a remote agent']) {
    assert.ok(RETIRED_REMOTE_AGENT_TEXT.includes(text), text);
    assert.ok(DENYLIST.includes(text), text);
  }
  // Every remote-agent sentence in renderer source sits behind a constant-folded testMocksEnabled
  // branch; production wording names the on-phone agent instead.
  const sources = ['apps/app/src/runtime/connection-ui.tsx', 'apps/app/src/prototype/native-adapter.ts', 'apps/app/src/prototype/workflow-adapter.ts'];
  for (const file of sources) {
    const lines = read(file).split('\n');
    for (const [index, line] of lines.entries()) {
      if (!RETIRED_REMOTE_AGENT_TEXT.some(text => line.includes(text)) || line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      assert.match(line, /testMocksEnabled ?\?|!testMocksEnabled ?\?/, `${file}:${index + 1} gates remote-agent copy on testMocksEnabled`);
    }
  }
  assert.match(ui, /const PENDING_FALLBACK = testMocksEnabled \? 'Connect your remote agent in Settings\.' : LOCAL_AGENT_ELSEWHERE;/);
  assert.match(ui, /export const LOCAL_AGENT_ELSEWHERE = 'Use on phone';/);
  assert.doesNotMatch(ui, /NO_REMOTE_(SEND|VOICE)/);
});

test('no startup path ends claiming "starting" with nothing starting', () => {
  // Every startup outcome is settled: the resident starts, or the state is `recovering` with Retry.
  assert.match(ui, /\}\)\(\)\.then\(settleResidentAfterStartup\)(\.finally\(\(\)=>\{update\(\{startupResolved:true(?:,automaticRestore:false)?\}\);runQueuedSignInReturn\(\);\}\))?;/);
  assert.match(ui, /async function settleResidentAfterStartup\(\) \{[\s\S]{0,600}await ensureResident\(\);[\s\S]{0,80}update\(\{ kind: 'recovering' \}\);/);
  // A rebind that fails to reconnect leaves the agent recovering (Retry), never "no agent".
  assert.match(between(ui, 'function queueResidentRebind(', 'function runQueuedResidentRebind('), /catch \(error\) \{ if \(residentAlwaysPresent && !active\) update\(\{ kind: 'recovering' \}\); throw error; \}/);
});

test('a chat turn without Cloud inference gets an honest answer with the plan actions', () => {
  const send = between(ui, '  async send(', 'export function ConnectionChooser');
  const honest = send.indexOf('inferenceUnavailableReply(notice, signedIn)');
  assert.ok(honest > 0 && honest < send.indexOf('responseFailure = replyFailure('), 'the plan answer precedes the generic failure');
  assert.match(send, /state\.residentInference === 'unavailable' \|\| \('failureKind' in reply && reply\.failureKind === 'no_provider' && state\.residentInference !== 'cloud'\)/);
  // A provider-less turn that ends as a stream failure frame gets the same answer, never "Set up AI".
  const failure = between(ui, 'function replyFailure(', '\n}\n');
  assert.match(failure, /if\(kind==='no_provider'&&selected\.kind==='resident'&&residentCloudFlow\(\)\)\{[\s\S]*inferenceUnavailableReply\(notice,signedIn\)[\s\S]*planAction:/);
  const reply = between(ui, 'export function inferenceUnavailableReply(', '\n}\n');
  const state = {residentSubscription: null};
  const renderReply = new Function('cloudServiceName', 'cloud', 'state',
    reply.replace(/^export /, '').replace(/notice: ConnectionSnapshot\['residentPlanNotice'\], signedIn: boolean\): string/, 'notice, signedIn)')
      + '\n}; return inferenceUnavailableReply;')(() => 'Nebula', {environment:'production'}, state);
  const replies = [renderReply('offline', true), renderReply(null, false), renderReply(null, true)].join('\n');
  for (const text of ['Plan unconfirmed', 'Can’t reach Nebula', 'Sign in for AI'])
    assert.ok(replies.includes(text), text);
  // A verified account without a plan is told so; nothing claims a purchase either way.
  state.residentSubscription = {kind: 'inactive'};
  assert.equal(renderReply(null, true), 'Plan needed');
  assert.doesNotMatch(replies, /Nothing was purchased/);
  assert.doesNotMatch(reply, /no agent|without AI|credit|top.?up|upgrade|needs? (?:an? )?Eliza Cloud (?:account with a )?plan|on-device speech|Nothing was sent to Cloud/i);
  // Workflow text generation fails honestly instead of using the plan answer as generated text.
  const client = read('apps/app/src/runtime/alpha-client.ts');
  assert.match(between(client, 'async generateWorkflowText(', 'async send('), /if\(reply&&\(reply as AgentReply\)\.planAction\)throw new AlphaClientError\('unconfigured'/);
  const adapter = read('apps/app/src/prototype/agent-adapter.ts');
  assert.match(adapter, /if\(card\.planAction\)\{\n\s+if\(card\.planAction==='plan'\)connectionController\.openPlan\(\);\n\s+else if\(card\.planAction==='funding'\)connectionController\.openFunding\(\);/);
  assert.doesNotMatch(adapter, /title:'Set up AI'|connectionSetup/);
  const cards=adapter.slice(adapter.indexOf('function selectedCloudName('),adapter.indexOf('/** Context notices for proposals'));
  const renderCard=new Function('cloudServiceName','connectionController',stripTypeScriptTypes(cards,{mode:'strip'})+';return planActionCard;')(
    environment=>environment==='staging'?'Nebula':'Other service',
    {getCloudEnvironment:()=>null,getSnapshot:()=>({signIn:{environment:'staging'}})});
  assert.equal(renderCard('sign-in').title,'Sign in with Nebula');
  assert.equal(renderCard('retry').title,'Check Nebula again');
  assert.equal(renderCard('plan').planAction,'plan');
  assert.equal(renderCard('plan').title,'Choose plan');
  // A Cloud billing refusal offers the current account's subscription and membership code controls.
  assert.equal(renderCard('funding').planAction,'funding');
  assert.equal(renderCard('funding').title,'Subscription');
  assert.equal(renderCard('unknown'),undefined);

  assert.match(adapter, /const planCard=planActionCard\(\(e as \{planAction\?:unknown\}\)\.planAction\)\?\?managePlan;/);
});

test('a plan or billing refusal in chat is one agent bubble carrying one Manage card', () => {
  const adapter = read('apps/app/src/prototype/agent-adapter.ts');
  // Run the adapter's own failure branch with a recorded state; nothing else is posted afterwards.
  const branch = between(adapter, '          const failureKind=(e as {failureKind?:unknown})', '        }\n        else if(this.live&&reconciling)');
  const run = (failure, {streamed = false, kind = 'resident', planCard} = {}) => {
    const state = {chat: 'closed', msgs: streamed ? [{id: 'streamed', from: 'agent', text: 'Partial', streaming: true}] : []};
    const self = {setState: update => Object.assign(state, typeof update === 'function' ? update(state) : update), agentSay: () => { throw new Error('a second bubble'); }};
    new Function('e', 'message', 'streamed', 'streamedId', 'planActionCard', 'connectionController', 'selectedCloudName', 'crypto', 'REFUSED_BEFORE_OUTPUT',
      stripTypeScriptTypes(branch, {mode:'strip'})).call(self, failure, 'Refusal text.', streamed, 'streamed', () => planCard,
      {getSnapshot: () => ({kind})}, () => 'Nebula', {randomUUID: () => 'bubble'}, new Set(['insufficient_credits']));
    return state.msgs;
  };
  const [bubble, ...rest] = run({serviceLimit: 'allowance-exhausted'});
  assert.equal(rest.length, 0);
  assert.equal(bubble.text, 'Refusal text.');assert.equal(bubble.interrupted, true);
  assert.deepEqual(bubble.card, {type: 'generic', icon: 'info', title: 'Manage billing in Nebula', sub: 'Opens in your browser. Nothing is purchased here.', managePlan: true});
  const [streamedBubble, ...more] = run({serviceLimit: 'subscription-required'}, {streamed: true});
  assert.equal(more.length, 0);assert.equal(streamedBubble.interrupted, true);assert.equal(streamedBubble.streaming, false);
  // A plan refusal comes before any model output, so the streamed text is replaced, not kept.
  assert.equal(streamedBubble.text, 'Refusal text.');assert.equal(streamedBubble.card.title, 'Manage plan in Nebula');
  // A plan action card already on the refusal is the only card; other connections and failures get none.
  const planCard = {title: 'Check subscription or enter a membership code', planAction: 'funding'};
  assert.equal(run({serviceLimit: 'billing-refused'}, {planCard})[0].card, planCard);
  assert.equal(run({serviceLimit: 'billing-refused'}, {kind: 'remote'})[0].card, null);
  assert.equal(run({serviceLimit: 'rate-limited'})[0].card, null);
});

test('the plan surface is a notice beside the running agent, not a gate', () => {
  const chooser = ui.slice(ui.indexOf('export function ConnectionChooser'));
  assert.match(chooser, /if \(!visible\) \{\n\s+\/\/ Never a gate: the agent is running\./);
  assert.ok(chooser.includes('<aside className="alpha-plan-notice" role="region" aria-label={`${serviceName} plan notice`}>'));
  // Only a required sign-in opens (and locks) the dialog; admission without a plan opens nothing
  // (residentAdmissionOutcome).
  assert.ok(chooser.includes("const residentMustSignIn=!ownProviderSelected()&&residentCloudFlow()&&!snapshot.cloudAccount&&snapshot.residentPlanNotice!=='offline'&&!snapshot.residentStarting;"));
  assert.ok(chooser.includes('{!residentMustSignIn&&<button aria-label="Close connection settings"'));
  // Auth owns Back even while busy; the required top-level chooser remains protected.
  const close = between(ui, '  close() {', '  cancel() {');
  const cancelSignIn = close.indexOf('if(state.signIn){connectionController.cancelSignIn();return;}');
  const requiredSignIn = close.indexOf('if(residentSignInRequired()){');
  assert.ok(cancelSignIn >= 0 && requiredSignIn > cancelSignIn, 'Sign-in cancellation precedes the required-sign-in gate, after independent billing notices.');
  // No agent-less product choice remains in the phone's flow.
  const resident = between(chooser, 'if(residentCloudFlow())return', 'if(browserOnly)return');
  assert.doesNotMatch(resident, /Use local apps without AI|without AI|No agent connected/);  // The subscription sheet replaces the plan dialog only off the phone's own agent: Settings ›
  // Plan and the post-redemption screen keep the resident plan headline, needs-plan notice, Check plan
  // again and Renew (the panel carries the sheet's controls itself).
  assert.ok(chooser.includes("const accountSheet=fundingRequired||snapshot.purpose==='plan'||snapshot.purpose==='cloud-account';"), 'Account serves the same plan flow for every host');
  assert.ok(chooser.includes('if(accountSheet)return <div className="alpha-connection-scrim" data-alpha-billing-overlay="true" data-alpha-membership-sheet="true">'));
  for (const control of ['>Renew<', '>Recheck<', '{residentPlan.headline}', '{residentMembershipVisible&&membershipControls}']) assert.ok(resident.includes(control), control);
  // The component owns plan presentation while it is visible; the host's summary and actions are suppressed.
  assert.match(resident, /!residentMembershipVisible&&<section aria-label=\{`\$\{serviceName\} plan`\}/);
  // Inside the panel the plan headline already states plan state; the closable notice is outside Settings only.
  assert.doesNotMatch(resident, /\{NEEDS_PLAN_NOTICE\}/);
  assert.ok(chooser.includes('<p role="status"><StatusDot tone="off">{NEEDS_PLAN_NOTICE}</StatusDot></p>'));
  assert.doesNotMatch(resident, /cloneElement|planShownByHost/);
});

test('native starts the agent without a provider and never offers it a Cloud key without an admitted plan', () => {
  const start = between(plugin, '@PluginMethod public void start(', '@PluginMethod public void cancelStart(');
  assert.doesNotMatch(start, /Configure your model provider/);
  assert.doesNotMatch(plugin, /Configure your model provider before starting the local agent|Configure a model provider before starting/);
  const configure = between(plugin, 'static void configureEnvironment(', '@PluginMethod public void start(');
  // The shared launch order applies the provider or, when none is usable, the unbound environment.
  assert.match(configure, /if\(!NativeProviderSlot\.applyLaunchEnvironment\(BuildConfig\.ELIZA_RUNTIME_PROFILE,provider,cloudSaved,[^\n]*\)\)\{provider=null;saved=null;cloudSaved=null;googleBinding=null;\}/);
  assert.match(configure, /launchedGeneration=LocalAgentProviderAdmission\.launchGeneration\(saved,cloudSaved\);/);
  const sharedSlot = read('vendor/eliza/plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderSlot.java');
  assert.match(between(sharedSlot, 'public static boolean applyLaunchEnvironment(', '\n  }\n'), /if \(!bound\) applyUnboundEnvironment\(env\);/);
  const unbound = between(sharedSlot, 'public static final String[] PROVIDER_ENVIRONMENT', '\n  }\n\n');
  for (const key of ['ELIZAOS_CLOUD_API_KEY', 'CEREBRAS_API_KEY', 'OPENAI_API_KEY', 'ELIZA_PROVIDER', 'ELIZAOS_CLOUD_BASE_URL'])
    assert.ok(unbound.includes(`"${key}"`), `unbound launch removes ${key}`);
  assert.match(unbound, /env\.put\("ELIZAOS_CLOUD_USE_INFERENCE", "false"\);/);
  assert.ok(!unbound.includes('readCredentialSlot'), 'the unbound launch reads no credential');
  // An empty provider slot is its own attachable generation (host-JVM tested in LocalAgentProviderAdmission).
  assert.match(between(plugin, 'private static InvocationOwnerCache.Owner readProviderOwner(', 'private void rejectPending('), /if\(saved==null\)return new InvocationOwnerCache\.Owner\(LocalAgentProviderAdmission\.NO_PROVIDER_GENERATION,Long\.MAX_VALUE\);/);
  assert.match(read('vendor/eliza/plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderAdmission.java'), /NO_PROVIDER_GENERATION="no-provider"/);
  // With no stored provider, no process holds a Cloud key: a sign-in change does not stop the agent.
  assert.match(store, /if\(java\.util\.Objects\.equals\(before,value\)\)return false;\n\s+\/\/[^\n]*\n\s+\/\/[^\n]*\n\s+if\(provider==null\)return false;/);
});

test('browser speech has no Web Speech fallback', () => {
  for (const file of ['apps/app/src/browser/voice.ts', 'apps/app/src/browser/browser-surface.ts'])
    assert.doesNotMatch(read(file), /speechSynthesis|SpeechSynthesisUtterance/, file);
});

test('the on-device agent runs in the phone time zone', () => {
  const configure = between(plugin, 'static void configureEnvironment(', '@PluginMethod public void start(');
  assert.match(configure, /env\.put\("TZ",java\.util\.TimeZone\.getDefault\(\)\.getID\(\)\);/);
});
