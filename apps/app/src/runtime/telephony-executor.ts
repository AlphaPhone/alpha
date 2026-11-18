/**
 * Runs one agent-proposed telephony action on the verified Alpha image after the owner approved it
 * (shared contract: `@elizaos/contracts/telephony-actions`; models: PhoneCalls.qnt and
 * ContactsBook.qnt; MessageThreads.qnt for a draft placed in the open conversation). The agent names a contact by search text and never receives the address book:
 * the lookup happens here, the owner sees the exact name and number (or the before and after) on the
 * phone, and only then does anything call, send or write. Each path returns exactly what was
 * observed; nothing is retried, and a contact that changed since it was shown is `stale`.
 *
 * Everything the phone does goes through `ports`, so the decisions here are testable without one.
 */
import {
  smsComposeReceiptOutcome, smsComposeTarget, telephonyActionReceiptOutcome, validateContactReadResult,
  type ContactReadResult, type ContactShowOperation, type ContactShowResult, type ContactWriteOperation, type ContactWriteResult, type PhoneCallOperation, type PhoneCallResult,
  type SmsComposeOperation, type SmsComposeResult, type TelephonyActionOperation, type TelephonyActionResult,
} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts';
import {contactLookupMatches} from '../../../../.eliza/client-features/packages/contracts/src/phone-dial.ts';
import {telephonyActionResultText} from '../ui/telephony/telephony-receipt-text';
import {contactChoiceName} from '../ui/telephony/telephony-messages';

export type ContactMatch = {id: string; name: string; number: string};
export type ContactRecord = {id: string; version: string; displayName: string; phoneNumbers: {number: string; type: string}[]; emailAddresses: {address: string; type: string}[]};
export type ContactDraft = Omit<ContactRecord, 'id' | 'version'>;
/** What the owner is shown on the phone before a telephony action takes effect. */
export type TelephonyReview =
  | {kind: 'call'; options: ContactMatch[]}
  | {kind: 'message'; options: ContactMatch[]; body: string}
  /** A new contact whose name or number is already in Contacts: the one option adds it anyway. */
  | {kind: 'contact-create'; options: {name: string; numbers: string[]}[]}
  /** `keeps`: one whole-field request shown twice for one contact, adding to its numbers and addresses or replacing them. */
  | {kind: 'contact-save'; options: {before: ContactRecord; after: ContactDraft; keeps?: 'add' | 'replace'}[]}
  | {kind: 'contact-delete'; options: ContactRecord[]};
