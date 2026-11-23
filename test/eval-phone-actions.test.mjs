import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {CASES, DEVICE_PROFILE, evaluate, FOLLOW_UPS, judge, judgeTurn, summarize, summarizeStream} from '../scripts/eval-phone-actions.ts';
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

test('a turn that routes right can still fail on what its proposal or its reply carries', () => {
  const item = {id: 'x', family: 'follow-up', view: 'home', text: 'Send the same message to Alex.', expect: [['sms_compose']], proposal: /keys are under the mat/i};
  assert.equal(judgeTurn(item, [{type: 'sms_compose', body: 'The keys are under the mat.'}], ''), 'pass');
  assert.equal(judgeTurn(item, [{type: 'sms_compose', body: 'Hello'}], ''), 'content');
  assert.equal(judgeTurn(item, [{type: 'phone_call'}], ''), 'missing');
  const asked = {...item, expect: [], proposal: undefined, reply: /\bnot\b/i};
  assert.equal(judgeTurn(asked, [], 'It was not sent.'), 'pass');
  assert.equal(judgeTurn(asked, [], 'Yes, it was sent.'), 'content');
  // The follow-ups reuse an earlier request, ask about an earlier outcome, and repeat one.
  assert.deepEqual(FOLLOW_UPS.map(follow => follow.family), Array(FOLLOW_UPS.length).fill('follow-up'));
  assert.ok(FOLLOW_UPS.some(follow => follow.proposal) && FOLLOW_UPS.some(follow => follow.reply));
  // Every proposal is rejected as soon as its turn ends, so a truthful answer says it did not go out.
  const outcome = FOLLOW_UPS.find(follow => follow.id === 'follow-outcome');
  for (const reply of ['No, it was rejected on your phone.', "It hasn't been sent.", 'That text was declined.', 'It is still waiting for your approval.', 'It did not go out.'])
    assert.equal(judgeTurn(outcome, [], reply), 'pass', reply);
  for (const reply of ['Yes, it went out.', 'Sent!']) assert.equal(judgeTurn(outcome, [], reply), 'content', reply);
  // A turn that expects no proposal cannot pass by saying it cannot do the thing.
  const open = CASES.find(item => item.id === 'open-messages');
  assert.equal(judgeTurn(open, [], 'Opening Messages.'), 'pass');
  assert.equal(judgeTurn(open, [{type: 'open_view'}], 'Review this on your phone.'), 'pass');
  assert.equal(judgeTurn(open, [], "I can't open apps from here."), 'content');
  assert.equal(judgeTurn(CASES.find(item => item.id === 'question'), [], 'Paris.'), 'pass');
  // A create that did not take effect fails, however politely it is reported.
  const reminder = CASES.find(item => item.id === 'reminder-before');
  assert.equal(judgeTurn(reminder, [], "Got it. I'll remind you to take out the trash tonight at 10 PM."), 'pass');
  for (const reply of ["I tried to save that trash reminder three times but each one hit a temporary system error. It's not saved.", "Setting that reminder ran into a hiccup, so I can't confirm it went through.", "I hit a snag and couldn't complete that request.", 'I tried to complete that, but the available runtime step failed before it produced a usable result. The request remains incomplete.'])
    assert.equal(judgeTurn(reminder, [], reply), 'content', reply);
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
  const opened = [], sentTo = [], modes = [];
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
      modes.push(body.metadata.agentActionMode);
      assert.equal(body.metadata.clientDevice.context.view, body.text.startsWith('Ring') ? 'maps' : 'home');
      if (/^Call/.test(body.text)) propose('phone_call');
      // A wrong tool for the request, and a proposal that lands after its turn was read.
      if (/^Ring/.test(body.text)) propose('open_view');
      if (/^Thanks/.test(body.text)) late = true;
      return send({text: /capital/.test(body.text) ? 'Paris.' : 'Review this on your phone.'});
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
    // A phone's default: the owner wants a request done without being asked first.
    assert.equal(result.actionMode, 'direct-request-v1');
    assert.ok(modes.length === 8 && modes.every(mode => mode === 'direct-request-v1'));
    modes.length = 0;
    assert.equal((await evaluate({origin, token, cases: cases.slice(0, 1), askBefore: true})).actionMode, 'ask-before');
    assert.deepEqual(modes, [undefined]);
    assert.deepEqual(sentTo, opened, 'each case has its own conversation');
    // As an owner uses a phone for a while: a run's cases follow each other in one conversation.
    opened.length = 0; sentTo.length = 0;
    const session = await evaluate({origin, token, cases, followUps: [], runs: 2, oneConversation: true});
    assert.equal(session.conversations, 'one-per-run');
    assert.deepEqual(sentTo, ['c0', 'c0', 'c0', 'c0', 'c1', 'c1', 'c1', 'c1']);
    assert.deepEqual(session.rows.map(row => row.outcome), result.rows.map(row => row.outcome));
    // One synthetic phone per run of the eval, each revoked: the first run, the ask-before one, this one.
    assert.equal(revokes, 3);
    // Follow-up turns come after the cases, in the same conversation, and are judged on what
    // the proposal and the reply carry as well as on the routing. Separate conversations skip them.
    const call = cases.filter(item => item.id === 'call-number');
    const followUps = [
      {id: 'again', family: 'follow-up', view: 'home', text: 'Call again.', expect: [['phone_call']], proposal: /"type":"phone_call"/},
      {id: 'wrong-number', family: 'follow-up', view: 'home', text: 'Call the other one.', expect: [['phone_call']], proposal: /5550199/},
      {id: 'outcome', family: 'follow-up', view: 'home', text: 'Did it go out?', expect: [], reply: /review/i},
      {id: 'outcome-missed', family: 'follow-up', view: 'home', text: 'Did it really?', expect: [], reply: /was sent/},
    ];
    opened.length = 0; sentTo.length = 0;
    const followed = await evaluate({origin, token, cases: call, followUps, oneConversation: true});
    assert.deepEqual(followed.rows.map(row => [row.id, row.outcome]), [['call-number', 'pass'], ['again', 'pass'], ['wrong-number', 'content'], ['outcome', 'pass'], ['outcome-missed', 'content']]);
    assert.deepEqual(sentTo, ['c0', 'c0', 'c0', 'c0', 'c0']);
    assert.equal((await evaluate({origin, token, cases: call, followUps})).rows.length, 1);
    await assert.rejects(evaluate({origin: 'https://agent.example.com', token}), /loopback/);
  } finally { server.closeAllConnections(); await stopLoopback(server); }
  assert.deepEqual(summarize([{id: 'a', family: 'f', run: 1, outcome: 'pass', proposed: [], ms: 5}, {id: 'a', family: 'f', run: 2, outcome: 'missing', proposed: [], ms: 9}]).unstableCases, ['a']);
});

