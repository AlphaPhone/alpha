#!/usr/bin/env node
/**
 * Scores which phone operation the resident agent proposes for a fixed set of requests,
 * so a change to what the agent's model is sent can be compared before and after.
 *
 * It talks to a loopback resident runtime (for example `pnpm dev`) that has a hosted
 * text model. It enrolls one synthetic phone with the capabilities an Alpha-image phone
 * negotiates, sends each case in its own conversation with the screen the case names, and
 * reads the durable device proposals the turn created. Every proposal is rejected at
 * once: nothing is approved or executed, and no phone effect can occur. The synthetic
 * phone is revoked when the run ends; its conversations stay in the runtime's history.
 *
 *   node scripts/eval-phone-actions.ts --origin http://127.0.0.1:47849 \
 *     --token-file <paired-machine-token> --output test-results/phone-actions.json \
 *     [--runs 3] [--pause-ms 4000] [--one-conversation] [--ask-before] [--stream] [--only <case id>[,...]]
 *     [--database <resident .elizadb>]
 *
 * Each request is sent the way a phone sends it by default, as one the owner wants done
 * without being asked first (agentActionMode direct-request-v1). The eval still performs
 * nothing: it rejects every proposal. --ask-before sends the other mode.
 * With --only the run sends just the named cases and follow-ups, to repeat the few a
 * change is about.
 * With --one-conversation every case of a run is sent in the same conversation, in order,
 * the way an owner uses a phone for a while: each request then carries the turns before
 * it, which is where history, caching and the per-minute limit show. Such a run ends with
 * the follow-up turns, which only make sense after other turns.
 *
 * A pass means the proposals matched the case's expectation. It says nothing about reply
 * wording, about actions that are not device proposals (Maps, Notes, Calendar records),
 * or about a real phone. Scores compare only within one case-set revision and profile.
 * With --database the result also carries the tokens the run's model calls used.
 * With --stream each turn goes through the phone's streaming route instead, and its row records when
 * the transient acknowledgement status arrived and what it said, the first activity label, the first
 * reply token and the done frame (milliseconds from the request), as the phone's status line sees them.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_MODEL } from './agent-model.ts';
import { audit, loadCalls } from './agent-context-audit.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
/** An Alpha-image phone: every reviewed surface the launcher can run. */
export const DEVICE_PROFILE = Object.freeze({ android: true, native: true, camera: true, foregroundReview: true, canonicalNotes: true, photoLibrary: true, files: true, clockRepeatDays: true, aospImage: true });
const CASESET_REVISION = 8;

const always = ['calendar.local-event.v1', 'notes.local-record.v1'] as const;
const whenOffered = ['notes.list-filter.v1', 'reminders.create.v1', 'calendar.create.v1', 'calendar.next-read.v1', 'maps.selected-read.v1', 'files.browser.v1',
  'browser.search.v1', 'browser.tabs.v1', 'browser.history.v1', 'browser.find.v1', 'browser.open-new-tab.v1', 'gmail.local-compose.v1', 'calendar.availability-read.v1',
  'photos.library.v1', 'calendar.named-read.v1', 'clock.handoff.v1', 'clock.handoff.v2', 'views.telephony.v1', 'sms.send.v1', 'phone.dial.v1',
  'sms.latest-sender.v1', 'phone.call.v1', 'contacts.write.v1', 'contacts.show.v1', 'contacts.read.v1', 'sms.compose.v1', 'messages.read.v1',
  'voicemail.read.v1', 'voicemail.delete.v1', 'phone.keypad.v1'] as const;
/** A capability offered only beside the one it extends: [extension, extended]. */
const extensions = [['camera.capture-lens.v1', 'camera.capture-photo.v1'], ['browser.tabs.close-all.v1', 'browser.tabs.v1'], ['sms.latest-sender.v2', 'sms.latest-sender.v1'],
  ['sms.compose.v2', 'sms.compose.v1'], ['contacts.write.v2', 'contacts.write.v1']] as const;

