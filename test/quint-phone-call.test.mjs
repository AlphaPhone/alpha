// Partial source contract regression evidence. Original schedules, actions and assertions are retained.
// Only the selected source members/components and controlled ports execute; this is not whole-file refinement.
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import {after as afterPartialContract} from 'node:test';
import partialContractAssert from 'node:assert/strict';
import {fileURLToPath as partialContractFile} from 'node:url';
import {captureReplayClosure as capturePartialClosure} from '../specs/quint/refinement/observed-replay.mjs';
import {captureInputs as capturePartialInputs} from '../specs/quint/refinement/check-traces.mjs';
const partialContractInputs = capturePartialClosure([partialContractFile(import.meta.url)]);
afterPartialContract(() => partialContractAssert.deepEqual(capturePartialInputs(Object.keys(partialContractInputs)), partialContractInputs));

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {modelTraces, replay} from '../specs/quint/refinement/application/shell-model-traces.mjs';
import {shellCore} from '../specs/quint/refinement/application/shell-core-fixture.mjs';
import {tsImport} from './support/ts-import.mjs';
const commsBar = await tsImport(new URL('../apps/app/src/runtime/comms-bar.ts', import.meta.url).pathname, import.meta.url);
const telephonyPresenters = await tsImport(new URL('../apps/app/src/prototype/telephony-presenters.ts', import.meta.url).pathname, import.meta.url);

// PhoneCall traces from the simulator, replayed on the development Phone fixture itself: the
// module-level call latch, pnStart/pnEnd/pnDecline and the registered view's render, back,
// onLeave, preset and hang-up action, taken from prototype/model.js and run on the shell's own
// view switching and timer groups. State patches made inside one handler are applied together
// when it returns, as React applies them, and the view renders after every step while it is in
// front. The fixture's people and recents are stand-in seeds; nothing places a call.
const model = readFileSync('apps/app/src/prototype/model.js', 'utf8');
const from = model.indexOf('\nvar PN = {'), registered = model.indexOf('\nregisterView("phone", {', from);
const to = model.indexOf('\n});\n', registered) + 5;
assert.ok(from >= 0 && registered > from && to > registered, 'the Phone fixture source');
const phoneSource = model.slice(from, to);
// The shell's own test for a tap that ends a gesture.
const swallowed = model.match(/\n  swallowed\(\) \{ (return [^\n]+;) \}\n/);
assert.ok(swallowed, 'the shell swallowed() source');
// AP-16: the owner's tap on a proposal card (Component.cardAct), outside the shell core's range.
const cardActFrom = model.indexOf('\n  cardAct(m) {'), cardActTo = model.indexOf('\n  startVoice() {', cardActFrom);
assert.ok(cardActFrom >= 0 && cardActTo > cardActFrom, 'the shell cardAct() source');
const cardAct = model.slice(cardActFrom, cardActTo);
const PEOPLE = [{id: 'ada', name: 'Ada Lovelace', first: 'Ada', ini: 'AL', phone: '(415) 555-0101'}];
const SEEDS = [{id: 's1', pid: 'ada', num: '', dir: 'out', ago: 5}, {id: 's2', pid: null, num: '555', dir: 'out', ago: 9}];