test('a streamed run records the acknowledgement, activity, first token and done frame of each turn', async () => {
  const token = 'synthetic-eval-token';
  const frame = value => `data: ${JSON.stringify(value)}\n\n`;
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined, url = req.url ?? '';
    const send = value => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(value)); };
    if (url === '/api/client-devices/register') return send({installationId: req.headers['x-eliza-device-id'], capabilities: ['phone.call.v1']});
    if (url === '/api/client-devices/revoke') return send({revoked: true});
    if (url === '/api/client-devices/proposals') return send({proposals: []});
    if (url === '/api/conversations') return send({conversation: {id: 'c0'}});
    if (url.endsWith('/messages')) { res.writeHead(500); return res.end('{}'); }
    if (url.endsWith('/messages/stream')) {
      assert.equal(req.headers.accept, 'text/event-stream');
      res.writeHead(200, {'Content-Type': 'text/event-stream'});
      const planned = !/capital/.test(body.text);
      // A planned turn: the acknowledgement, then the activity, then the reply. A direct answer has neither.
      if (planned) res.write(frame({type: 'status', kind: 'thinking', label: 'Let me check your calendar.'}));
      if (planned) res.write(frame({type: 'status', kind: 'running_tool', toolName: 'CALENDAR', label: 'Using Calendar'}));
      res.write(frame({type: 'token', text: 'Draft', provisional: true}));
      res.write(frame({type: 'token', fullText: planned ? 'Nothing tomorrow.' : 'Paris.'}));
      return res.end(frame({type: 'done', fullText: planned ? 'Nothing tomorrow.' : 'Paris.', agentName: 'Alpha'}));
    }
    res.writeHead(404); res.end('{}');
  });
  const origin = await startLoopback(server);
  try {
    const cases = CASES.filter(item => ['free-busy', 'question'].includes(item.id));
    const result = await evaluate({origin, token, cases, followUps: [], streamMode: true});
    const [planned, direct] = result.rows;
    assert.equal(planned.stream.ack, 'Let me check your calendar.');
    assert.equal(planned.stream.activity, 'Using Calendar');
    assert.ok(planned.stream.ackMs <= planned.stream.activityMs && planned.stream.activityMs <= planned.stream.doneMs);
    assert.equal(typeof planned.stream.firstTokenMs, 'number', 'a provisional draft is not the first reply token');
    assert.equal(direct.stream.ack, undefined);
    assert.equal(direct.reply, 'Paris.');
    assert.equal(direct.outcome, 'pass');
    assert.deepEqual({...result.summary.acknowledgements, ackMsMedian: 0, firstTokenMsMedian: 0, doneMsMedian: 0}, {turns: 2, acknowledged: 1, ackMsMedian: 0, firstTokenMsMedian: 0, doneMsMedian: 0});
    // Without --stream the summary carries no acknowledgement figures.
    assert.equal(summarizeStream([{id: 'a', family: 'f', run: 1, outcome: 'pass', proposed: [], ms: 1}]), undefined);
  } finally { server.closeAllConnections(); await stopLoopback(server); }
});
