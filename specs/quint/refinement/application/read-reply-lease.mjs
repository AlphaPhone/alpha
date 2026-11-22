import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {extname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {captureInputs, checkTraces} from '../check-traces.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const self = fileURLToPath(import.meta.url);
const adapterPath = 'apps/app/src/prototype/agent-adapter.ts';
const connectionPath = 'apps/app/src/runtime/connection-ui.tsx';
const documentsPath = 'apps/app/src/browser/documents.ts';
const sourcePaths = [adapterPath, connectionPath, 'package.json', 'bun.lock', 'upstream.lock.json'];
const session = {sessionId:'reader-session', ownerId:'reader-owner', agentId:'reader-agent', origin:'https://reader.invalid'};
const origin = {version:1, requestId:'read-request', conversationId:'read-conversation', inReplyTo:'original-question'};
const proposalId = 'read-proposal';
const digest = 'a'.repeat(64);
const hint = {...origin, proposalId, digest};
const reply = {...origin, messageId:'read-answer', text:'Synthetic approved answer'};

async function compileModules(extraSources, rewrite) {
  const sources = [...sourcePaths, self, ...extraSources];
  const compilerHashes = {};
  const modelAndDriverHashes = captureInputs(sources);
  const {outputFiles} = await build({
    absWorkingDir: root,
    entryPoints: [adapterPath],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    globalName: 'readReplyModule',
    jsx: 'automatic',
    loader: {'.svg': 'text', '.html': 'text', '.css': 'empty'},
    define: {'import.meta.env': '{"DEV":false,"VITE_ELIZA_DEV_ALLOW_TEST_MOCKS":""}'},
    plugins: [{name:'observe-read-reply', setup(builder) {
      builder.onLoad({filter:/\.(?:[cm]?[jt]sx?|json|css|svg|html)$/}, ({path}) => {
        const source = relative(root, path);
        if (!source.startsWith('apps/app/') && !source.startsWith('.eliza/client-features/')) return;
        const bytes = readFileSync(path);
        compilerHashes[path] = createHash('sha256').update(bytes).digest('hex');
        let contents = bytes.toString('utf8');
        if (source === adapterPath) {
          const observed = '  function recoverPendingActions(';
          assert.equal(contents.split(observed).length, 2, 'One observer site inside the installed adapter');
          if (rewrite) {
            const next = rewrite(contents);
            assert.notEqual(next, contents, 'The mutation changes the actual adapter');
            contents = next;
          }
          contents = contents.replace(observed, `  globalThis.readReplyFixture.observeAdapter({retainReadReply,proposalCard,completeReadReply,context});\n${observed}`);
        } else if (source === connectionPath) {
          // Initialize only this test window's verified state and defer the external receipt.
          // The controller's actual binding, completion and cancellation methods stay installed.
          contents += `\nglobalThis.readReplyFixture.observeConnection((ports) => {
            state = {...state, session: ports.session,
              ...(ports.readChoice ? {phoneActionsAvailable:true, history:{revision:"fixture-initial"}} : {})};
            active = {kind:'resident', origin:ports.session.origin, actions:ports.actions, remote:ports.remote};
            conversationMemory.set(conversationKey(ports.session), ports.conversationId);
            connectionController.approvePendingAction = ports.approve;
            return {controller:connectionController, retire(){epoch++;}, history(revision){
              state = {...state, history:{revision}};
            }};
          });`;
        } else if (source === documentsPath) {
          contents += `\nglobalThis.readReplyFixture.observeDocuments(browserDocuments);`;
        }
        const extension = extname(path).substring(1);
        const assetLoader = {css:'empty', svg:'text', html:'text'};
        return {contents, loader:assetLoader[extension] ?? extension.replace(/^[cm](?=[jt]s$)/, '')};
      });
    }}],
  });
  for (const source of [adapterPath, connectionPath]) {
    assert.equal(compilerHashes[resolve(root, source)], modelAndDriverHashes[resolve(root, source)]);
  }
  sources.push(...Object.keys(compilerHashes));
  return {script:new Script(outputFiles[0].text, {filename:'read-reply-fixture.js'}), sources,
    driverHashes:{...modelAndDriverHashes, ...compilerHashes}};
}

async function withInstalledModules(script, ports, run) {
  const dom = new JSDOM('', {url:session.origin, runScripts:'outside-only', pretendToBeVisual:true});
  let adapter, connect, documents;
  const network = [];
  function refuseNetwork() { network.push('Unexpected network access'); throw Error(network.at(-1)); }
  Object.assign(dom.window, {
    TextEncoder, TextDecoder, structuredClone, AbortController, AbortSignal,
    fetch:refuseNetwork, XMLHttpRequest:refuseNetwork, WebSocket:refuseNetwork,
    readReplyFixture:{observeAdapter(value) { adapter = value; }, observeConnection(value) { connect = value; },
      observeDocuments(value) { documents = value; }},
  });
  try {
    script.runInContext(dom.getInternalVMContext());
    if (ports.readChoice) documents.read = ports.readChoice;
    class Shell {}
    dom.window.readReplyModule.installAgentAdapter(Shell, {notes:{}});
    return await run({adapter, connection:connect({...ports, remote:{request:refuseNetwork}}), shell:new Shell()});
  } finally {
    dom.window.close();
    assert.deepEqual(network, []);
  }
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

async function runScenario(script, name, steps) {
  const approval = deferred(), completion = deferred(), completeCalls = [], cancelCalls = [], resumed = [];
  let taps = 0, approving, heldCommit, deferCommit = false, approvalSignal, approveCalls = 0, retired = false;
  const ports = {
    session, conversationId:origin.conversationId,
    approve(id, receivedContext, signal) {
      assert.equal(id, proposalId);
      assert.equal(receivedContext.view, 'notes');
      assert.equal(receivedContext.sensitive, false);
      assert.equal(++approveCalls, 1, 'One approval can reach the supplied device port');
      approvalSignal = signal;
      return approval.promise;
    },
    actions: {
      // Real DeviceActions always carry their credential; no Notes list-filter capability keeps the filter unavailable.
      credential: {capabilities: []},
      completeReadReply(value, signal) {
        assert.deepEqual(structuredClone(value), hint);
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
  };
  return withInstalledModules(script, ports, async ({adapter, connection, shell}) => {
    const controller = connection.controller;
    const proposal = {id:proposalId, title:'Reviewed note read', description:'Read the reviewed fixture note',
      expiresAt:Date.now() + 600_000, privateNotesRead:true, readReply:{origin, digest}};
    const card = {...adapter.proposalCard(proposal), recovered:true, proposalSession:session};
    const initial = {view:'notes', msgs:[{id:'review-card', from:'agent', card}]};
    Object.assign(shell, {
      live:true, state:initial, notesSourceMode:'canonical',
      S() { return this.state; },
      vget() { return {list:[]}; },
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
        assert.deepEqual(structuredClone(value), hint);
        assert.deepEqual(structuredClone(answer), reply);
        resumed.push(answer.messageId);
      },
      agentSay() {}, toast() {},
    });
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
      for (const message of answers) assert.deepEqual(structuredClone(message), {
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
    const mark = (name, ...args) => {
      const expect = observe();
      const action = {name, args};
      // The real card refreshes context in finally, after the receipt and completion paths settle.
      const reconcilesRetirement = retired && (name === 'receipt' || name === 'completionSettles');
      trace.steps.push({label:name, action:reconcilesRetirement ? [action, {name:'retireStaleLease'}] : action, expect});
    };
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
        retired = true;
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
  });
}

async function runRecoveredScenario(script, name) {
  const requests = [], approvals = [], completions = [], resumed = [], cancellations = [];
  const approval = deferred(), completion = deferred();
  const proposal = {id:proposalId, title:'Recovered note read', description:'Read the reviewed fixture note',
    expiresAt:Date.now() + 600_000, privateNotesRead:true, readReply:{origin, digest}};
  const question = {id:origin.inReplyTo, from:'user', text:'What is in the reviewed note?',
    messageBinding:{conversationId:origin.conversationId, session}};
  const selectionKey = JSON.stringify([session.origin, session.ownerId, session.agentId]);
  const choice = {version:1, legacy:null, value:JSON.stringify({raw:JSON.stringify({
    [selectionKey]:{id:origin.conversationId, revision:'fixture-choice'},
  })})};
  const ports = {
    session, conversationId:origin.conversationId,
    async readChoice(key, signal) {
      assert.equal(key, 'alpha.connection.conversations.v1');
      signal?.throwIfAborted();
      return {revision:'fixture-document', raw:JSON.stringify(choice)};
    },
    approve(id, context, signal) {
      assert.equal(id, proposalId);
      assert.equal(context.view, 'notes');
      assert.equal(context.sensitive, false);
      assert.equal(signal.aborted, false);
      approvals.push(id);
      return approval.promise;
    },
    actions: {
      // Real DeviceActions always carry their credential; no Notes list-filter capability keeps the filter unavailable.
      credential: {capabilities: []},
      pending(context, signal) {
        assert.equal(context.view, 'notes');
        assert.equal(context.sensitive, false);
        const result = deferred();
        requests.push({result, signal});
        return result.promise;
      },
      completeReadReply(value, signal) {
        assert.deepEqual(structuredClone(value), hint);
        assert.equal(signal.aborted, false);
        completions.push(value);
        return completion.promise;
      },
      async cancelReadReply(id) { cancellations.push(id); },
    },
  };
  return withInstalledModules(script, ports, async ({adapter, connection, shell}) => {
    const missing = name === 'recover exact original';
    Object.assign(shell, {
      live:true, state:{view:'notes', msgs:missing ? [] : [question]}, notesSourceMode:'canonical',
      S() { return this.state; },
      vget() { return {list:[]}; },
      setState(update, done) {
        const patch = typeof update === 'function' ? update(this.state) : update;
        if (patch) this.state = {...this.state, ...patch};
        done?.();
      },
      resumeReadReplyVoice(value, answer) {
        assert.deepEqual(structuredClone(value), hint);
        assert.deepEqual(structuredClone(answer), reply);
        resumed.push(answer.messageId);
      },
      agentSay() {}, toast() {},
    });
    const lease = () => shell.readReplyLeases?.get(proposalId);
    const cards = () => shell.S().msgs.filter(message => message.card?.proposalId === proposalId);
    const binding = {connectionEpoch:0, conversationId:origin.conversationId, session};
    const observe = () => {
      const answers = shell.S().msgs.filter(message => message.id === reply.messageId);
      for (const message of answers) {
        assert.equal(message.inReplyTo, question.id);
        assert.deepEqual(structuredClone(message.messageBinding), question.messageBinding);
      }
      return {'s.lease':lease()?.phase ?? 'none', 's.bindingCurrent':connection.controller.voiceConversationCurrent(binding, false),
        's.approval':shell.pendingActionApproval ? 'running' : 'none',
        's.completions':completions.length + Number(completions.length > 0 && !shell.pendingActionApproval),
        's.answers':answers.length, 's.voiceResumed':resumed.length, 's.taps':approvals.length, 's.cancelRequests':cancellations.length};
    };
    const trace = {name, expect:observe(), steps:[]};
    const point = (label, action) => trace.steps.push({label, action, expect:observe()});
    const request = async () => {
      const before = requests.length;
      connection.history('fixture-history-' + (before + 1));
      adapter.context(shell);
      await flush();
      assert.equal(requests.length, before + 1, 'Current shell context reads the authenticated pending port');
      return requests.at(-1);
    };
    const recover = async originalCurrent => {
      const pending = await request();
      assert.equal(pending.signal.aborted, false);
      pending.result.resolve([proposal]);
      await flush();
      assert.equal(cards().length, 1, 'The real recovery route publishes one card');
      assert.equal(cards()[0].card.recovered, true);
      assert.deepEqual(structuredClone(cards()[0].card.proposalSession), session);
      point('Pending list applies with original current = ' + originalCurrent, {name:'recover', args:[originalCurrent]});
    };
    if (missing) {
      await recover(false);
      assert.equal(lease(), undefined, 'The card alone cannot mint a completion lease');
      const wrongOwner = {...session, ownerId:'different-fixture-owner'};
      shell.setState(previous => ({msgs:[{...question, messageBinding:{...question.messageBinding, session:wrongOwner}}, ...previous.msgs]}));
      await recover(false);
      assert.equal(lease(), undefined, 'A matching message id from the wrong owner still cannot mint the lease');
      shell.setState(previous => ({msgs:[question, ...previous.msgs.slice(1)]}));
      await recover(true);
      assert.equal(lease()?.phase, 'pending');
      assert.deepEqual(structuredClone(lease().origin), origin);
      assert.equal(approvals.length, 0);
      return trace;
    }
    if (name === 'retire held pending read') {
      const pending = await request();
      connection.retire();
      point('The selected connection epoch changes while the read waits', {name:'bindingChanged'});
      pending.result.resolve([proposal]);
      await flush();
      assert.equal(lease(), undefined);
      assert.equal(cards().length, 0);
      point('Stale pending response cannot admit a lease or card', {name:'recover', args:[true], reject:true});
      return trace;
    }

    await recover(true);
    const originalLease = lease();
    assert.equal(originalLease?.phase, 'pending');
    await recover(true);
    assert.equal(lease(), originalLease, 'Fresh pending list preserves the exact active lease');
    const approving = shell.cardAct(cards()[0]);
    await flush();
    assert.deepEqual(approvals, [proposalId]);
    point('The actual recovered card enters approval', {name:'approveTap'});
    approval.resolve({proposalId, status:'succeeded', summary:'Reviewed read', readReply:hint});
    await flush();
    assert.equal(completions.length, 1);
    point('The recovered approval starts its owned answer', {name:'receipt', args:[true]});
    completion.resolve(reply);
    await approving;
    point('The answer is inserted once for its original turn', {name:'completionSettles', args:[true]});
    await recover(true);
    assert.equal(lease(), originalLease);
    assert.equal(lease()?.phase, 'done');
    assert.equal(cards()[0].card.done, true);
    assert.equal(await adapter.completeReadReply(shell, {proposalId, status:'succeeded', summary:'Reviewed read', readReply:hint}), false);
    assert.equal(completions.length, 1);
    assert.equal(approvals.length, 1);
    assert.deepEqual(resumed, [reply.messageId]);
    point('Recovered redelivery cannot trigger another completion', {name:'duplicateCompletion'});
    return trace;
  });
}

export async function checkReadReplyLease(extraSources = [], {rewrite, only} = {}) {
  const {script, sources, driverHashes} = await compileModules(extraSources, rewrite);
  const traces = [];
  for (const [name, steps] of scenarios) {
    if (!only || name === only) traces.push(await runScenario(script, name, steps));
  }
  if (!only) {
    for (const name of ['recover exact original', 'redeliver settled recovery', 'retire held pending read']) {
      traces.push(await runRecoveredScenario(script, name));
    }
  }
  return checkTraces({model:'ReadReplyLease', sources, driverHashes, traces, scope:'bounded-component', assumptions:[
    'Compile and execute the whole agent adapter, connection controller and their runtime imports in an isolated DOM with test mocks disabled.',
    'The recovered-card cases use real context and pending-list admission with a synthetic saved conversation document. The original-turn identity and stale read are observed before any completion.',
    'The test window supplies synthetic verified connection state, a controlled approval receipt, agent results, the shell commit scheduler and a voice callback. It does not exercise device approval execution, native voice playback or Cloud credential IO.',
  ]});
}
