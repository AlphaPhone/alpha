import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Per-view decision logic of the shell model (prototype/model.js) and the Home card helpers,
// run from the shipped sources. No browser, provider or device access.
const model = readFileSync('apps/app/src/prototype/model.js', 'utf8');
const H = await import('../apps/app/src/prototype/home-cards.ts');

// Values built inside a vm context have that context's prototypes: compare them as plain data.
const same = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
/** Source of one top-level `function name(` or `var NAME =` declaration. */
function top(name) {
  const fn = model.indexOf(`\nfunction ${name}(`), start = fn >= 0 ? fn : model.indexOf(`\nvar ${name} =`);
  assert.ok(start >= 0, `${name} is declared at the top level`);
  const rest = model.slice(start + 1), end = rest.search(/\n(?=[^\s}])/);
  return rest.slice(0, end < 0 ? rest.length : end);
}
/** Source of one shell class method, as an object-literal method. */
function method(name) {
  const start = model.indexOf(`\n  ${name}(`);
  assert.ok(start >= 0, `${name} is a shell method`);
  const rest = model.slice(start + 1), end = rest.search(/\n  \}\n|\}\n(?=  \S)/);
  return rest.slice(0, rest.indexOf('\n', end + 1));
}
function load(names, globals = {}) {
  const ctx = vm.createContext({Date, Math, Object, String, Number, RegExp, JSON, parseInt, console, ...globals});
  const fns = names.filter(name => /^[a-z]/.test(name));
  vm.runInContext(names.map(top).join('\n') + `\nglobalThis.out={${fns.join(',')}};`, ctx);
  return Object.assign(ctx.out, {ctx});
}
/** A view api whose `set` is queued, like the shell's functional setState inside one event. */
function queued(key, initial, others = {}) {
  let state = {...initial}; const pending = [], log = {sets: [], toasts: [], bg: [], fg: [], stops: 0, bgStops: 0};
  const api = {
    name: 'Alpha', S: {stack: []}, isActive: () => true,
    get: other => other === key ? state : (others[other] || {}),
    set: patch => { pending.push(patch); log.sets.push(patch); },
    toast: (text, options) => log.toasts.push([text, options]),
    later: (fn, ms) => log.fg.push({fn, ms}), every: (fn, ms) => log.fg.push({fn, ms, every: true}),
    laterBg: (fn, ms) => log.bg.push({fn, ms}), everyBg: (fn, ms) => log.bg.push({fn, ms, every: true}),
    stop: () => { log.stops++; log.fg.length = 0; }, stopBg: () => { log.bgStops++; log.bg.length = 0; },
    open: (...args) => log.sets.push({open: args}), shell: () => {},
  };
  Object.defineProperty(api, 'st', {get: () => state});
  return {api, log, state: () => state, flush: () => { while (pending.length) state = {...state, ...pending.shift()}; }};
}

const PHONE = ['pnScript', 'pnDigits', 'pnFmt', 'pnCallId', 'pnWant', 'pnStart', 'pnEnd'];
const phone = () => load(PHONE, {PN: {live: null, boot: null, lastTab: 'recents'}, PN_SCRIPT: {}});