function fixture() {
  const views = {contacts: {state: {list: null}}};
  const core = shellCore({views, globals: {
    ...commsBar,
    ...telephonyPresenters,
    testMocksEnabled: true,
    registerView: (key, definition) => { views[key] = definition; },
    PN_SCRIPT: {_: {lines: [], sum: ''}}, PN_REC: SEEDS, PN_VM: [], PN_SCREEN: [['alpha', 'One moment.']], PN_REPLIES: [],
    copy: () => ({presetPerson: 'ada'}), PEOPLE, person: id => PEOPLE.find(person => person.id === id) || null,
    formatTime: () => 'now', formatMonthDay: () => 'day', DAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pad2: value => String(value).padStart(2, '0'), crypto: {randomUUID},
  }});
  core.run(`${phoneSource}\nShell.prototype.swallowed = function () { ${swallowed[1]} };\nObject.assign(Shell.prototype, {${cardAct}});`);
  // After each committed update, as componentDidUpdate does: a closed chat ends the stage history
  // (D11) and an emergency card lowers a full chat (AC-19).
  core.Shell.prototype.componentDidUpdate = function () { this.settleStageSession(); this.keepEmergencyLayout(); };
  const {PN} = core.context, phone = views.phone;
  // One handler's patches settle together after it returns.
  let queue = null;
  const settleNow = core.Shell.prototype.setState;
  core.Shell.prototype.setState = function (patch, done) {
    if (queue) queue.push([patch, done]); else settleNow.call(this, patch, done);
  };
  const shell = new core.Shell({});
  let shown = null;
  const settle = run => {
    queue = [];
    let settledPatches = 0;
    // No return in finally: an exception from the handler must reach the test.
    try { run(); } finally {
      const pending = queue; queue = null;
      settledPatches = pending.length;
      for (const [patch, done] of pending) settleNow.call(shell, patch, done);
    }
    return settledPatches > 0;
  };
  // A state change redraws the view while it is in front; its render arms the start of a handed-over call.
  const act = run => {
    if (settle(run)) settle(() => { shown = shell.S().view === 'phone' ? phone.render(shell.vget('phone'), shell.api('phone')) : null; });
  };
  act(() => shell.preset('phone'));
  const patchFor = id => id.startsWith('#') ? {call: null, num: id.slice(1)} : {call: id, num: ''};
  const control = label => shown.controls.find(item => label.test(item.label));
  return {
    pickTab: index => act(() => shown.tabs[index].pick()),
    apply({action, picks}, before) {
      if (action === 'keypadCall') { act(() => shell.api('phone').set({dial: picks.hasDigit ? '555' : '*#'})); act(() => shown.dialCall()); }
      else if (action === 'callFrom') act(() => shown.recents.find(row => row.label === (picks.id === 'ada' ? 'Call Ada Lovelace' : 'Call 555')).call());
      else if (action === 'openCall') {
        const patch = {...patchFor(picks.target ?? picks.id), ...(picks.ret ? {ret: {view: 'contacts', patch: {open: 'ada'}}} : {})};
        if (before.active) act(() => shell.openView('phone', patch));
        else { act(() => shell.openView('contacts', {keepState: true})); act(() => shell.api('contacts').open('phone', patch)); }
      }
      else if (action === 'bootStart') act(() => core.fire(0));
      else if (action === 'leave') act(() => shell.goHome());
      else if (action === 'reopen') act(() => shell.openView('phone', {keepState: true}));
      else if (action === 'connect') act(() => core.fire(2400));
      else if (action === 'toggleHold') act(() => control(/^(Hold|Resume)$/).toggle());
      else if (action === 'openKeypad') act(() => control(/^Show keypad$/).toggle());
      else if (action === 'back') act(() => assert.equal(phone.back(shell.vget('phone'), shell.api('phone')), true));
      else if (action === 'hangUp') act(() => before.active ? shown.endCall() : phone.actions.hangup(null, shell.api('phone')));
      else if (action === 'presetIncoming') act(() => shell.preset('phone:incoming'));
      else if (action === 'presetCall') act(() => shell.preset('phone:call'));
      else if (action === 'accept') act(() => shown.accept());
      else if (action === 'decline') act(() => shown.decline());
      else if (action === 'propose') {
        const target = patchFor(picks.target ?? picks.id);
        act(() => shell.propose({id: 'call:' + randomUUID(), kind: 'call', title: 'Call', detail: '', button: 'Call', acts: true,
          act: {mod: 'phone', fn: 'callApproved'}, args: {pid: target.call, num: target.num}}, 'Call?'));
      }
      else if (action === 'approve') act(() => shell.cardAct(shell.S().msgs.findLast(m => m.card?.type === 'proposal' && m.card.state === 'open')));
      else if (action === 'resize') act(() => shell.setState({chat: {closed: 'input', open: 'sheet', full: 'full'}[picks.h]}));
      else if (action === 'voiceTurn') act(() => shell.setState({voice: (picks.on ?? picks.hasDigit) ? 'listening' : 'off'}));
      else assert.fail(`unmapped action ${action}`);
    },
    observe() {
      const st = shell.vget('phone'), added = st.recents.filter(row => !SEEDS.includes(row));
      const rings = added.filter(row => row.dir === 'missed').length;
      return {live: PN.live || '', want: core.context.pnWant(st) || '', callWho: st.callWho || '', bootFor: PN.boot || '', boot: core.pending(0),
        active: shell.S().view === 'phone', connected: !!st.liveAt, min: !!st.min, kp: !!st.kp, hold: !!st.hold,
        connecting: core.pending(2400), ticking: core.pending(1000, 'interval'), ret: st.ret ? st.ret.view : '',
        incoming: !!st.incoming, ended: added.length - rings, ringRows: rings,
        proposal: (open => open ? (open.card.args.pid || '#' + open.card.args.num) : '')(shell.S().msgs.findLast(m => m.card?.type === 'proposal' && m.card.state === 'open')),
        approvals: shell.S().msgs.filter(m => m.card?.type === 'proposal' && m.card.state === 'done').length,
        chat: {input: 'closed', hidden: 'closed', sheet: 'open', full: 'full'}[shell.S().chat], voice: shell.S().voice !== 'off', staged: (shell.S().stageFrom || []).length,
        // AC-18: where the shell draws End for Phone's own bar right now (comms-bar endPlacement).
        endAt: shell.S().view === 'phone' ? commsBar.endPlacement(shell.commsSpec('phone'), shell.S().chat === 'hidden' ? 'input' : shell.S().chat, shell.S().voice !== 'off') : 'none'};
    },
  };
}

