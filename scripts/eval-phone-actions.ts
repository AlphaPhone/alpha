#!/usr/bin/env bun
/**
 * Scores which phone operation the resident agent proposes for a fixed set of requests,
 * so a change to what the agent's model is sent can be compared before and after.
 *
 * It talks to a loopback resident runtime (for example `bun run dev`) that has a hosted
 * text model. It enrolls one synthetic phone with the capabilities an Alpha-image phone
 * negotiates, sends each case in its own conversation with the screen the case names, and
 * reads the durable device proposals the turn created. Every proposal is rejected at
 * once: nothing is approved or executed, and no phone effect can occur. The synthetic
 * phone is revoked when the run ends; its conversations stay in the runtime's history.
 *
 *   bun scripts/eval-phone-actions.ts --origin http://127.0.0.1:47849 \
 *     --token-file <paired-machine-token> --output test-results/phone-actions.json \
 *     [--runs 3] [--pause-ms 4000] [--one-conversation] [--only <case id>[,...]]
 *     [--database <resident .elizadb>]
 *
 * With --only the run sends just the named cases, to repeat the few a change is about.
 * With --one-conversation every case of a run is sent in the same conversation, in order,
 * the way an owner uses a phone for a while: each request then carries the turns before
 * it, which is where history, caching and the per-minute limit show.
 *
 * A pass means the proposals matched the case's expectation. It says nothing about reply
 * wording, about actions that are not device proposals (Maps, Notes, Calendar records),
 * or about a real phone. Scores compare only within one case-set revision and profile.
 * With --database the result also carries the tokens the run's model calls used.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_MODEL } from './agent-model.ts';
import { audit, loadCalls } from './agent-context-audit.ts';
import { selectDeviceCapabilities } from '../apps/app/src/runtime/phone-context.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
/** An Alpha-image phone: every reviewed surface the launcher can run. */
export const DEVICE_PROFILE = Object.freeze({ android: true, native: true, camera: true, foregroundReview: true, canonicalNotes: true, photoLibrary: true, files: true, clockRepeatDays: true, aospImage: true });
const CASESET_REVISION = 1;

/**
 * `expect` lists what the turn must propose: each entry is a set of acceptable operation
 * types (a trailing `*` matches a prefix), and every entry needs a matching proposal. An
 * empty list means the turn must create no device proposal (a reply, a view change, or a
 * canonical Notes/Calendar/Maps action).
 */
export interface PhoneCase { id: string; family: string; view: string; text: string; expect: readonly (readonly string[])[] }
const CALL = ['phone_call', 'phone_dial'], TEXT = ['sms_compose', 'sms_send'], CLOCK = ['clock_*'];
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
  { id: 'timer-from-notes', family: 'clock', view: 'notes', text: 'Set a timer for 10 minutes.', expect: [CLOCK] },
  { id: 'new-tab', family: 'browser', view: 'browser', text: 'Open a new tab.', expect: [['browser_tab_new']] },
  { id: 'open-site', family: 'browser', view: 'home', text: 'Open example.com.', expect: [['browser_navigate', 'browser_tab_new']] },
  { id: 'find-in-page', family: 'browser', view: 'browser', text: 'Find "refund" on this page.', expect: [['browser_find']] },
  { id: 'files', family: 'files', view: 'home', text: 'Show my PDFs in Files.', expect: [['files_*']] },
  { id: 'free-busy', family: 'calendar', view: 'home', text: 'Am I free tomorrow from 3pm to 4pm?', expect: [['calendar_availability']] },
  { id: 'text-and-alarm', family: 'multi', view: 'home', text: "Text Sam I'll be late, and set an alarm for 7am.", expect: [TEXT, CLOCK] },
  { id: 'call-or-text-choice', family: 'multi', view: 'home', text: 'Call Sam, and if you cannot, do nothing else.', expect: [CALL] },
  { id: 'open-messages', family: 'navigation', view: 'home', text: 'Open Messages.', expect: [] },
  { id: 'show-contacts', family: 'navigation', view: 'home', text: 'Show my contacts.', expect: [] },
  { id: 'open-camera', family: 'navigation', view: 'home', text: 'Open the camera.', expect: [] },
  { id: 'directions', family: 'other-actions', view: 'home', text: 'Directions to the Ferry Building in San Francisco.', expect: [] },
  { id: 'note', family: 'other-actions', view: 'home', text: 'Create a note called Groceries with milk and eggs.', expect: [] },
  { id: 'calendar-read', family: 'other-actions', view: 'calendar', text: "What's on my calendar tomorrow?", expect: [] },
  { id: 'question', family: 'chat', view: 'home', text: 'What is the capital of France?', expect: [] },
  { id: 'thanks', family: 'chat', view: 'home', text: 'Thanks!', expect: [] },
  { id: 'phone-question', family: 'chat', view: 'home', text: 'How do phone alarms differ from timers?', expect: [] },
]);
const CASESET_SHA256 = createHash('sha256').update(JSON.stringify(CASES)).digest('hex');