export type TelephonyPorts = {
  /** Throws when the review is no longer current (hidden, locked, context or session changed). */
  current(): void;
  /** Shows the review and resolves with the chosen option's index, or null when dismissed. */
  ask(review: TelephonyReview, signal: AbortSignal): Promise<number | null>;
  normalize(number: string): string | null;
  searchContacts(query: string, limit: number): Promise<{id: string; displayName: string; phoneNumbers: string[]}[]>;
  placeCall(number: string): Promise<{status: 'placed' | 'emergency-handoff' | 'busy' | 'unavailable' | 'failed'}>;
  getContact(id: string): Promise<ContactRecord>;
  saveContact(draft: ContactDraft, target?: {id: string; version: string}): Promise<{status: 'saved' | 'stale' | 'not-found' | 'failed' | 'unknown'}>;
  removeContact(id: string, version: string): Promise<{status: 'deleted' | 'stale' | 'not-found' | 'failed' | 'unknown'}>;
  /** The native reviewed send of one SMS under `operationId`; a repeated id never sends twice. */
  sendSms(number: string, body: string, operationId: string, signal: AbortSignal): Promise<SmsComposeResult['status']>;
  /**
   * Puts a draft in the draft slot of the conversation the owner has open (only the one with exactly
   * `number`, when given), replacing any unsent text, which is kept for one Undo. `occupied`: a
   * message is being sent or has pictures attached there. Nothing is sent: Send stays the owner's tap.
   */
  draftInOpenThread(body: string, number?: string): 'drafted' | 'none-selected' | 'occupied' | 'unavailable';
  /**
   * The step that opens the conversation with exactly `number` in Messages (a new message when
   * there is none) and puts `body` in its text field; null when Messages cannot take a draft now.
   * Nothing is sent. Opening another view ends the review an action runs under, so the executor
   * hands the step back as `present` and the coordinator runs it once the receipt is recorded.
   */
  draftFor(number: string, body: string): Promise<(() => void) | null>;
  /**
   * Looks `query` up as the Contacts list will: the step that brings Contacts in front filtered by
   * it (handed back like `draftFor`'s), 'not-found' when the list would be empty, null when
   * Contacts cannot be read or opened.
   */
  showContacts(query: string): Promise<(() => void) | 'not-found' | null>;
  /**
   * The step that brings the Phone keypad in front, with `number` filled in when given (handed
   * back like `draftFor`'s); null when Phone cannot be shown now. It never dials or calls.
   */
  openKeypad(number?: string): (() => void) | null;
  /** The contact open in Contacts as the phone holds it now; 'unavailable' when it cannot be read whole; null when none is open. */
  openContact(): Pick<ContactDraft, 'displayName' | 'phoneNumbers' | 'emailAddresses'> | 'unavailable' | null;
  /** The agent negotiated `contacts.write.v2`: it names each value to add or remove, so a `set` it sends replaces the field. */
  contactValues: boolean;
  openThread(): {participant: string | null; messages: {direction: 'in' | 'out'; date: number; body: string}[]; truncated: boolean} | null;
  openVoicemail(): {caller: string | null; date: number; durationSeconds: number; transcriptState: 'ready' | 'pending' | 'unavailable' | 'failed'; engine: 'device' | 'cloud' | 'carrier' | null; transcript: string | null} | null;
  deleteOpenVoicemail(current: () => void, signal: AbortSignal): Promise<'deleted' | 'none-selected' | 'cancelled' | 'failed'>;
};
/** `present`: the view change that shows a successful outcome (the drafted conversation, the filtered Contacts list), run by the coordinator after the receipt. */
export type TelephonyExecution = {status: 'succeeded' | 'failed' | 'unknown'; summary: string; telephonyResult: TelephonyActionResult; present?: () => void};
type Present = (step: () => void) => void;

const LOOKUP_LIMIT = 10;
export const CONTACT_CALL_LOOKUP_LIMIT = LOOKUP_LIMIT;
/**
 * AP-16 D5: an Alpha draft now replaces the owner's unsent text (kept for one Undo), so `occupied`
 * means only that a message is being sent or has pictures attached. The shared contract's sentence
 * still describes the old rule until ap16-alpha-sms-reply-occupied-text lands upstream.
 */
export const SMS_DRAFT_OCCUPIED_TEXT = 'That conversation has a message sending or pictures attached.';
const resultText = (result: TelephonyActionResult) => result.kind === 'sms-reply' && result.status === 'occupied' ? SMS_DRAFT_OCCUPIED_TEXT : telephonyActionResultText(result);
const finish = (result: TelephonyActionResult): TelephonyExecution => {
  const outcome = result.kind === 'sms-compose' ? smsComposeReceiptOutcome(result) : telephonyActionReceiptOutcome(result);
  return {status: outcome === 'applied' ? 'succeeded' : outcome === 'unknown' ? 'unknown' : 'failed', summary: resultText(result), telephonyResult: result};
};
/** Every dialable number of every matching contact, one option per number: the choices the owner
 * is shown before a call to a contact (and what the AC-20 approval card counts). */
