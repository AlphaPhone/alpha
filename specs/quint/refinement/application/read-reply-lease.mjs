import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from '../../../../test/support/strip-types.mjs';
import {captureInputs, checkTraces} from '../check-traces.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const self = fileURLToPath(import.meta.url);
const adapterPath = 'apps/app/src/prototype/agent-adapter.ts';
const connectionPath = 'apps/app/src/runtime/connection-ui.tsx';
const sourcePaths = [adapterPath, connectionPath, 'test/support/strip-types.mjs'];
const session = {sessionId:'reader-session', ownerId:'reader-owner', agentId:'reader-agent', origin:'https://reader.invalid'};
const origin = {version:1, requestId:'read-request', conversationId:'read-conversation', inReplyTo:'original-question'};
const proposalId = 'read-proposal';
const digest = 'a'.repeat(64);
const hint = {...origin, proposalId, digest};
const reply = {...origin, messageId:'read-answer', text:'Synthetic approved answer'};

function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, start);
  return source.slice(first, last);
}

function evaluatedModules(driverHashes, rewrite) {
  const read = path => {
    const absolute = resolve(root, path), bytes = readFileSync(absolute);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), driverHashes[absolute], path);
    return bytes.toString('utf8');
  };
  const adapter = read(adapterPath), connection = read(connectionPath);
  const lease = between(adapter, '  function retainReadReply(', '  function recoverPendingActions(');
  const card = between(adapter, '  p.cardAct = async function', '  p.startVoice = async function');
  const adapterSource = `const p = {};\n${lease}\n${card}`;
  const rewritten = rewrite?.(adapterSource) ?? adapterSource;
  if (rewrite) assert.notEqual(rewritten, adapterSource, 'The mutation changes the actual adapter');
  const connectionSource = `
    const {document, actions} = ports;
    const state = {session: ports.session, open: false, busy: false};
    const active = {actions}, service = null, readReplyOwners = new Map(), conversationMemory = new Map();
    let epoch = 0;
    ${between(connection, 'function conversationKey(', '\n')}
    conversationMemory.set(conversationKey(state.session), ports.conversationId);
    const connectionController = {
      getSnapshot: () => state,
      approvePendingAction: ports.approve,
      ${between(connection, '  readReplyBinding(', '  async actionHistory(')}
      ${between(connection, '  voiceConversationCurrent(', '  async prepareVoiceConversation(')}
    };
  `;
  const strip = code => stripTypeScriptTypes(code, {mode:'strip'});
  return {
    connection: new Function('ports', `${strip(connectionSource)}\nreturn {controller: connectionController, retire: () => { epoch++; }};`),
    adapter: new Function('connectionController', 'alphaClient', 'document', 'context', 'recoverPendingActions',
      'publishCommittedDeviceChanges', `${strip(rewritten)}\nreturn {p, retainReadReply, proposalCard, completeReadReply};`),
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return {promise, resolve, reject};
}
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };
const scenarios = [
  ['one exact answer and voice callback', ['retain', 'retain', 'tap', 'successfulReceipt', 'answer', 'duplicate']],
  ['targeted cancellation drops a late answer', ['retain', 'tap', 'successfulReceipt', 'cancel', 'cancel', 'answer']],
  ['retirement before the approval receipt', ['retain', 'tap', 'retire', 'successfulReceipt']],
  ['late agent result after binding change', ['retain', 'tap', 'successfulReceipt', 'retire', 'answer', 'duplicate']],
  ['retirement before a queued answer commit', ['retain', 'tap', 'successfulReceipt', 'holdAnswerCommit', 'retire', 'commitAnswer']],
  ['failed read receipt cancels the lease', ['retain', 'tap', 'failedReceipt']],
  ['wrong receipt digest cannot complete', ['retain', 'tap', 'wrongDigest']],
  ['wrong receipt origin cannot complete', ['retain', 'tap', 'wrongOrigin']],
  ['failed completion stays unconfirmed', ['retain', 'tap', 'successfulReceipt', 'failedCompletion', 'duplicate']],
];