/**
 * What a phone of DEVICE_PROFILE negotiates over what the agent offered, as the phone selects it:
 * calendar and Notes records always; Camera, reminders (the newest record format only), Notes
 * filters, Calendar, Maps, Files, Browser, Gmail drafts, Photos, the Clock handoff and, on the
 * image, Phone, Messages and Contacts only where offered; an extension only beside what it extends.
 * Never the browser-only agenda read, the retired Notes query, alarms or the on-device contact lookup.
 */
export function alphaImageCapabilities(offered: readonly unknown[]): string[] {
  const agent = new Set(offered.filter((value): value is string => typeof value === 'string'));
  const selected: string[] = [...always];
  if (agent.has('camera.capture-photo.v1')) selected.push('camera.capture-photo.v1');
  if (agent.has('reminders.local-record.v2')) selected.push('reminders.local-record.v2');
  else if (agent.has('reminders.local-record.v1')) selected.push('reminders.local-record.v1');
  for (const capability of whenOffered) if (agent.has(capability)) selected.push(capability);
  for (const [extension, extended] of extensions) if (agent.has(extension) && selected.includes(extended)) selected.push(extension);
  return selected;
}

/**
 * `expect` lists what the turn must propose: each entry is a set of acceptable operation
 * types (a trailing `*` matches a prefix), and every entry needs a matching proposal. An
 * empty list means the turn must create no device proposal (a reply, a view change, or a
 * canonical Notes/Calendar/Maps action). `allow` lists operations a turn may also propose
 * without failing, where more than one answer is right. `proposal` must match the JSON of
 * some proposed operation and `reply` the reply text, where the routing alone does not
 * show the turn used what came before it. `mustNotRefuse` fails a turn whose reply says the
 * agent cannot do it: without a proposal to count, a refusal would otherwise pass.
 */