const matches = (type: string, pattern: string) => (pattern.endsWith('*') ? type.startsWith(pattern.slice(0, -1)) : type === pattern);
/** Every expectation needs a proposal, and every proposal must answer an expectation. */
export function judge(expect: PhoneCase['expect'], proposed: readonly string[]): 'pass' | 'missing' | 'unexpected' {
  if (expect.some(accepted => !proposed.some(type => accepted.some(pattern => matches(type, pattern))))) return 'missing';
  if (proposed.some(type => !expect.some(accepted => accepted.some(pattern => matches(type, pattern))))) return 'unexpected';
  return 'pass';
}

export interface CaseRun { id: string; family: string; run: number; outcome: ReturnType<typeof judge> | 'error'; proposed: string[]; ms: number; replyChars?: number; error?: string }
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
interface Proposal { id: string; digest: string; state: string; payload?: { operation?: { type?: string } } }

/** Sends every case `runs` times; every proposal a turn caused is rejected before the next turn. */
export async function evaluate({ origin, token, cases = CASES, runs = 1, pauseMs = 0, oneConversation = false, now = () => new Date() }: {
  origin: string; token: string; cases?: readonly PhoneCase[]; runs?: number; pauseMs?: number; oneConversation?: boolean; now?: () => Date;
}) {
  const base = loopback(origin), installationId = randomUUID();
  const device: Record<string, string> = { 'X-Eliza-Device-Id': installationId, 'X-Eliza-Device-Key': randomBytes(32).toString('hex'), 'X-Eliza-Device-Capabilities': selectDeviceCapabilities([], DEVICE_PROFILE).join(',') };
  const call = async <T = unknown>(pathname: string, body?: unknown): Promise<T> => {
    const response = await fetch(base + pathname, { method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...device }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw Error(`${pathname.split('/').slice(0, 4).join('/')} returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  };
  const registered = await call<{ installationId: string; capabilities: string[] }>('/api/client-devices/register', { label: 'Alpha phone-action eval', workflowProtocol: 0 });
  if (registered.installationId !== installationId) throw Error('Device registration was not verified');
  // The phone's own selection over what the agent offered.
  const negotiated = selectDeviceCapabilities(registered.capabilities, DEVICE_PROFILE);
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
      for (const item of cases) {
        const row: CaseRun = { id: item.id, family: item.family, run, outcome: 'error', proposed: [], ms: 0 };
        const began = Date.now();
        try {
          strayProposals += (await rejectUnseen()).length;
          const conversation = shared ?? await open(`Phone-action eval ${item.id}`);
          const context = { view: item.view, revision: 1, sensitive: false, timeZone: 'America/New_York' };
          const reply = await call<{ text?: string }>(`/api/conversations/${encodeURIComponent(conversation)}/messages`, { text: item.text, channelType: 'DM', metadata: { uiTimeZone: context.timeZone, clientDevice: { context } }, clientMessageId: randomUUID() });
          row.proposed = (await rejectUnseen()).map(proposal => proposal.payload?.operation?.type ?? 'unknown');
          row.outcome = judge(item.expect, row.proposed);
          row.replyChars = String(reply.text ?? '').length;
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
    return { version: 1, kind: 'phone-actions', conversations: oneConversation ? 'one-per-run' : 'one-per-case', recordedAt: startedAt.toISOString(), expectedModel: AGENT_MODEL, deviceProfile: DEVICE_PROFILE, negotiatedCapabilities: negotiated, source: sourceBinding(), summary: { ...summarize(rows), strayProposals }, rows };
  } finally {
    if (!revoked) await call('/api/client-devices/revoke', {}).catch(() => {});
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2), flag = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const origin = flag('--origin'), tokenFile = flag('--token-file'), output = flag('--output');
  const runs = Number(flag('--runs') ?? 1), pauseMs = Number(flag('--pause-ms') ?? 0);
  if (!origin || !tokenFile || !output || !Number.isInteger(runs) || runs < 1 || !(pauseMs >= 0)) {
    console.error('Usage: eval-phone-actions.ts --origin <loopback> --token-file <file> --output <json> [--runs <n>] [--pause-ms <n>] [--one-conversation] [--only <case id>[,...]] [--database <resident .elizadb>]');
    process.exit(2);
  }
  const only = flag('--only')?.split(',').filter(Boolean);
  const unknown = only?.filter(id => !CASES.some(item => item.id === id)) ?? [];
  if (unknown.length || only?.length === 0) {
    console.error(`Unknown case: ${unknown.join(', ') || '(none named)'}`);
    process.exit(2);
  }
  const result = await evaluate({ origin, token: fs.readFileSync(tokenFile, 'utf8').trim(), runs, pauseMs, oneConversation: args.includes('--one-conversation'), ...(only ? { cases: CASES.filter(item => only.includes(item.id)) } : {}) });
  const database = flag('--database');
  // The run's own model calls, read from the resident's records after the last turn.
  const usage = database ? audit((await loadCalls(database)).filter(call => call.at >= Date.parse(result.recordedAt))) : null;
  const tokens = usage && { calls: usage.calls, inputTokens: usage.inputTokens, providerUsage: usage.providerUsage, perTurnP50: usage.turns.tokensP50, perTurnP90: usage.turns.tokensP90, stages: usage.stages };
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ ...result, tokens }, null, 2)}\n`);
  console.log(JSON.stringify({ ...result.summary, inputTokens: tokens?.inputTokens }));
}