test('a number without a digit names no call: nothing starts and no call screen is asked for', () => {
  const P = phone(), h = queued('phone', {recents: [], call: null, num: '', callWho: null});
  for (const dialed of ['#', '*', '*#', '', null]) {
    assert.equal(P.pnCallId(null, dialed), null);
    assert.equal(P.pnWant({call: null, num: dialed}), null);
    P.pnStart(h.api, null, dialed);
  }
  assert.equal(P.ctx.PN.live, null);
  same(h.log.sets, []);
  same(h.log.bg, [], 'no call tick is scheduled');
  assert.equal(P.pnCallId(null, '*123#'), '#123');
  assert.equal(P.pnCallId('ana', '#'), 'ana');
  assert.equal(P.pnWant({call: null, num: '(415) 555-0100'}), '#4155550100');
  const dial = model.slice(model.indexOf('dialCall: function'), model.indexOf('vms: vms, noVms'));
  assert.match(dial, /if \(!pnDigits\(d\)\) return;[\s\S]*pnStart\(/, 'the keypad refuses a digit-less entry before starting');
});

test('calling the party already on the line returns to that call and keeps its clock', () => {
  const P = phone(), h = queued('phone', {recents: [], callWho: null});
  P.pnStart(h.api, 'ana', '');
  h.flush();
  const began = h.state().callAt, tick = h.log.bg.length;
  assert.equal(h.state().callWho, 'ana');
  h.api.set({liveAt: began + 1, min: true}); h.flush();
  h.log.sets.length = 0;
  P.pnStart(h.api, 'ana', '');
  h.flush();
  same(h.log.sets, [{min: false}]);
  assert.equal(h.state().callAt, began);
  assert.equal(h.state().liveAt, began + 1);
  same(h.state().recents, []);
  assert.equal(h.log.bg.length, tick, 'the running call keeps its timers');
  assert.equal(P.ctx.PN.live, 'ana');
});

test('a call that replaces another does not inherit the ended call\'s return target', () => {
  const P = phone(), h = queued('phone', {recents: [], callWho: null});
  P.pnStart(h.api, 'ana', '', {ret: {view: 'contacts', patch: {open: 'ana'}}});
  h.flush();
  same(h.state().ret, {view: 'contacts', patch: {open: 'ana'}});
  // Both patches are queued in one event: the ended call's state is still what get() returns.
  P.pnStart(h.api, 'ben', '');
  h.flush();
  assert.equal(h.state().callWho, 'ben');
  assert.equal(h.state().ret, null);
  assert.equal(h.state().recents.length, 1);
  assert.equal(h.state().recents[0].pid, 'ana');
  // A call started with nothing replaced still keeps a return target set just before it.
  const again = phone(), k = queued('phone', {recents: [], callWho: null, ret: {view: 'maps'}});
  again.pnStart(k.api, 'cy', ''); k.flush();
  same(k.state().ret, {view: 'maps'});
});

test('directions to the start point have a one-point route and still render their line', () => {
  const M = load(['MAPS_H', 'MAPS_V', 'MAPS_STREETS', 'mapsAddr', 'mapsLen', 'mapsStreet', 'mapsSteps', 'mapsVia'], {MAPS_FAR: []});
  const here = M.mapsAddr('300 Folsom St');
  assert.equal(here.pts.length, 1);
  assert.equal(M.mapsVia(here), 'via Folsom St');
  assert.equal(M.mapsVia({name: 'Nowhere', pts: [[1, 2]]}), '');
  const turn = M.mapsAddr('900 Valencia St');
  assert.ok(turn.pts.length > 1);
  assert.match(M.mapsVia(turn), /^via Folsom St( and .+)?$/);
  const maps = model.slice(model.indexOf('registerView("maps"'), model.indexOf('registerView("notes"'));
  assert.doesNotMatch(maps, /\.pts\[1\]/, 'the view never reads a second route point directly');
  assert.match(maps, /via: mapsVia\(dst\)/);
});

function toaster(clock) {
  const ctx = vm.createContext({Date: {now: () => clock.now}, Object});
  vm.runInContext(`${top('TOAST_MS')}\n${top('toastPlan')}\nglobalThis.shell={${method('toast')}};globalThis.toastPlan=toastPlan;`, ctx);
  const shell = ctx.shell;
  Object.assign(shell, {state: {toast: '', toastUndo: false}, timers: [], undoFn: null,
    setState(patch) { Object.assign(this.state, patch); },
    later(fn, ms, group) { this.timers.push({fn, ms, group, at: clock.now + ms}); },
    clear(group) { this.timers = this.timers.filter(timer => timer.group !== group); },
    /** Advances the clock and fires the timers that came due, in order. */
    advance(ms) {
      clock.now += ms;
      for (;;) { const due = this.timers.filter(timer => timer.at <= clock.now).sort((a, b) => a.at - b.at)[0]; if (!due) break; this.timers.splice(this.timers.indexOf(due), 1); due.fn(); }
    }});
  return {shell, toastPlan: ctx.toastPlan};
}

test('a plain toast interrupts an Undo toast without ending its window', () => {
  const clock = {now: 1000}, {shell, toastPlan} = toaster(clock), undo = () => {};
  shell.toast('Note deleted', {undo});
  same({...shell.state}, {toast: 'Note deleted', toastUndo: true});
  shell.advance(1000);
  shell.toast('Turn left onto 4th St');
  same({...shell.state}, {toast: 'Turn left onto 4th St', toastUndo: false});
  assert.equal(shell.undoFn, null, 'the plain toast carries no Undo action');
  shell.advance(1900);
  same({...shell.state}, {toast: 'Note deleted', toastUndo: true});
  assert.equal(shell.undoFn, undo, 'Undo is available again for the rest of its window');
  shell.advance(2099);
  assert.equal(shell.state.toastUndo, true);
  shell.advance(1);
  same({...shell.state}, {toast: '', toastUndo: false});
  assert.equal(shell.undoFn, null);
  // Too little of the window is left to return to: the plain toast simply ends it.
  shell.toast('Card removed', {undo});
  shell.advance(4000);
  shell.toast('Saved');
  shell.advance(1900);
  same({...shell.state}, {toast: '', toastUndo: false});
  assert.equal(shell.undoFn, null);
  // A new Undo toast replaces the held one, and asks for at most 30 s.
  same({...toastPlan({until: 9000}, {undo, ms: 12000}, 100)}, {undo: true, ms: 12000, until: 12100, resume: false});
  assert.equal(toastPlan(null, {undo, ms: 90000}, 0).ms, 5000);
  same({...toastPlan({until: 5000}, {}, 100)}, {undo: false, ms: 1900, until: 2000, resume: true});
  assert.equal(toastPlan({until: 1500}, {}, 100).resume, false);
  assert.equal(toastPlan(null, undefined, 100).resume, false);
  assert.match(model, /doUndo: function \(\) \{ var f = self\.undoFn; self\.undoFn = null; self\.undoHeld = null;/, 'using Undo ends the held window');
});

test('a model download finishes on background timers after Settings is left', () => {
  const S = load(['stDownloadModel']), h = queued('settings', {models: [{id: 'a', name: 'Small', pct: -1}, {id: 'b', name: 'Large', pct: -1}]});
  h.api.later = () => assert.fail('a view timer would be cancelled on leave');
  S.stDownloadModel(h.api, {id: 'a', name: 'Small'});
  h.flush();
  assert.equal(h.state().models[0].pct, 0);
  same(h.log.bg.map(timer => timer.ms), [450, 900, 1350, 1800, 2250]);
  for (const timer of [...h.log.bg]) { timer.fn(); h.flush(); }
  same(h.state().models.map(row => row.pct), [100, -1]);
  same(h.log.toasts.map(row => row[0]), ['Small ready']);
});

test('Undo puts back one item and keeps every later change', () => {
  const R = load(['restoreById', 'walRestoreCard', 'inboxUndo']);
  const a = {id: 1, subj: 'A', unread: true}, b = {id: 2, subj: 'B'}, c = {id: 3, subj: 'C'};
  // Changed in place (archived): its earlier copy replaces it; another archive since is kept.
  same(R.restoreById([{...a, arch: true, unread: false}, {...b, arch: true}, c], a, 0), [a, {...b, arch: true}, c]);
  // Removed: back at its old place, clamped to the list as it is now.
  same(R.restoreById([a, c], b, 1), [a, b, c]);
  same(R.restoreById([], b, 4), [b]);
  same(R.restoreById(undefined, b, -1), [b]);
  const before = [a, c], restored = R.restoreById(before, b, 1);
  same(before, [a, c], 'the current list is not mutated');
  assert.notEqual(restored, before);

  const h = queued('inbox', {mails: [a, b, c]});
  h.api.set({mails: [{...a, arch: true, unread: false}, b, c]}); h.flush();
  R.inboxUndo(h.api, 'A archived', now => ({mails: R.restoreById(now.mails, a, 0)}));
  h.api.set({mails: h.state().mails.map(mail => mail.id === 2 ? {...mail, del: true} : mail)}); h.flush();
  h.log.toasts[0][1].undo(); h.flush();
  same(h.state().mails, [a, {...b, del: true}, c]);
  const inbox = model.slice(model.indexOf('registerView("inbox"'), model.indexOf('/* ===== module: calendar ===== */'));
  assert.doesNotMatch(inbox, /inboxUndo\(api, [^;]*\{ mails: snap \}/, 'no archive Undo restores a whole-list snapshot');
  assert.equal((inbox.match(/restoreById\(now/g) || []).length, 2);

  const visa = {id: 'v', def: true}, amex = {id: 'x', def: false}, debit = {id: 'd', def: false};
  // The default went to the last card on removal; Undo gives it back.
  same(R.walRestoreCard([amex, {...debit, def: true}], visa, 0, 'd'), [visa, amex, debit]);
  // A default chosen since stays, and a card added since is kept.
  const added = {id: 'n', def: false};
  same(R.walRestoreCard([{...amex, def: true}, debit, added], visa, 0, 'd'), [{...visa, def: false}, {...amex, def: true}, debit, added]);
  same(R.walRestoreCard([visa, debit], amex, 1, null), [visa, amex, debit]);
  same(R.walRestoreCard([], visa, 0, null), [visa]);
  const wallet = model.slice(model.indexOf('registerView("wallet"'), model.indexOf('registerView("workflows"'));
  assert.doesNotMatch(wallet, /undo: function \(\) \{ api\.set\(\{ cards: before \}\)/);
});

test('leaving a view clears the flags only its cancelled timers would clear', () => {
  const L = load(['latchPatch']);
  assert.equal(L.latchPatch({busy: null, running: false}, ['busy', 'running']), null);
  assert.equal(L.latchPatch(undefined, ['busy']), null);
  same({...L.latchPatch({busy: 'upd', page: 'about'}, ['busy'])}, {busy: null});
  same({...L.latchPatch({running: {id: 1, i: 0}, typing: 'ana'}, ['running', 'typing'])}, {running: null, typing: null});
  const view = name => { const start = model.indexOf(`registerView("${name}"`); return model.slice(start, model.indexOf('\n  render: function', start)); };
  assert.match(view('settings'), /onLeave: function \(api\) \{[^\n]*latchPatch\([^\n]*\["busy"\]\)/);
  assert.match(view('workflows'), /onLeave: function \(api\) \{[^\n]*latchPatch\([^\n]*\["running"\]\)/);
  assert.match(view('browser'), /onLeave: function \(api\) \{[^\n]*st\.confirm \? null : latchPatch\(st, \["ag"\]\)/);
  assert.match(view('messages'), /onLeave: function \(api\) \{[\s\S]*latchPatch\(st, \["typing"\]\)/);
});

test('leaving Notes clears playback, dictation and processing flags with their timers', () => {
  const region = model.slice(model.indexOf('function notesFind('), model.indexOf('function notesStartRec('));
  const cleared = [], ctx = vm.createContext({NT: {playI: 7, dicI: 8}, clearInterval: id => cleared.push(id), Object});
  vm.runInContext(region + '\nglobalThis.notesAway=notesAway;', ctx);
  const api = state => ({get: () => state});
  same({...ctx.notesAway(api({list: [], open: 'n1', playing: true, dict: false, proc: null}))}, {playing: false, dict: false, proc: null});
  same(cleared, [7, 8]);
  same({...ctx.notesAway(api({list: [], open: 'n1', dict: true}))}, {playing: false, dict: false, proc: null});
  same({...ctx.notesAway(api({list: [], open: 'n1', proc: 'n1'}))}, {playing: false, dict: false, proc: null});
  assert.equal(ctx.notesAway(api({list: [], open: 'n1', playing: false, dict: false, proc: null})), null, 'an idle note stays as it is');
  const blank = ctx.notesAway(api({list: [{id: 'b', kind: 'text', title: '', body: ''}], open: 'b', blankCreationId: 'b', playing: true}));
  assert.equal(blank.open, null);
  assert.equal(blank.playing, false);
  same([...blank.list], []);
});

test('contacts have one section per letter: accents fold, everything else is under # at the end', () => {
  const C = load(['ctGet', 'ctLetter', 'ctGroups', 'ctSave'], {CT_SEED: []});
  same(['Émile', 'ángel', ' Zed', 'Øyvind', '42 Taxi', '', undefined, '李雷'].map(C.ctLetter), ['E', 'A', 'Z', '#', '#', '#', '#', '#']);
  const people = ['Frank', 'Émile', '42 Taxi', 'Dana', 'Élodie', 'Zed', 'Ángel', '李雷', 'Erin', 'Øyvind'].map((name, id) => ({id, name}));
  const groups = C.ctGroups(people), letters = groups.map(group => group.letter);
  same(letters, ['A', 'D', 'E', 'F', 'Z', '#']);
  assert.equal(new Set(letters).size, letters.length, 'no header repeats');
  same(groups[2].people.map(person => person.name), ['Élodie', 'Émile', 'Erin'].sort((a, b) => a.localeCompare(b)));
  assert.equal(groups.at(-1).people.length, 3);
  assert.equal(groups.reduce((count, group) => count + group.people.length, 0), people.length);
  same(C.ctGroups([]), []);
  assert.equal(people[0].name, 'Frank', 'the input order is not changed');

  // Saving an edit of a contact deleted meanwhile saves nothing and says so.
  const h = queued('contacts', {list: [{id: 'a', name: 'Ana'}], edit: 'gone', form: {first: 'Ghost'}, open: 'gone'});
  assert.equal(C.ctSave(h.api), false);
  h.flush();
  same(h.state().list, [{id: 'a', name: 'Ana'}]);
  assert.equal(h.state().edit, null);
  assert.equal(h.state().open, null);
  same(h.log.toasts.map(row => row[0]), ['This contact was deleted']);
});

function opener(state, views = {maps: {}, camera: {}, photos: {}, notes: {}}) {
  const ctx = vm.createContext({Object, isMvpView: () => true, VIEWS: views});
  vm.runInContext(`globalThis.shell={${method('secureAdmits')},\n${method('vpatch')},\n${method('openView')}};`, ctx);
  const log = {left: 0, toasts: [], patches: [], resets: []};
  Object.assign(ctx.shell, {
    S: () => state, setState: patch => Object.assign(state, patch), leave: () => log.left++, toast: text => log.toasts.push(text),
    vset: (key, patch) => log.patches.push([key, patch]), vreset: (key, patch) => log.resets.push([key, patch]), vget: key => (state.vs || {})[key] || {},
    mod: key => views[key] || {}, api: key => ({key}), defaultChat: () => 'hidden', homeHint() {},
  });
  return {shell: ctx.shell, log, secureAdmits: (secure, key) => ctx.shell.secureAdmits(secure, key)};
}

test('the lock screen\'s camera session cannot reach another view by any open route', () => {
  const {secureAdmits} = opener({});
  same(['camera', 'photos', 'wallet', 'maps', 'notes', undefined].map(key => secureAdmits(true, key)), [true, true, true, false, false, false]);
  assert.equal(secureAdmits(false, 'maps'), true);
  for (const [patch, options] of [[null, {keepState: true}], [{keepState: true}, undefined], [null, {keepStack: true, restore: true}], [{query: 'cafe'}, undefined]]) {
    const state = {secure: true, screen: 'home', view: 'camera', stack: ['camera']}, h = opener(state);
    h.shell.openView('maps', patch, null, options);
    same([state.screen, state.view, state.secure, state.stack], ['lock', null, false, []], JSON.stringify([patch, options]));
    same(h.log.toasts, ['Unlock to continue']);
    assert.equal(h.log.left, 1);
    same(h.log.patches, []);
  }
  const state = {secure: true, screen: 'home', view: 'camera', stack: []}, h = opener(state);
  h.shell.openView('photos', null, null, {keepState: true});
  same([state.screen, state.view, state.secure], ['home', 'photos', true]);
  const open = {secure: false, screen: 'home', view: 'notes', stack: []}, plain = opener(open);
  plain.shell.openView('maps', null, null, {keepState: true});
  assert.equal(open.view, 'maps');
});

test('a patch that moves a recording camera to another mode ends the recording first', () => {
  const C = load(['camModeEndsRec']);
  assert.equal(C.camModeEndsRec({rec: true, mode: 'video'}, {mode: 'photo', front: true}), true);
  assert.equal(C.camModeEndsRec({rec: true, mode: 'video'}, {mode: 'scan'}), true);
  assert.equal(C.camModeEndsRec({rec: true, mode: 'video'}, {mode: 'video'}), false);
  assert.equal(C.camModeEndsRec({rec: true, mode: 'video'}, {front: true}), false);
  assert.equal(C.camModeEndsRec({rec: false, mode: 'video'}, {mode: 'photo'}), false);
  assert.equal(C.camModeEndsRec({rec: true}, null), false);
  // The shell hands an outside patch to the view before applying it, while the view's state is kept.
  const order = [], camera = {ongoing: st => st.rec ? {} : null, incoming: (st, patch, api) => order.push(['incoming', st.rec, patch.mode, api.key])};
  const state = {secure: false, screen: 'home', view: null, stack: [], vs: {camera: {rec: true, mode: 'video'}}}, h = opener(state, {camera});
  h.shell.vset = (key, patch) => order.push(['set', key, patch.mode]);
  h.shell.openView('camera', {mode: 'photo'});
  same(order, [['incoming', true, 'photo', 'camera'], ['set', 'camera', 'photo']]);
  same(h.log.resets, [], 'a recording camera is not reset');
  const view = model.slice(model.indexOf('registerView("camera"'), model.indexOf('registerView("photos"'));
  assert.match(view, /incoming: function \(st, patch, api\) \{ if \(camModeEndsRec\(st, patch\)\) camStopRec\(api\); \}/);
});

test('Schedule shows today whatever day a deep link left; the menu and delete sheet exclude each other', () => {
  const K = load(['calSelectedDay', 'calMenuToggle', 'calDeleteAsk'], {calendarView: view => ['schedule', 'day', 'week', 'month'].includes(view) ? view : 'day'});
  assert.equal(K.calSelectedDay({view: 'schedule', day: 1}), 0);
  assert.equal(K.calSelectedDay({view: 'schedule', day: 3, open: 'e1'}), 3, 'an open event keeps its own day');
  assert.equal(K.calSelectedDay({view: 'day', day: 2}), 2);
  assert.equal(K.calSelectedDay({view: 'week'}), 0);
  assert.equal(K.calMenuToggle({menu: false, deleteAsk: {id: 'e1', off: 0}}), null);
  same({...K.calMenuToggle({menu: false, deleteAsk: null})}, {menu: true});
  same({...K.calMenuToggle({menu: true})}, {menu: false});
  same(JSON.parse(JSON.stringify(K.calDeleteAsk('e1', 2))), {deleteAsk: {id: 'e1', off: 2}, menu: false});
  const calendar = model.slice(model.indexOf('registerView("calendar"'), model.indexOf('/* ===== module: browser ===== */'));
  assert.match(calendar, /var sel = calSelectedDay\(st\);/);
  assert.doesNotMatch(calendar, /set\(\{ menu: !st\.menu \}\)|set\(\{ deleteAsk: \{/);
});

test('unmounting the shell releases every module-level latch', () => {
  const cleared = [], timeouts = [];
  const G = load(['notesStopTimers', 'resetViewGlobals'], {PN: {live: 'ana', boot: 'ana', lastTab: 'keypad'}, CAM: {live: true, scan: true, lp: 5, long: false, g: [1, 2]},
    NT: {pend: true, recI: 3, playI: 4, dicI: 6, dIdx: 0, undoT: null}, CAL_PENDING: {id: 'x'}, clearInterval: id => cleared.push(id), clearTimeout: id => timeouts.push(id)});
  G.resetViewGlobals();
  same({...G.ctx.PN}, {live: null, boot: null, lastTab: 'keypad'});
  same({...G.ctx.CAM}, {live: false, scan: false, lp: null, long: false, g: null});
  same([G.ctx.NT.pend, G.ctx.NT.recI, G.ctx.NT.playI, G.ctx.NT.dicI], [false, null, null, null]);
  assert.equal(G.ctx.CAL_PENDING, null);
  same([cleared, timeouts], [[4, 6], [5]]);
  assert.match(method('componentWillUnmount'), /resetViewGlobals\(\);/);
});

test('Home agenda: ordered once per event list, and the same card as a fresh filter and sort', () => {
  const at = (hour, day = 7) => new Date(2026, 9, day, hour).getTime(), now = at(12);
  const events = [
    {id: 'late', title: 'Late', nativeEvent: {begin: at(18), end: at(19)}},
    {id: 'past', title: 'Past', nativeEvent: {begin: at(8), end: at(9)}},
    {id: 'running', title: 'Running', nativeEvent: {begin: at(11), end: at(13)}},
    {id: 'app', title: 'App calendar', alphaCalendarId: 'local', nativeEvent: {begin: at(11, 7) + 60000, end: at(14)}},
    {id: 'done', title: 'Done', reminderStatus: 'completed', reminderAt: at(15)},
    {id: 'remind', title: 'Remind', alphaReminderId: 'r1', reminderAt: at(16)},
    {id: 'allday', title: 'All day', nativeEvent: {allDay: true, begin: Date.UTC(2026, 9, 8), end: Date.UTC(2026, 9, 9)}},
    {id: 'broken', title: 'Broken', nativeEvent: {begin: NaN, end: NaN}},
  ];
  const overdue = [{id: 'o1', title: 'Pay rent', at: at(10), off: 0}];
  // The card's order stated directly: filter at `now`, overdue first, then by start.
  const fresh = (list, rows, shown, when) => H.homeAgendaCandidates(list, rows, shown).filter(item => H.homeAgendaLive(item, when));
  const agenda = H.createHomeAgenda();
  const first = agenda({events, overdue: [], calendarShown: true, now});
  assert.equal(first.agenda.event.id, 'running');
  assert.equal(first.following, undefined);
  same(first.ordered.map(item => item.event.id), ['past', 'running', 'app', 'remind', 'late', 'allday']);
  same(fresh(events, [], true, now).map(item => item.event.id), ['running', 'app', 'remind', 'late', 'allday']);
  // Same inputs, a later clock: the ordered list is the same object, only the pick moves.
  const later = agenda({events, overdue: [], calendarShown: true, now: at(15)});
  assert.equal(later.ordered, first.ordered);
  assert.equal(later.agenda.event.id, 'remind');
  assert.equal(agenda({events, overdue: [], calendarShown: true, now: at(13)}).agenda.event.id, 'running', 'an event is shown through its end');
  assert.equal(agenda({events, overdue: [], calendarShown: true, now: at(13) + 1}).agenda.event.id, 'app');
  // A hidden or unread app calendar leaves its events out; reminders stay.
  const hidden = agenda({events, overdue: [], calendarShown: false, now: at(13) + 1});
  assert.notEqual(hidden.ordered, first.ordered);
  assert.equal(hidden.agenda.event.id, 'remind');
  // An overdue reminder is first; the next item that is not overdue follows it.
  const due = agenda({events, overdue, calendarShown: true, now});
  same([due.agenda.event.id, due.agenda.event.overdue, due.following.event.id], ['o1', true, 'running']);
  assert.equal(agenda({events, overdue: overdue.map(row => ({...row})), calendarShown: true, now}).ordered, due.ordered, 'equal overdue rows in a new array reuse the order');
  assert.notEqual(agenda({events, overdue: [{...overdue[0], title: 'Pay the rent'}], calendarShown: true, now}).ordered, due.ordered);
  // A new event list is ordered again.
  const next = agenda({events: events.slice(0, 2), overdue: [], calendarShown: true, now});
  same(next.ordered.map(item => item.event.id), ['past', 'late']);
  assert.equal(next.agenda.event.id, 'late');
  assert.equal(agenda({events: [], overdue: [], calendarShown: true, now}).agenda, undefined);
  // An all-day event sits at local midnight of its UTC date and ends when that day does.
  const allDay = H.homeAgendaCandidates([events[6]], [], true)[0];
  assert.equal(allDay.begin, new Date(2026, 9, 8).getTime());
  assert.equal(H.homeAgendaLive(allDay, allDay.end), false);
  assert.equal(H.homeAgendaLive(allDay, allDay.end - 1), true);
  assert.ok(H.compareHomeAgenda({event: {overdue: true}, begin: 9}, {event: {}, begin: 1}) < 0);

  const adapter = readFileSync('apps/app/src/prototype/data-adapter.ts', 'utf8');
  assert.match(adapter, /const \{agenda, following\} = homeAgenda\(\{events: calendarState\.events \|\| NO_EVENTS,/);
  assert.doesNotMatch(adapter.slice(adapter.indexOf('p.renderVals = function'), adapter.indexOf('const mount = p.componentDidMount')), /\.sort\(/, 'no sort on the shell render path');
});

test('the storage access probe runs at most once per interval, not on every render', () => {
  let now = 0, probes = 0, blocked = false;
  const check = H.createStorageAccessCheck(() => { probes++; if (blocked) throw new Error('blocked'); }, 5000, () => now);
  for (let index = 0; index < 200; index++) { now += 10; assert.equal(check(), true); }
  assert.equal(probes, 1);
  blocked = true; now = 5010;
  assert.equal(check(), false);
  assert.equal(check(), false);
  assert.equal(probes, 2);
  blocked = false; now += 5000;
  assert.equal(check(), true);
  assert.equal(probes, 3);
  // A clock that moved backwards does not freeze an old answer.
  blocked = true; now = 100;
  assert.equal(check(), false);
  const adapter = readFileSync('apps/app/src/prototype/data-adapter.ts', 'utf8');
  const bindings = adapter.slice(adapter.indexOf('export function installPrototypeHomeBindings'));
  assert.doesNotMatch(bindings, /localStorage|indexedDB/, 'the render path asks the cached check');
  assert.match(bindings, /!Capacitor\.isNativePlatform\(\)&&!storageAccessible\(\)/);
});