export interface PhoneCase { id: string; family: string; view: string; text: string; expect: readonly (readonly string[])[]; allow?: readonly string[]; proposal?: RegExp; reply?: RegExp; mustNotRefuse?: boolean }
const REFUSAL = /\b(can['’]t|cannot|unable to|not able to|don['’]t have (a way|the ability|access))\b/i;
/** A reply that reports the request was attempted and did not take effect. */
const NOT_DONE = /\b(hiccup|snag|(system|temporary) error|rate limit|failed|incomplete|not saved|(wasn['’]t|was not|isn['’]t|is not|didn['’]t|did not) (saved|save|set|created|go through)|couldn['’]t|could not|can['’]t confirm|try again)\b/i;
const CALL = ['phone_call', 'phone_dial'], TEXT = ['sms_compose', 'sms_send'], CLOCK = ['clock_*'];
// A phone has no timer operation: Clock takes an alarm at a time of day, never a duration. A
// relative reminder is the nearest it can offer, and an alarm in its place is wrong.
const REMINDER = ['reminder_create_after', 'reminder_create', 'create_reminder'];
// Where the client does not deliver view changes itself, opening a view is a device proposal.
const VIEW = ['open_view'];
export const CASES: readonly PhoneCase[] = Object.freeze([
  { id: 'call-number', family: 'telephony', view: 'home', text: 'Call 415-555-0100.', expect: [CALL] },
  { id: 'call-contact', family: 'telephony', view: 'home', text: 'Call Sam.', expect: [CALL] },
  { id: 'call-vague-from-maps', family: 'telephony', view: 'maps', text: 'Ring the dentist for me.', expect: [CALL] },
  { id: 'dialer', family: 'telephony', view: 'home', text: 'Open the dialer.', expect: [['phone_keypad']] },
  { id: 'keypad-number', family: 'telephony', view: 'home', text: 'Open the keypad with 415 555 0100 typed in.', expect: [['phone_keypad']] },
  { id: 'text-number', family: 'telephony', view: 'home', text: 'Text 415-555-0100 saying I am running late.', expect: [TEXT] },
  { id: 'text-contact', family: 'telephony', view: 'home', text: "Text Sam that I'm on my way.", expect: [TEXT] },
  { id: 'text-vague', family: 'telephony', view: 'home', text: 'Ping my brother and say happy birthday.', expect: [TEXT] },
  { id: 'text-from-notes', family: 'telephony', view: 'notes', text: 'Message Alex: lunch at noon?', expect: [TEXT] },
  { id: 'text-from-browser', family: 'telephony', view: 'browser', text: 'Send Jordan a text that the tickets are booked.', expect: [TEXT] },
  { id: 'contact-show', family: 'contacts', view: 'home', text: "Show me Jamie's contact.", expect: [['contact_show']] },
  { id: 'contact-number', family: 'contacts', view: 'home', text: "What's Jamie's phone number?", expect: [['contact_show']] },
  { id: 'contact-create', family: 'contacts', view: 'home', text: 'Add a contact for Dana Lee, 415-555-0123.', expect: [['contact_create']] },
  { id: 'contact-update', family: 'contacts', view: 'home', text: "Change Dana Lee's number to 415-555-0177.", expect: [['contact_update']] },
  { id: 'contact-delete', family: 'contacts', view: 'home', text: 'Delete the contact for Dana Lee.', expect: [['contact_delete']] },
  { id: 'photo', family: 'camera', view: 'home', text: 'Take a picture.', expect: [['camera_capture_photo']] },
  { id: 'selfie-from-maps', family: 'camera', view: 'maps', text: 'Take a selfie.', expect: [['camera_capture_photo']] },
  { id: 'alarm', family: 'clock', view: 'home', text: 'Set an alarm for 7am.', expect: [CLOCK] },
  { id: 'alarm-vague', family: 'clock', view: 'home', text: 'Wake me at 6:30 tomorrow.', expect: [CLOCK] },
  { id: 'timer-from-notes', family: 'clock', view: 'notes', text: 'Set a timer for 10 minutes.', expect: [], allow: REMINDER },
  { id: 'new-tab', family: 'browser', view: 'browser', text: 'Open a new tab.', expect: [['browser_tab_new']] },
  { id: 'open-site', family: 'browser', view: 'home', text: 'Open example.com.', expect: [['browser_navigate', 'browser_tab_new']] },
  { id: 'find-in-page', family: 'browser', view: 'browser', text: 'Find "refund" on this page.', expect: [['browser_find']] },
  { id: 'files', family: 'files', view: 'home', text: 'Show my PDFs in Files.', expect: [['files_*']] },
  // With no phone calendar selected, availability is the Calendar service's to answer.
  { id: 'free-busy', family: 'calendar', view: 'home', text: 'Am I free tomorrow from 3pm to 4pm?', expect: [] },
  { id: 'text-and-alarm', family: 'multi', view: 'home', text: "Text Sam I'll be late, and set an alarm for 7am.", expect: [TEXT, CLOCK] },
  { id: 'photo-and-text', family: 'multi', view: 'home', text: "Take a picture and text mom that I'm here.", expect: [['camera_capture_photo'], TEXT] },
  { id: 'call-or-text-choice', family: 'multi', view: 'home', text: 'Call Sam, and if you cannot, do nothing else.', expect: [CALL] },
  { id: 'open-messages', family: 'navigation', view: 'home', mustNotRefuse: true, text: 'Open Messages.', expect: [], allow: VIEW },
  { id: 'show-contacts', family: 'navigation', view: 'home', mustNotRefuse: true, text: 'Show my contacts.', expect: [], allow: VIEW },
  { id: 'open-camera', family: 'navigation', view: 'home', mustNotRefuse: true, text: 'Open the camera.', expect: [], allow: VIEW },
  { id: 'directions', family: 'other-actions', view: 'home', mustNotRefuse: true, text: 'Directions to the Ferry Building in San Francisco.', expect: [] },
  { id: 'note', family: 'other-actions', view: 'home', mustNotRefuse: true, text: 'Create a note called Groceries with milk and eggs.', expect: [] },
  { id: 'calendar-read', family: 'other-actions', view: 'calendar', text: "What's on my calendar tomorrow?", expect: [] },
  // A reminder is not an alarm: guidance that sends "wake me" to Clock must not take this too.
  { id: 'reminder-plain', family: 'other-actions', view: 'home', mustNotRefuse: true, text: 'Remind me to call mom at 5pm.', expect: [], allow: REMINDER },
  // A reminder worded with a time clause, a comma or "and" once loaded every sibling create tool beside the reminder's.
  { id: 'reminder-before', family: 'other-actions', view: 'home', mustNotRefuse: true, text: 'Remind me to take out the trash before bed, at 10pm.', expect: [], allow: REMINDER },
  { id: 'reminder-after', family: 'other-actions', view: 'home', mustNotRefuse: true, text: 'Remind me to email Dana after lunch tomorrow, at 1pm.', expect: [], allow: REMINDER },
  // A request that needs the phone and a record that is not the phone's.
  { id: 'text-and-calendar', family: 'multi', view: 'home', text: "Text Sam I'm running late and put lunch with Sam on my calendar tomorrow at noon.", expect: [TEXT], allow: ['calendar_create'] },
  { id: 'question', family: 'chat', view: 'home', text: 'What is the capital of France?', expect: [], reply: /paris/i },
  { id: 'thanks', family: 'chat', view: 'home', text: 'Thanks!', expect: [] },
  { id: 'phone-question', family: 'chat', view: 'home', text: 'How do phone alarms differ from timers?', expect: [] },
]);
/**
 * Turns that depend on the turns before them, sent after the cases when a run is one
 * conversation: a request that reuses an earlier one, a question about an earlier outcome,
 * and a repeat. Every proposal is rejected as soon as its turn ends, so the truthful answer
 * to "did it go out" is that it did not.
 */
export const FOLLOW_UPS: readonly PhoneCase[] = Object.freeze([
  { id: 'follow-text', family: 'follow-up', view: 'home', text: 'Text Sam that the keys are under the mat.', expect: [TEXT] },
  { id: 'follow-same-text', family: 'follow-up', view: 'home', text: 'Send the same message to Alex.', expect: [TEXT], proposal: /keys are under the mat/i },
  { id: 'follow-outcome', family: 'follow-up', view: 'home', text: 'Did the text to Sam about the keys go out?', expect: [], allow: ['messages_read_selected', 'sms_latest_sender'], reply: /\b(not|no|never)\b|n't|declin|reject|cancel|pending|waiting/i },
  { id: 'follow-alarm', family: 'follow-up', view: 'home', text: 'Set an alarm for 7am.', expect: [CLOCK] },
  { id: 'follow-again', family: 'follow-up', view: 'home', text: 'Do that again for 8am.', expect: [CLOCK], proposal: /"hour":\s*8\b/ },
]);
const CASESET_SHA256 = createHash('sha256').update(JSON.stringify([CASES, FOLLOW_UPS], (_key, value) => (value instanceof RegExp ? value.source : value))).digest('hex');

const matches = (type: string, pattern: string) => (pattern.endsWith('*') ? type.startsWith(pattern.slice(0, -1)) : type === pattern);
/** Every expectation needs a proposal, and every proposal must answer an expectation or be allowed. */
export function judge(expect: PhoneCase['expect'], proposed: readonly string[], allow: readonly string[] = []): 'pass' | 'missing' | 'unexpected' {
  if (expect.some(accepted => !proposed.some(type => accepted.some(pattern => matches(type, pattern))))) return 'missing';
  if (proposed.some(type => ![...expect, allow].some(accepted => accepted.some(pattern => matches(type, pattern))))) return 'unexpected';
  return 'pass';
}
/** A case's full verdict: the routing, then what the proposals and the reply had to carry. */
export function judgeTurn(item: PhoneCase, operations: readonly { type?: string }[], reply: string): ReturnType<typeof judge> | 'content' {
  const routed = judge(item.expect, operations.map(operation => operation.type ?? 'unknown'), item.allow);
  if (routed !== 'pass') return routed;
  if (item.proposal && !operations.some(operation => item.proposal!.test(JSON.stringify(operation)))) return 'content';
  if (item.mustNotRefuse && (REFUSAL.test(reply) || NOT_DONE.test(reply))) return 'content';
  return item.reply && !item.reply.test(reply) ? 'content' : 'pass';
}

/** Milliseconds from the request on the streaming route; ack is the transient acknowledgement status. */
export interface StreamStats { ack?: string; ackMs?: number; activity?: string; activityMs?: number; firstStatusMs?: number; firstTokenMs?: number; doneMs?: number }
export interface CaseRun { id: string; family: string; run: number; outcome: ReturnType<typeof judgeTurn> | 'error'; proposed: string[]; ms: number; replyChars?: number; reply?: string; error?: string; stream?: StreamStats }
const median = (values: readonly number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null; };
/** Streamed runs only: how many turns got an acknowledgement before their reply, and when. */
export function summarizeStream(rows: readonly CaseRun[]) {
  const streamed = rows.filter(row => row.stream);
  if (!streamed.length) return undefined;
  const of = (key: keyof StreamStats) => streamed.flatMap(row => typeof row.stream?.[key] === 'number' ? [row.stream[key] as number] : []);
  return { turns: streamed.length, acknowledged: streamed.filter(row => row.stream?.ack).length, ackMsMedian: median(of('ackMs')), firstTokenMsMedian: median(of('firstTokenMs')), doneMsMedian: median(of('doneMs')) };
}
export function summarize(rows: readonly CaseRun[]) {
  const rate = (subset: readonly CaseRun[]) => (subset.length ? subset.filter(row => row.outcome === 'pass').length / subset.length : null);
  const families = [...new Set(rows.map(row => row.family))];
  const cases = [...new Set(rows.map(row => row.id))];
  return {
    runs: rows.length,
    passRate: rate(rows),
    byFamily: Object.fromEntries(families.map(family => [family, rate(rows.filter(row => row.family === family))])),
    // A case that passes on some runs and fails on others is noise to settle before comparing.
    unstableCases: cases.filter(id => new Set(rows.filter(row => row.id === id).map(row => row.outcome)).size > 1),
    failingCases: cases.filter(id => rows.filter(row => row.id === id).every(row => row.outcome !== 'pass')),
    errors: rows.filter(row => row.outcome === 'error').length,
    medianTurnMs: [...rows.map(row => row.ms)].sort((a, b) => a - b)[Math.floor((rows.length - 1) / 2)] ?? null,
  };
}

function git(args: readonly string[]) { try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim(); } catch { return null; } }
/** Binds a result to the source and case set that produced it. */
export function sourceBinding() {
  return {
    head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain', '--untracked-files=no']) !== '',
    upstreamPin: JSON.parse(fs.readFileSync(path.join(root, 'upstream.lock.json'), 'utf8')).commit,
    caseSet: CASESET_SHA256,
    caseSetRevision: CASESET_REVISION,
  };
}
function loopback(origin: string) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/' || url.search || url.username) throw Error('The evaluation talks only to a loopback resident runtime origin');
  return url.origin;
}
interface Proposal { id: string; digest: string; state: string; payload?: { operation?: { type?: string } & Record<string, unknown> } }

/** Sends every case `runs` times; every proposal a turn caused is rejected before the next turn. */
export async function evaluate({ origin, token, cases = CASES, followUps = FOLLOW_UPS, runs = 1, pauseMs = 0, oneConversation = false, askBefore = false, streamMode = false, now = () => new Date() }: {
  origin: string; token: string; cases?: readonly PhoneCase[]; followUps?: readonly PhoneCase[]; runs?: number; pauseMs?: number; oneConversation?: boolean; askBefore?: boolean; streamMode?: boolean; now?: () => Date;
}) {
  const base = loopback(origin), installationId = randomUUID();
  const device: Record<string, string> = { 'X-Eliza-Device-Id': installationId, 'X-Eliza-Device-Key': randomBytes(32).toString('hex'), 'X-Eliza-Device-Capabilities': alphaImageCapabilities([]).join(',') };
  const call = async <T = unknown>(pathname: string, body?: unknown): Promise<T> => {
    const response = await fetch(base + pathname, { method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...device }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw Error(`${pathname.split('/').slice(0, 4).join('/')} returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  };
  // Like the phone's resident stream: status labels are the transient
  // acknowledgement ('thinking') and activity ('running_tool'); the done frame carries the reply.
  const streamTurn = async (pathname: string, body: unknown, row: CaseRun): Promise<{ text?: string }> => {
    const sent = Date.now();
    const response = await fetch(base + pathname, { method: 'POST', headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...device }, body: JSON.stringify(body) });
    if (!response.ok || !response.body) throw Error(`${pathname.split('/').slice(0, 4).join('/')} returned HTTP ${response.status}`);
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', done: { fullText?: string } | undefined;
    const stats: StreamStats = {};
    while (!done) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
        if (!data) continue;
        let value; try { value = JSON.parse(data); } catch { continue; }
        const at = Date.now() - sent;
        if (value.type === 'status') {
          const label = typeof value.label === 'string' ? value.label.trim() : '';
          if (value.kind === 'thinking' && label && stats.ackMs === undefined) { stats.ackMs = at; stats.ack = label.slice(0, 160); }
          if (value.kind === 'running_tool' && label && stats.activityMs === undefined) { stats.activityMs = at; stats.activity = label.slice(0, 60); }
          if (stats.firstStatusMs === undefined) stats.firstStatusMs = at;
        } else if (value.type === 'token') {
          if (stats.firstTokenMs === undefined && value.provisional !== true) stats.firstTokenMs = at;
        } else if (value.type === 'error') {
          throw Error(`stream error ${String(value.failureKind ?? value.code ?? '')}`.trim());
        } else if (value.type === 'done') {
          stats.doneMs = at; done = value;
        }
      }
    }
    await reader.cancel().catch(() => {});
    row.stream = stats;
    if (!done) throw Error('stream ended without a done frame');
    return { text: done.fullText };
  };
  const registered = await call<{ installationId: string; capabilities: string[] }>('/api/client-devices/register', { label: 'Alpha phone-action eval', workflowProtocol: 0 });
  if (registered.installationId !== installationId) throw Error('Device registration was not verified');
  // The phone's own selection over what the agent offered.
  const negotiated = alphaImageCapabilities(Array.isArray(registered.capabilities) ? registered.capabilities : []);
  device['X-Eliza-Device-Capabilities'] = negotiated.join(',');
  const startedAt = now();
  let revoked = false;
  try {
    const listProposals = async () => (await call<{ proposals: Proposal[] }>('/api/client-devices/proposals')).proposals;
    const seen = new Set((await listProposals()).map(proposal => proposal.id));
    // Called before each turn and at the end, so a proposal that lands late is rejected
    // and counted as stray instead of being credited to the next case.
    const rejectUnseen = async () => {
      const created = (await listProposals()).filter(proposal => !seen.has(proposal.id));
      for (const proposal of created) {
        seen.add(proposal.id);
        if (proposal.state === 'pending') await call(`/api/client-devices/proposals/${encodeURIComponent(proposal.id)}/decision`, { digest: proposal.digest, decision: 'reject' });
      }
      return created;
    };
    const rows: CaseRun[] = [];
    let strayProposals = 0;
    const open = async (title: string) => (await call<{ conversation: { id: string } }>('/api/conversations', { title })).conversation.id;
    for (let run = 1; run <= runs; run++) {
      const shared = oneConversation ? await open(`Phone-action eval run ${run}`) : null;
      for (const item of shared ? [...cases, ...followUps] : cases) {
        const row: CaseRun = { id: item.id, family: item.family, run, outcome: 'error', proposed: [], ms: 0 };
        const began = Date.now();
        try {
          strayProposals += (await rejectUnseen()).length;
          const conversation = shared ?? await open(`Phone-action eval ${item.id}`);
          const context = { view: item.view, revision: 1, sensitive: false, timeZone: 'America/New_York' };
          const messageBody = { text: item.text, channelType: 'DM', metadata: { ...(askBefore ? {} : { agentActionMode: 'direct-request-v1' }), uiTimeZone: context.timeZone, clientDevice: { context } }, clientMessageId: randomUUID() };
          const reply = streamMode ? await streamTurn(`/api/conversations/${encodeURIComponent(conversation)}/messages/stream`, messageBody, row) : await call<{ text?: string }>(`/api/conversations/${encodeURIComponent(conversation)}/messages`, messageBody);
          const operations = (await rejectUnseen()).map(proposal => proposal.payload?.operation ?? {});
          row.proposed = operations.map(operation => operation.type ?? 'unknown');
          row.outcome = judgeTurn(item, operations, String(reply.text ?? ''));
          row.replyChars = String(reply.text ?? '').length;
          // The requests are synthetic, so the start of the reply is kept for reading a verdict later.
          row.reply = String(reply.text ?? '').slice(0, 300);
        } catch (error) {
          row.error = (error instanceof Error ? error.message : String(error)).slice(0, 200);
        }
        row.ms = Date.now() - began;
        rows.push(row);
        if (pauseMs > 0) await new Promise(resolve => setTimeout(resolve, pauseMs));
      }
    }
    strayProposals += (await rejectUnseen()).length;
    await call('/api/client-devices/revoke', {}); revoked = true;
    return { version: 1, kind: 'phone-actions', conversations: oneConversation ? 'one-per-run' : 'one-per-case', actionMode: askBefore ? 'ask-before' : 'direct-request-v1', recordedAt: startedAt.toISOString(), expectedModel: AGENT_MODEL, deviceProfile: DEVICE_PROFILE, negotiatedCapabilities: negotiated, source: sourceBinding(), summary: { ...summarize(rows), strayProposals, ...(streamMode ? { acknowledgements: summarizeStream(rows) } : {}) }, rows };
  } finally {
    if (!revoked) await call('/api/client-devices/revoke', {}).catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flag = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const origin = flag('--origin'), tokenFile = flag('--token-file'), output = flag('--output');
  const runs = Number(flag('--runs') ?? 1), pauseMs = Number(flag('--pause-ms') ?? 0);
  if (!origin || !tokenFile || !output || !Number.isInteger(runs) || runs < 1 || !(pauseMs >= 0)) {
    console.error('Usage: eval-phone-actions.ts --origin <loopback> --token-file <file> --output <json> [--runs <n>] [--pause-ms <n>] [--one-conversation] [--ask-before] [--stream] [--only <case id>[,...]] [--database <resident .elizadb>]');
    process.exit(2);
  }
  const only = flag('--only')?.split(',').filter(Boolean);
  const unknown = only?.filter(id => ![...CASES, ...FOLLOW_UPS].some(item => item.id === id)) ?? [];
  if (unknown.length || only?.length === 0) {
    console.error(`Unknown case: ${unknown.join(', ') || '(none named)'}`);
    process.exit(2);
  }
  const result = await evaluate({ origin, token: fs.readFileSync(tokenFile, 'utf8').trim(), runs, pauseMs, oneConversation: args.includes('--one-conversation'), streamMode: args.includes('--stream'), askBefore: args.includes('--ask-before'), ...(only ? { cases: CASES.filter(item => only.includes(item.id)), followUps: FOLLOW_UPS.filter(item => only.includes(item.id)) } : {}) });
  const database = flag('--database');
  // The run's own model calls, read from the resident's records after the last turn.
  const usage = database ? audit((await loadCalls(database)).filter(call => call.at >= Date.parse(result.recordedAt))) : null;
  const tokens = usage && { calls: usage.calls, inputTokens: usage.inputTokens, providerUsage: usage.providerUsage, perTurnP50: usage.turns.tokensP50, perTurnP90: usage.turns.tokensP90, stages: usage.stages };
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ ...result, tokens }, null, 2)}\n`);
  console.log(JSON.stringify({ ...result.summary, inputTokens: tokens?.inputTokens }));
}
