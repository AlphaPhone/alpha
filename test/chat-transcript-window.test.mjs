// The chat transcript mounts only its newest rows: a closed chat a short tail, an open chat one
// page that grows by a page each time the owner scrolls to the top. The real window module runs
// against a stub shell that renders rows into a jsdom transcript the way the template does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {transcriptWindow, growTranscriptAtTop, CLOSED_TRANSCRIPT_ROWS, TRANSCRIPT_PAGE_ROWS} from '../apps/app/src/prototype/chat-transcript-window.js';

const messages = (count, room = 'a') => Array.from({length: count}, (_, i) => ({id: `${room}-${i}`, from: i % 2 ? 'agent' : 'user', text: `Message ${i}`}));

function shell(msgs, chat = 'input') {
  const {window} = new JSDOM('<!doctype html><body><div data-alpha-transcript></div></body>');
  const document = window.document, list = document.querySelector('[data-alpha-transcript]');
  const s = {
    state: {chat, msgs}, chatMotion: undefined,
    S() { return this.state; },
    // Same open rule as the shell: an open mode, or a drag in progress before its mode changes.
    render() {
      const rows = transcriptWindow(this, this.state.msgs, ['sheet', 'full'].includes(this.state.chat) || !!this.chatMotion);
      list.replaceChildren(...rows.map(m => { const row = document.createElement('div'); row.setAttribute('data-alpha-message-id', m.id); return row; }));
    },
    setState(patch) { Object.assign(this.state, patch); this.render(); },
  };
  document.addEventListener('scroll', event => growTranscriptAtTop(s, event), true);
  s.render();
  const ids = () => Array.from(list.querySelectorAll('[data-alpha-message-id]'), row => row.getAttribute('data-alpha-message-id'));
  const scrollTo = top => { list.scrollTop = top; list.dispatchEvent(new window.Event('scroll')); };
  return {s, ids, scrollTo};
}

test('a closed chat mounts only the newest rows, and an open chat one page', () => {
  const t = shell(messages(300));
  assert.equal(t.ids().length, CLOSED_TRANSCRIPT_ROWS);
  assert.equal(t.ids().at(-1), 'a-299');
  t.s.setState({chat: 'sheet'});
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS);
  assert.deepEqual([t.ids()[0], t.ids().at(-1)], ['a-200', 'a-299']);
  t.s.setState({chat: 'hidden'});
  assert.equal(t.ids().length, CLOSED_TRANSCRIPT_ROWS);
});

test('a short conversation renders every message', () => {
  const t = shell(messages(12), 'full');
  assert.equal(t.ids().length, 12);
  t.s.setState({chat: 'input'});
  assert.equal(t.ids().length, 12);
});

test('a drag from the closed bar keeps the open window before the mode changes', () => {
  const t = shell(messages(300));
  t.s.chatMotion = {moved: true}; t.s.setState({});
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS);
});

test('scrolling to the top mounts older pages until the first message, and only then', () => {
  const t = shell(messages(300), 'full');
  t.scrollTo(500);
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS, 'reading in the middle mounts nothing');
  t.scrollTo(0);
  assert.equal(t.ids().length, 2 * TRANSCRIPT_PAGE_ROWS);
  t.scrollTo(0);
  assert.equal(t.ids().length, 300);
  assert.equal(t.ids()[0], 'a-0');
  t.scrollTo(0);
  assert.equal(t.s.transcriptRows, 300, 'the window stops growing once every message is mounted');
});

test('a closed chat ignores scroll, keeps its grown window for reopening, and a new conversation starts at one page', () => {
  const t = shell(messages(300), 'sheet');
  t.scrollTo(0);
  assert.equal(t.ids().length, 2 * TRANSCRIPT_PAGE_ROWS);
  t.s.setState({chat: 'input'});
  t.scrollTo(0);
  assert.equal(t.ids().length, CLOSED_TRANSCRIPT_ROWS);
  t.s.setState({chat: 'sheet'});
  assert.equal(t.ids().length, 2 * TRANSCRIPT_PAGE_ROWS, 'reopening returns to the rows the owner was reading');
  t.s.setState({msgs: messages(300, 'b')});
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS);
  assert.equal(t.ids().at(-1), 'b-299');
});

test('a new message keeps the window size; scrolling elsewhere than the transcript is ignored', () => {
  const t = shell(messages(150), 'sheet');
  t.s.setState({msgs: [...t.s.state.msgs, {id: 'a-150', from: 'user', text: 'New'}]});
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS);
  assert.equal(t.ids().at(-1), 'a-150');
  growTranscriptAtTop(t.s, {target: {matches: () => false, scrollTop: 0}});
  assert.equal(t.ids().length, TRANSCRIPT_PAGE_ROWS);
});