/** PhoneCall.qnt endAt over a trace state (the same definition, read off the state's fields). */
function modelEndAt(s) {
  const emergency = id => id === '#911', live = s.live !== '' && emergency(s.live);
  const card = s.active && s.want !== '' && !s.min && !s.incoming && (emergency(s.want) || live);
  const shown = card || (s.active && s.incoming && live);
  const bar = s.active && (s.incoming ? s.live !== '' && s.callWho !== '' : s.want !== '' && !s.min);
  if (!bar) return 'none';
  if (s.voice) return 'voice';
  if (s.chat === 'full') return shown ? 'none' : 'strip';
  if (s.chat === 'open') return 'card';
  return shown ? 'card' : 'bar';
}

test("partial source contract: simulated PhoneCall traces agree with the Phone fixture after every step", {timeout: scaledTimeout(180000)}, async () => {
  const traces = modelTraces({module: 'PhoneCall', traces: 300, steps: 30});
  const result = await replay(traces, {
    start: fixture,
    project: s => ({live: s.live, want: s.want, callWho: s.callWho, bootFor: s.bootFor, boot: s.bootTimers.length > 0, active: s.active, connected: s.connected,
      min: s.min, kp: s.kp, hold: s.hold, connecting: s.connectFor !== '', ticking: s.tickFor !== '', ret: s.ret,
      incoming: s.incoming, ended: s.ended, ringRows: s.ringRows,
      proposal: s.proposal, approvals: s.approvals, chat: s.chat, voice: s.voice, staged: s.staged, endAt: modelEndAt(s)}),
  });
  assert.deepEqual([...result.exercised].sort(), ['accept', 'approve', 'back', 'bootStart', 'callFrom', 'connect', 'decline', 'hangUp',
    'keypadCall', 'leave', 'openCall', 'openKeypad', 'presetCall', 'presetIncoming', 'propose', 'reopen', 'resize', 'toggleHold', 'voiceTurn']);
});

test("partial source contract: a call started or a tab picked while a handed-over call is armed leaves the next handover able to start", () => {
  const core = fixture();
  const step = (action, picks = {}, before = {active: true}) => core.apply({action, picks}, before);
  // Ada's call is armed, then a recents row starts another call before the armed start runs.
  step('openCall', {id: 'ada', ret: ''});
  assert.equal(core.observe().boot, true);
  step('callFrom', {id: '#555'});
  assert.deepEqual([core.observe().live, core.observe().boot, core.observe().bootFor], ['#555', false, '']);
  step('hangUp');
  step('openCall', {id: 'ada', ret: ''});
  assert.equal(core.observe().boot, true, 'the same party is armed again');
  step('bootStart');
  assert.equal(core.observe().live, 'ada');
  step('hangUp');
  // Picking a tab stops the view's timers; the handed-over call is armed again by the redraw.
  step('openCall', {id: '#555', ret: ''});
  core.pickTab(1);
  assert.deepEqual([core.observe().want, core.observe().boot], ['#555', true]);
  step('bootStart');
  assert.equal(core.observe().live, '#555');
});