export function contactCallOptions(rows: {id: string; displayName: string; phoneNumbers: string[]}[], normalize: (number: string) => string | null): ContactMatch[] {
  // Matches keep the rows' order; each name is read from its own row, so a blank one reads as Alpha's label.
  let next = 0;
  return contactLookupMatches(rows, normalize).flatMap(match => {
    while (next < rows.length && rows[next].id !== match.id) next++;
    const row = rows[next++];
    const name = row ? contactChoiceName(row.displayName) : contactChoiceName('');
    return match.phoneNumbers.map(number => ({id: match.id, name, number}));
  });
}
/** The code of a native rejection (`call.reject(message, code)`): the phone refused before it acted. */
const refusalCode = (error: unknown): string | null => { const code = (error as {code?: unknown} | null)?.code; return typeof code === 'string' ? code : null; };
/** An action refused before anything ran (Alpha hidden or locked): the typed "unavailable" result of its kind, with the reason as the summary. */
export function refuseTelephonyAction(operation: TelephonyActionOperation, summary: string): TelephonyExecution {
  const unavailable = (): TelephonyActionResult => {
    switch (operation.type) {
      case 'phone_call': return {kind: 'phone-call', status: 'unavailable', contact: false};
      case 'sms_compose': return {kind: 'sms-compose', status: 'unavailable'};
      case 'sms_reply_selected': return {kind: 'sms-reply', status: 'unavailable'};
      case 'phone_keypad': return {kind: 'phone-keypad', status: 'unavailable'};
      case 'contact_create': case 'contact_update': case 'contact_delete': return {kind: 'contact-write', status: 'unavailable'};
      case 'contact_show': return {kind: 'contact-show', status: 'unavailable'};
      case 'contact_read_selected': return {kind: 'contact-read', status: 'unavailable'};
      case 'messages_read_selected': return {kind: 'messages-read', status: 'unavailable'};
      case 'voicemail_read_selected': return {kind: 'voicemail-read', status: 'unavailable'};
      case 'voicemail_delete_selected': return {kind: 'voicemail-delete', status: 'unavailable'};
    }
  };
  return {...finish(unavailable()), summary};
}
async function numbers(query: string, ports: TelephonyPorts): Promise<ContactMatch[]> {
  return contactCallOptions(await ports.searchContacts(query, LOOKUP_LIMIT), value => ports.normalize(value));
}

async function call(operation: PhoneCallOperation, ports: TelephonyPorts, signal: AbortSignal): Promise<PhoneCallResult> {
  const contact = operation.target.kind === 'contact';
  let number: string;
  if (operation.target.kind === 'number') number = operation.target.number;
  else {
    let options: ContactMatch[];
    try { options = await numbers(operation.target.query, ports); } catch { return {kind: 'phone-call', status: 'unavailable', contact: false}; }
    ports.current();
    if (!options.length) return {kind: 'phone-call', status: 'not-found', contact: false};
    // A name is never called unseen: the owner confirms or chooses the exact number, even for one match.
    const choice = await ports.ask({kind: 'call', options}, signal);
    if (choice === null || !options[choice]) return {kind: 'phone-call', status: 'cancelled', contact: false};
    number = options[choice].number;
  }
  ports.current();
  // A lost native reply may follow an accepted call; the coordinator keeps that outcome unknown.
  // A coded rejection is the phone refusing before Telecom was asked (no phone-app role, no call access): nothing was called.
  try { return {kind: 'phone-call', status: (await ports.placeCall(number)).status, contact}; }
  catch (error) { if (!refusalCode(error)) throw error; return {kind: 'phone-call', status: 'unavailable', contact}; }
}

