import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {CASES, DEVICE_PROFILE, evaluate, judge, summarize} from '../scripts/eval-phone-actions.ts';
import {startLoopback, stopLoopback} from '../scripts/fixtures/loopback.ts';

test('a turn passes only when every expectation is proposed and nothing else is', () => {
  assert.equal(judge([['phone_call', 'phone_dial']], ['phone_dial']), 'pass');
  assert.equal(judge([['sms_compose'], ['clock_*']], ['clock_handoff', 'sms_compose']), 'pass');
  assert.equal(judge([['sms_compose'], ['clock_*']], ['sms_compose']), 'missing');
  assert.equal(judge([['phone_keypad']], ['open_view']), 'missing');
  assert.equal(judge([['phone_keypad']], ['phone_keypad', 'phone_call']), 'unexpected');
  assert.equal(judge([], []), 'pass');
  assert.equal(judge([], ['phone_call']), 'unexpected');
  // An allowed operation may be proposed or not; anything else still fails.
  assert.equal(judge([], ['reminder_create_after'], ['reminder_create_after']), 'pass');
  assert.equal(judge([], [], ['reminder_create_after']), 'pass');
  assert.equal(judge([], ['clock_handoff'], ['reminder_create_after']), 'unexpected');
  assert.equal(judge([['phone_call']], ['open_view'], ['open_view']), 'missing');
});

test('cases with more than one right answer say so, and none expects an operation a phone lacks', () => {
  const byId = Object.fromEntries(CASES.map(item => [item.id, item]));
  // Clock takes an alarm at a time of day; it has no timer. An alarm in a timer's place is wrong.
  assert.deepEqual(byId['timer-from-notes'].expect, []);
  assert.ok(byId['timer-from-notes'].allow.includes('reminder_create_after'));
  assert.equal(judge(byId['timer-from-notes'].expect, ['clock_handoff'], byId['timer-from-notes'].allow), 'unexpected');
  // Availability with no phone calendar selected belongs to the Calendar service.
  assert.deepEqual(byId['free-busy'].expect, []);
  assert.equal(byId['free-busy'].allow, undefined);
  for (const id of ['open-messages', 'show-contacts', 'open-camera']) assert.deepEqual(byId[id].allow, ['open_view']);
  assert.deepEqual(byId['alarm-vague'].expect, [['clock_*']]);
});

test('the case set covers each device family, off-surface requests and requests that must not propose', () => {
  assert.equal(new Set(CASES.map(item => item.id)).size, CASES.length);
  for (const family of ['telephony', 'contacts', 'camera', 'clock', 'browser', 'files', 'multi', 'navigation', 'other-actions', 'chat'])
    assert.ok(CASES.some(item => item.family === family), family);
  // A phone request made while another app is showing is where a narrowed tool surface fails first.
  assert.ok(CASES.filter(item => item.expect.length && item.view !== 'home').length >= 5);
  assert.ok(CASES.filter(item => !item.expect.length).length >= 8);
  assert.equal(DEVICE_PROFILE.aospImage, true);
});

test('every proposal a run causes is rejected, late ones are never credited to the next case, and the phone is revoked', async () => {
  const token = 'synthetic-eval-token', proposals = [];
  let revokes = 0, late = false;
  const opened = [], sentTo = [];
  const propose = type => proposals.push({id: `p${proposals.length}`, digest: 'd', state: 'pending', payload: {operation: {type}}});
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined, url = req.url ?? '';
    const send = value => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(value)); };
    assert.equal(req.headers.authorization, `Bearer ${token}`);
    if (url === '/api/client-devices/register') return send({installationId: req.headers['x-eliza-device-id'], capabilities: ['phone.call.v1', 'sms.compose.v1', 'clock.handoff.v1', 'phone.keypad.v1']});
    if (url === '/api/client-devices/revoke') { revokes++; return send({revoked: true}); }
    if (url === '/api/client-devices/proposals') {
      send({proposals: proposals.map(item => ({...item}))});
      if (late) { late = false; propose('sms_compose'); }
      return;
    }
    if (url === '/api/conversations') { opened.push(`c${opened.length}`); return send({conversation: {id: opened.at(-1)}}); }
    if (url.endsWith('/decision')) {
      const proposal = proposals.find(item => url.includes(`/${item.id}/`));
      assert.equal(body.decision, 'reject');
      proposal.state = 'rejected';
      return send({proposal});
    }
    if (url.endsWith('/messages')) {
      sentTo.push(url.split('/')[3]);
      assert.match(req.headers['x-eliza-device-capabilities'], /phone\.call\.v1/);
      assert.equal(body.metadata.clientDevice.context.view, body.text.startsWith('Ring') ? 'maps' : 'home');
      if (/^Call/.test(body.text)) propose('phone_call');
      // A wrong tool for the request, and a proposal that lands after its turn was read.
      if (/^Ring/.test(body.text)) propose('open_view');
      if (/^Thanks/.test(body.text)) late = true;
      return send({text: 'Review this on your phone.'});
    }
    res.writeHead(404); res.end('{}');
  });
  const origin = await startLoopback(server);
  try {
    const cases = CASES.filter(item => ['call-number', 'call-vague-from-maps', 'thanks', 'question'].includes(item.id));
    const result = await evaluate({origin, token, cases, runs: 2});
    assert.deepEqual(result.rows.map(row => row.outcome), ['pass', 'missing', 'pass', 'pass', 'pass', 'missing', 'pass', 'pass']);
    assert.deepEqual(result.rows[1].proposed, ['open_view']);
    assert.equal(result.summary.strayProposals, 2);
    assert.equal(result.summary.passRate, 6 / 8);
    assert.deepEqual(result.summary.failingCases, ['call-vague-from-maps']);
    assert.deepEqual(result.summary.byFamily, {telephony: 0.5, chat: 1});
    assert.ok(proposals.length === 6 && proposals.every(item => item.state === 'rejected'));
    assert.equal(revokes, 1);
    assert.match(result.source.caseSet, /^[a-f0-9]{64}$/);
    assert.ok(!('model' in result), 'the runtime model is not claimed as observed');
    assert.equal(result.conversations, 'one-per-case');
    assert.deepEqual(sentTo, opened, 'each case has its own conversation');
    // As an owner uses a phone for a while: a run's cases follow each other in one conversation.
    opened.length = 0; sentTo.length = 0;
    const session = await evaluate({origin, token, cases, runs: 2, oneConversation: true});
    assert.equal(session.conversations, 'one-per-run');
    assert.deepEqual(sentTo, ['c0', 'c0', 'c0', 'c0', 'c1', 'c1', 'c1', 'c1']);
    assert.deepEqual(session.rows.map(row => row.outcome), result.rows.map(row => row.outcome));
    assert.equal(revokes, 2);
    await assert.rejects(evaluate({origin: 'https://agent.example.com', token}), /loopback/);
  } finally { server.closeAllConnections(); await stopLoopback(server); }
  assert.deepEqual(summarize([{id: 'a', family: 'f', run: 1, outcome: 'pass', proposed: [], ms: 5}, {id: 'a', family: 'f', run: 2, outcome: 'missing', proposed: [], ms: 9}]).unstableCases, ['a']);
});