async function runScenario(compiled, name, steps) {
  const approval = deferred(), completion = deferred(), completeCalls = [], cancelCalls = [], resumed = [];
  const document = {hidden:false}, ctx = {view:'notes', sensitive:false};
  let taps = 0, approving, heldCommit, deferCommit = false, approvalSignal, approveCalls = 0;
  const connection = compiled.connection({
    document, session, conversationId:origin.conversationId,
    approve(id, receivedContext, signal) {
      assert.equal(id, proposalId);
      assert.equal(receivedContext, ctx);
      assert.equal(++approveCalls, 1, 'One approval can reach the supplied device port');
      approvalSignal = signal;
      return approval.promise;
    },
    actions: {
      completeReadReply(value, signal) {
        assert.deepEqual(value, hint);
        assert.equal(signal.aborted, false);
        completeCalls.push({value, signal});
        return completion.promise;
      },
      async cancelReadReply(id, ownedDigest, signal) {
        assert.equal(id, proposalId);
        assert.equal(ownedDigest, digest);
        assert.equal(signal.aborted, false);
        cancelCalls.push(id);
      },
    },
  });
  const controller = connection.controller;
  const client = {getState: () => ({context:ctx})};
  const adapter = compiled.adapter(controller, client, document, () => {}, () => assert.fail('No continuation supplied'), () => {});
  const proposal = {id:proposalId, title:'Reviewed note read', description:'Read the reviewed fixture note',
    expiresAt:Date.now() + 600_000, privateNotesRead:true, readReply:{origin, digest}};
  const card = {...adapter.proposalCard(proposal), recovered:true, proposalSession:session};
  const initial = {view:'notes', msgs:[{id:'review-card', from:'agent', card}]};
  const shell = {
    ...adapter.p, live:true, state:initial,
    S() { return this.state; },
    setState(update, done) {
      const apply = () => {
        const patch = typeof update === 'function' ? update(this.state) : update;
        if (patch) this.state = {...this.state, ...patch};
        done?.();
      };
      if (deferCommit && typeof update === 'function' && done) {
        assert.equal(heldCommit, undefined, 'The staged answer owns a single renderer commit');
        heldCommit = apply;
      } else apply();
    },
    resumeReadReplyVoice(value, answer) {
      assert.deepEqual(value, hint);
      assert.deepEqual(answer, reply);
      resumed.push(answer.messageId);
    },
    agentSay() {}, toast() {},
  };
  const lease = () => shell.readReplyLeases?.get(proposalId);
  const original = {id:origin.inReplyTo, from:'user', text:'What is in the reviewed note?',
    messageBinding:{conversationId:origin.conversationId, session}};
  // Recovery must first find the actual original turn. A plausible proposal alone is insufficient.
  adapter.retainReadReply(shell, proposal);
  assert.equal(lease(), undefined, 'No original question means no read-reply lease');
  shell.setState(previous => ({msgs:[original, ...previous.msgs]}));
  const currentBinding = {connectionEpoch:0, conversationId:origin.conversationId, session};
  const observe = () => {
    const answers = shell.S().msgs.filter(message => message.id === reply.messageId);
    for (const message of answers) assert.deepEqual(message, {
      id:reply.messageId, from:'agent', text:reply.text,
      messageBinding:{conversationId:reply.conversationId, session}, inReplyTo:reply.inReplyTo, card:null,
    });
    return {'s.lease':lease()?.phase ?? 'none', 's.bindingCurrent':controller.voiceConversationCurrent(currentBinding, false),
      's.approval': shell.pendingActionApproval ? 'running' : 'none',
      's.completions': completeCalls.length + Number(completeCalls.length > 0 && !shell.pendingActionApproval),
      's.answers': answers.length, 's.voiceResumed': resumed.length, 's.wasCancelled': lease()?.phase === 'cancelled',
      's.cancelRequests': cancelCalls.length, 's.taps':taps};
  };
  const trace = {name, expect:observe(), steps:[]};
  const mark = (action, ...args) => trace.steps.push({label:action, action:{name:action, args}, expect:observe()});
  const success = value => ({proposalId, status:'succeeded', summary:'Reviewed read', readReply:value ?? hint});

  for (const step of steps) {
    if (step === 'retain') {
      const previous = lease();
      adapter.retainReadReply(shell, proposal);
      if (previous) assert.equal(lease(), previous, 'Repeated delivery retains the original live binding');
      mark('retain');
    } else if (step === 'tap') {
      taps++;
      approving = shell.cardAct(shell.S().msgs.find(message => message.card?.proposalId === proposalId));
      await flush();
      mark('approveTap');
    } else if (step === 'successfulReceipt') {
      approval.resolve(success());
      await flush();
      mark('receipt', true);
    } else if (step === 'failedReceipt' || step === 'wrongDigest' || step === 'wrongOrigin') {
      approval.resolve(step === 'failedReceipt' ? {proposalId, status:'failed', summary:'Read failed'}
        : success(step === 'wrongDigest' ? {...hint, digest:'b'.repeat(64)} : {...hint, inReplyTo:'different-question'}));
      await approving;
      if (step === 'failedReceipt') mark('receipt', false);
      else {
        assert.equal(completeCalls.length, 0, 'A mismatched receipt may not start completion');
        mark('rejectHint');
      }
    } else if (step === 'retire') {
      connection.retire();
      mark('bindingChanged');
    } else if (step === 'cancel') {
      shell.cancelReadReplyCompletions('unrelated-proposal');
      shell.cancelReadReplyCompletions(proposalId);
      await flush();
      assert.ok(approvalSignal.aborted && completeCalls.at(0)?.signal.aborted, 'Cancellation aborts the owned approval and completion');
      mark('cancel');
    } else if (step === 'duplicate') {
      assert.equal(await adapter.completeReadReply(shell, success()), false, 'The settled lease refuses a duplicate completion');
      mark('duplicateCompletion');
    } else if (step === 'holdAnswerCommit') {
      deferCommit = true;
      completion.resolve(reply);
      await flush();
      assert.equal(typeof heldCommit, 'function', 'The actual renderer queued the answer before the binding retired');
    } else {
      if (step === 'commitAnswer') {
        assert.ok(heldCommit);
        deferCommit = false;
        heldCommit();
      } else if (step === 'failedCompletion') completion.reject(Error('Synthetic answer transport failed'));
      else {
        assert.equal(step, 'answer');
        completion.resolve(reply);
      }
      await approving;
      if (step === 'commitAnswer' || name === 'targeted cancellation drops a late answer') {
        assert.equal(observe()['s.answers'], 0, 'A retired binding must not publish the queued answer');
      }
      mark('completionSettles', step !== 'failedCompletion');
    }
  }
  await approving;
  return trace;
}

export async function checkReadReplyLease(extraSources = [], {rewrite, only} = {}) {
  const sources = [...sourcePaths, self, ...extraSources];
  const driverHashes = captureInputs(sources);
  const compiled = evaluatedModules(driverHashes, rewrite);
  const traces = [];
  for (const [name, steps] of scenarios) {
    if (!only || name === only) traces.push(await runScenario(compiled, name, steps));
  }
  return checkTraces({model:'ReadReplyLease', sources, driverHashes, traces, scope:'bounded-component', assumptions:[
    'Evaluate the actual adapter card, lease and connection-binding methods from captured source bytes.',
    'The shell commit scheduler, approved receipt, agent result and voice callback are controlled ports. The replay does not exercise network, native device actions, voice playback or Cloud credential IO.',
  ]});
}