async function compose(operation: SmsComposeOperation, operationId: string, ports: TelephonyPorts, signal: AbortSignal, present: Present): Promise<SmsComposeResult> {
  const result = (status: SmsComposeResult['status']): SmsComposeResult => ({kind: 'sms-compose', status});
  const target = smsComposeTarget(operation), draftOnly = 'draft' in operation && operation.draft === true;
  // When that person's conversation is already open, the draft goes into its text field, where the
  // owner can edit it; the separate review is for a conversation that is not on screen.
  const inOpenThread = (number: string) => ports.draftInOpenThread(operation.body, number);
  let number: string, placed: ReturnType<typeof inOpenThread>;
  if (target.kind === 'number') {
    // The approval card showed this exact number (`sms.compose.v2`), so nothing is asked again here.
    number = target.number; placed = inOpenThread(number);
  } else {
    let options: ContactMatch[];
    try { options = await numbers(target.query, ports); } catch { return result('unavailable'); }
    ports.current();
    if (!options.length) return result('not-found');
    const only = options.length === 1 ? inOpenThread(options[0].number) : null;
    if (only === 'drafted') return result('drafted');
    // A name is never texted unseen: the lookup is a fuzzy filter and the native review shows only the
    // number, so the owner confirms or chooses the matched name and number here, even for one match.
    const choice = await ports.ask({kind: 'message', options, body: operation.body}, signal);
    if (choice === null || !options[choice]) return result('cancelled');
    ports.current();
    number = options[choice].number; placed = only ?? inOpenThread(number);
  }
  if (placed === 'drafted') return result('drafted');
  if (draftOnly) {
    // A draft-only request never reaches the send review. That conversation is opened with the text
    // in its field; one that is open but busy (a send in flight, pictures attached) is left alone.
    if (placed !== 'none-selected') return result('unavailable');
    let step: (() => void) | null;
    try { step = await ports.draftFor(number, operation.body); } catch { return result('unavailable'); }
    ports.current();
    if (!step) return result('unavailable');
    present(step);
    return result('drafted');
  }
  // The port answers every outcome it observed, including a refusal before anything was sent. It
  // throws only when the native review's answer was lost: the radio may have taken the message.
  // Outside Messages it sends from Android's default SMS SIM, which the native review names.
  try { return result(await ports.sendSms(number, operation.body, operationId, signal)); }
  catch { return result('unknown'); }
}

type ContactUpdate = Extract<ContactWriteOperation, {type: 'contact_update'}>;
type ContactSet = NonNullable<ContactUpdate['set']>;
/** Numbers and addresses to put on a contact beside the ones it has, or to take off it. */
export type ContactValues = Pick<ContactSet, 'phoneNumbers' | 'emailAddresses'>;
/**
 * `set` replaces a named field whole. Then the `remove` values are taken away and the `add` values
 * the contact does not hold yet are appended; every other value stays. Numbers match in their
 * dialable form and addresses without case, and a value already on the contact keeps its type.
 */
export function appliedContactChange(before: ContactRecord, set: ContactSet, normalize: (number: string) => string | null, add: ContactValues = {}, remove: ContactValues = {}): ContactDraft {
  const key = (number: string) => normalize(number) || number, mail = (address: string) => address.toLowerCase();
  const gone = (values: string[] | undefined, same: (value: string) => string, value: string) => !!values?.some(other => same(other) === same(value));
  const phoneNumbers = (set.phoneNumbers ? set.phoneNumbers.map(number => ({number, type: before.phoneNumbers.find(row => key(row.number) === key(number))?.type || 'mobile'})) : before.phoneNumbers).filter(row => !gone(remove.phoneNumbers, key, row.number));
  const emailAddresses = (set.emailAddresses ? set.emailAddresses.map(address => ({address, type: before.emailAddresses.find(row => mail(row.address) === mail(address))?.type || 'home'})) : before.emailAddresses).filter(row => !gone(remove.emailAddresses, mail, row.address));
  return {
    displayName: set.displayName ?? before.displayName,
    phoneNumbers: [...phoneNumbers, ...(add.phoneNumbers || []).filter((number, index, all) => !phoneNumbers.some(row => key(row.number) === key(number)) && all.findIndex(other => key(other) === key(number)) === index).map(number => ({number, type: 'mobile'}))],
    emailAddresses: [...emailAddresses, ...(add.emailAddresses || []).filter((address, index, all) => !emailAddresses.some(row => mail(row.address) === mail(address)) && all.findIndex(other => mail(other) === mail(address)) === index).map(address => ({address, type: 'home'}))],
  };
}
/**
 * What the owner is offered for one matching contact: its fields before and after the change.
 * `values`: the agent negotiated `contacts.write.v2` and names each value to add or remove. An agent
 * without it cannot, so "add this number" reaches the phone as a whole-field `set`: when that would
 * drop a number or address the contact has, the owner chooses between adding to them and replacing them.
 */
export function contactChangeOptions(before: ContactRecord, operation: Pick<ContactUpdate, 'set' | 'add' | 'remove'>, normalize: (number: string) => string | null, values: boolean): Extract<TelephonyReview, {kind: 'contact-save'}>['options'] {
  const {set = {}, add, remove} = operation, change = appliedContactChange(before, set, normalize, add, remove);
  if (values || add || remove) return [{before, after: change}];
  const kept = appliedContactChange(before, set.displayName === undefined ? {} : {displayName: set.displayName}, normalize, set);
  const fields = (draft: ContactDraft) => draft.phoneNumbers.length + draft.emailAddresses.length;
  return fields(kept) === fields(change) ? [{before, after: change}] : [{before, after: kept, keeps: 'add'}, {before, after: change, keeps: 'replace'}];
}
/** The matching contacts the editor can read completely; null when some matched but none can be offered. */
async function records(query: string, ports: TelephonyPorts): Promise<ContactRecord[] | null> {
  const rows = await ports.searchContacts(query, LOOKUP_LIMIT), found: ContactRecord[] = [];
  for (const row of rows) {
    try { found.push(await ports.getContact(row.id)); }
    // Only a contact that is gone, or holds more than the editor can read, is left out. Any other
    // failed read (Contacts closed or paused) is not "no match".
    catch (error) { const code = refusalCode(error); if (code !== 'incomplete' && code !== 'not-found') throw error; }
  }
  return rows.length && !found.length ? null : found;
}
async function write(operation: ContactWriteOperation, ports: TelephonyPorts, signal: AbortSignal): Promise<ContactWriteResult> {
  const result = (status: ContactWriteResult['status']): ContactWriteResult => ({kind: 'contact-write', status});
  let dispatched=false;
  try {
    if (operation.type === 'contact_create') {
      // The approval the owner already gave showed every field of the new contact. A contact with
      // the same name or one of its numbers is shown first, so the same person is not added twice unseen.
      const {contact} = operation, key = (number: string) => ports.normalize(number) || number, wanted = contact.phoneNumbers.map(key);
      const twin = (await ports.searchContacts(contact.displayName, LOOKUP_LIMIT)).find(row =>
        row.displayName.trim().toLowerCase() === contact.displayName.toLowerCase() || row.phoneNumbers.some(number => wanted.includes(key(number))));
      ports.current();
      if (twin) {
        if (await ports.ask({kind: 'contact-create', options: [{name: contactChoiceName(twin.displayName), numbers: twin.phoneNumbers}]}, signal) !== 0) return result('cancelled');
        ports.current();
      }
      dispatched=true;
      const saved = await ports.saveContact({displayName: contact.displayName,
        phoneNumbers: contact.phoneNumbers.map(number => ({number, type: 'mobile'})), emailAddresses: contact.emailAddresses.map(address => ({address, type: 'home'}))});
      return result(saved.status === 'saved' ? 'saved' : saved.status === 'unknown' ? 'unknown' : 'failed');
    }
    const found = await records(operation.query, ports);
    ports.current();
    if (!found) return result('unavailable');
    if (!found.length) return result('not-found');
    if (operation.type === 'contact_update') {
      // Each change is worked out against the contact as the phone holds it now, and shown before and after.
      const options = found.flatMap(before => contactChangeOptions(before, operation, ports.normalize, ports.contactValues));
      const choice = await ports.ask({kind: 'contact-save', options}, signal);
      if (choice === null || !options[choice]) return result('cancelled');
      ports.current();
      // The write names the version the owner was shown; a contact that changed since is stale.
      dispatched=true;
      return result((await ports.saveContact(options[choice].after, {id: options[choice].before.id, version: options[choice].before.version})).status);
    }
    const choice = await ports.ask({kind: 'contact-delete', options: found}, signal);
    if (choice === null || !found[choice]) return result('cancelled');
    ports.current();
    dispatched=true;
    return result((await ports.removeContact(found[choice].id, found[choice].version)).status);
  } catch (error) {
    if (signal.aborted) throw error;
    // A coded rejection is the phone refusing before it touched the address book (no write access,
    // Contacts closed, an invalid draft, a contact that is gone): nothing was changed.
    const code = refusalCode(error);
    if (code === 'not-found' && operation.type !== 'contact_create') return result('not-found');
    if (code) return result(code === 'invalid' || code === 'not-found' ? 'failed' : 'unavailable');
    return result(dispatched?'unknown':'unavailable');
  }
}

/** Contacts filtered to the matches on the phone. The agent learns only whether there was one. */
async function show(operation: ContactShowOperation, ports: TelephonyPorts, present: Present): Promise<ContactShowResult> {
  const result = (status: ContactShowResult['status']): ContactShowResult => ({kind: 'contact-show', status});
  let step: Awaited<ReturnType<TelephonyPorts['showContacts']>>;
  try { step = await ports.showContacts(operation.query); } catch { return result('unavailable'); }
  ports.current();
  if (step === 'not-found') return result('not-found');
  if (!step) return result('unavailable');
  present(step);
  return result('shown');
}
/** The open contact's name, numbers and addresses, whole and within the contract's bounds, or not at all. */
function readOpenContact(ports: TelephonyPorts): ContactReadResult {
  const open = ports.openContact();
  if (!open) return {kind: 'contact-read', status: 'none-selected'};
  if (open === 'unavailable') return {kind: 'contact-read', status: 'unavailable'};
  try {
    return validateContactReadResult({kind: 'contact-read', status: 'read', contact: {displayName: open.displayName.trim() ? open.displayName : null,
      phoneNumbers: open.phoneNumbers.map(row => row.number), emailAddresses: open.emailAddresses.map(row => row.address)}});
  } catch { return {kind: 'contact-read', status: 'unavailable'}; }
}

export async function executeTelephonyAction(operation: TelephonyActionOperation, operationId: string, ports: TelephonyPorts, signal: AbortSignal): Promise<TelephonyExecution> {
  signal.throwIfAborted(); ports.current();
  let step: (() => void) | undefined;
  const present: Present = next => { step = next; };
  const execution = finish(await observed(operation, operationId, ports, signal, present));
  return step && execution.status === 'succeeded' ? {...execution, present: step} : execution;
}
async function observed(operation: TelephonyActionOperation, operationId: string, ports: TelephonyPorts, signal: AbortSignal, present: Present): Promise<TelephonyActionResult> {
  switch (operation.type) {
    case 'phone_call': return call(operation, ports, signal);
    case 'sms_compose': return compose(operation, operationId, ports, signal, present);
    case 'sms_reply_selected': return {kind: 'sms-reply', status: ports.draftInOpenThread(operation.body)};
    case 'phone_keypad': {
      // The keypad in front, filled in at most: only the owner's Call tap there places a call.
      const step = ports.openKeypad(operation.number);
      if (!step) return {kind: 'phone-keypad', status: 'unavailable'};
      present(step);
      return {kind: 'phone-keypad', status: 'opened'};
    }
    case 'contact_create': case 'contact_update': case 'contact_delete': return write(operation, ports, signal);
    case 'contact_show': return show(operation, ports, present);
    case 'contact_read_selected': return readOpenContact(ports);
    case 'messages_read_selected': {
      const thread = ports.openThread();
      return thread ? {kind: 'messages-read', status: 'read', ...thread} : {kind: 'messages-read', status: 'none-selected'};
    }
    case 'voicemail_read_selected': {
      const voicemail = ports.openVoicemail();
      return voicemail ? {kind: 'voicemail-read', status: 'read', ...voicemail} : {kind: 'voicemail-read', status: 'none-selected'};
    }
    case 'voicemail_delete_selected': return {kind: 'voicemail-delete', status: await ports.deleteOpenVoicemail(() => ports.current(), signal)};
  }
}
