/**
 * Runs one agent-proposed telephony action on the verified Alpha image after the owner approved it
 * (shared contract: `@elizaos/contracts/telephony-actions`; models: PhoneCalls.qnt and
 * ContactsBook.qnt; MessageThreads.qnt for a draft placed in the open conversation). The agent names
 * a contact by search text and never receives the address book:
 * the lookup happens here, the owner sees the exact name and number (or the before and after) on the
 * phone, and only then does anything call, send or write. Each path returns exactly what was
 * observed; nothing is retried, and a contact that changed since it was shown is `stale`.
 *
 * Everything the phone does goes through `ports`, so the decisions here are testable without one.
 */
import {
  smsComposeReceiptOutcome, smsComposeTarget, telephonyActionReceiptOutcome, validateContactReadResult,
  type ContactReadResult, type ContactShowOperation, type ContactShowResult, type ContactWriteOperation, type ContactWriteResult, type PhoneCallOperation, type PhoneCallResult,
  type SmsComposeOperation, type SmsComposeResult, type SmsLatestSenderMetadata, type TelephonyActionOperation, type TelephonyActionResult,
} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts';
import {contactLookupMatches} from '../../../../.eliza/client-features/packages/contracts/src/phone-dial.ts';
import {telephonyActionResultText} from '../ui/telephony/telephony-receipt-text';
import {contactChoiceName} from '../ui/telephony/telephony-messages';

type ContactMatch = {id: string; name: string; number: string};
export type ContactRecord = {id: string; version: string; displayName: string; phoneNumbers: {number: string; type: string}[]; emailAddresses: {address: string; type: string}[]};
export type ContactDraft = Omit<ContactRecord, 'id' | 'version'>;
/** What the owner is shown on the phone before a telephony action takes effect. */
/** `more`: more contacts match than the lookup lists, so the options are not every match. */
export type TelephonyReview =
  | {kind: 'call'; options: ContactMatch[]; more?: true}
  | {kind: 'message'; options: ContactMatch[]; body: string; more?: true; selectBeforeSending?: true}
  /** A new contact whose name or number is already in Contacts: the one option adds it anyway. */
  | {kind: 'contact-create'; options: {name: string; numbers: string[]}[]}
  /** `keeps`: one whole-field request shown twice for one contact, adding to its numbers and addresses or replacing them. */
  | {kind: 'contact-save'; options: {before: ContactRecord; after: ContactDraft; keeps?: 'add' | 'replace'}[]; more?: true}
  | {kind: 'contact-delete'; options: ContactRecord[]; more?: true};
/** The conversation the owner has open, as the agent may read it. */
export type OpenThread = {participant: string | null; messages: {direction: 'in' | 'out'; date: number; body: string}[]; truncated: boolean};
export type VoicemailDeleteResult = 'deleted' | 'none-selected' | 'cancelled' | 'failed';
export type TelephonyPorts = {
  /** Throws when the review is no longer current (hidden, locked, context or session changed). */
  current(): void;
  /** Shows the review and resolves with the chosen option's index, or null when dismissed. */
  ask(review: TelephonyReview, signal: AbortSignal): Promise<number | null>;
  normalize(number: string): string | null;
  searchContacts(query: string, limit: number): Promise<{id: string; displayName: string; phoneNumbers: string[]}[]>;
  /** The name of the contact holding `number`, by Android's own number matching over the whole address book; null when none does. */
  contactForNumber(number: string): Promise<string | null>;
  placeCall(number: string): Promise<{status: 'placed' | 'emergency-handoff' | 'busy' | 'unavailable' | 'failed'}>;
  getContact(id: string): Promise<ContactRecord>;
  saveContact(draft: ContactDraft, target?: {id: string; version: string}): Promise<{status: 'saved' | 'stale' | 'not-found' | 'failed' | 'unknown'}>;
  removeContact(id: string, version: string): Promise<{status: 'deleted' | 'stale' | 'not-found' | 'failed' | 'unknown'}>;
  /** The native send of one SMS the owner approved on its card, under `operationId`; a repeated id never sends twice. */
  sendSms(number: string, body: string, operationId: string, signal: AbortSignal): Promise<SmsComposeResult['status']>;
  /**
   * Puts a draft in the draft slot of the conversation the owner has open (only the one with exactly
   * `number`, when given), replacing any unsent text, which is kept for one Undo. `occupied`: a
   * message is being sent or has pictures attached there. Nothing is sent: Send stays the owner's tap.
   */
  draftInOpenThread(body: string, number?: string, replyThreadId?:string): 'drafted' | 'none-selected' | 'occupied' | 'unavailable';
  /**
   * The step that opens the conversation with exactly `number` in Messages (a new message when
   * there is none) and puts `body` in its text field; null when Messages cannot take a draft now.
   * Nothing is sent. Opening another view ends the review an action runs under, so the executor
   * hands the step back as `present` and the coordinator runs it once the receipt is recorded.
   */
  draftFor(number: string, body: string, replyThreadId?:string): Promise<(() => void) | null>;
  /**
   * Looks `query` up as the Contacts list will: the step that brings Contacts in front filtered by
   * it (handed back like `draftFor`'s), 'not-found' when the list would be empty, null when
   * Contacts cannot be read or opened.
   */
  showContacts(query: string): Promise<(() => void) | 'not-found' | null>;
  /**
   * The step that brings the Phone keypad in front, with `number` filled in when given (handed
   * back like `draftFor`'s); null when Phone cannot be shown now. It never dials or calls.
   * While Phone is busy reading recents or handing off a dial, the keypad and its number wait
   * and land when that clears, so an 'opened' receipt is not contradicted by an empty Recents.
   */
  openKeypad(number?: string): (() => void) | null;
  /** The contact open in Contacts as the phone holds it now; 'unavailable' when it cannot be read whole; null when none is open. */
  openContact(): Pick<ContactDraft, 'displayName' | 'phoneNumbers' | 'emailAddresses'> | 'unavailable' | null;
  /** The agent negotiated `contacts.write.v2`: it names each value to add or remove, so a `set` it sends replaces the field. */
  contactValues: boolean;
  openThread(): OpenThread | null;
  latestIncomingSender?(includeAddress?:boolean): Promise<SmsLatestSenderMetadata>;
  openVoicemail(): {caller: string | null; date: number; durationSeconds: number; transcriptState: 'ready' | 'pending' | 'unavailable' | 'failed'; engine: 'device' | 'cloud' | 'carrier' | null; transcript: string | null} | null;
  deleteOpenVoicemail(current: () => void, signal: AbortSignal): Promise<VoicemailDeleteResult>;
};
/** `present`: the view change that shows a successful outcome (the drafted conversation, the filtered Contacts list), run by the coordinator after the receipt. */
type TelephonyExecution = {status: 'succeeded' | 'failed' | 'unknown'; summary: string; telephonyResult: TelephonyActionResult; present?: () => void};
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
      case 'sms_latest_sender': return {kind: 'sms-latest-sender', status: 'unavailable'};
      case 'voicemail_read_selected': return {kind: 'voicemail-read', status: 'unavailable'};
      case 'voicemail_delete_selected': return {kind: 'voicemail-delete', status: 'unavailable'};
    }
  };
  return {...finish(unavailable()), summary};
}
/**
 * The first LOOKUP_LIMIT contacts matching `query`. One row past the limit is read, and never
 * offered, so `more` tells a list cut short from every match.
 */
async function lookup(query: string, ports: Pick<TelephonyPorts, 'searchContacts'>) {
  const rows = await ports.searchContacts(query, LOOKUP_LIMIT + 1);
  return {rows: rows.slice(0, LOOKUP_LIMIT), more: rows.length > LOOKUP_LIMIT};
}
const flagMore = (more: boolean) => more ? {more: true as const} : {};
async function numbers(query: string, ports: TelephonyPorts): Promise<{options: ContactMatch[]; more: boolean}> {
  const {rows, more} = await lookup(query, ports);
  return {options: contactCallOptions(rows, value => ports.normalize(value)), more};
}

async function call(operation: PhoneCallOperation, ports: TelephonyPorts, signal: AbortSignal): Promise<PhoneCallResult> {
  const contact = operation.target.kind === 'contact';
  let number: string;
  if (operation.target.kind === 'number') number = operation.target.number;
  else {
    let options: ContactMatch[], more: boolean;
    try { ({options, more} = await numbers(operation.target.query, ports)); } catch { return {kind: 'phone-call', status: 'unavailable', contact: false}; }
    ports.current();
    if (!options.length) return {kind: 'phone-call', status: 'not-found', contact: false};
    // A name is never called unseen: the owner confirms or chooses the exact number, even for one match.
    const choice = await ports.ask({kind: 'call', options, ...flagMore(more)}, signal);
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
  // Only a draft goes into the conversation's text field. A reviewed send reaches the carrier
  // even when its conversation is already open.
  const replyThreadId = "replyThreadId" in operation ? operation.replyThreadId : undefined;
  const inOpenThread = (number: string) => ports.draftInOpenThread(operation.body, number, replyThreadId);
  let number: string, placed: ReturnType<typeof inOpenThread>;
  if (target.kind === 'number') {
    // The approval card showed this exact number (`sms.compose.v2`), so nothing is asked again here.
    number = target.number; placed = draftOnly ? inOpenThread(number) : 'none-selected';
  } else {
    let options: ContactMatch[], more: boolean;
    try { ({options, more} = await numbers(target.query, ports)); } catch { return result('unavailable'); }
    ports.current();
    if (!options.length) return result('not-found');
    const only = draftOnly && options.length === 1 ? inOpenThread(options[0].number) : null;
    if (only === 'drafted') return result('drafted');
    // A name is never texted unseen: the lookup is a fuzzy filter and the card showed only the name,
    // so the owner confirms or chooses the matched name and number here, even for one match.
    const choice = await ports.ask({kind: 'message', options, body: operation.body, ...flagMore(more)}, signal);
    if (choice === null || !options[choice]) return result('cancelled');
    ports.current();
    number = options[choice].number; placed = only ?? (draftOnly ? inOpenThread(number) : 'none-selected');
  }
  if (placed === 'drafted') return result('drafted');
  if (draftOnly) {
    // A draft-only request never reaches the send review. That conversation is opened with the text
    // in its field; one that is open but busy (a send in flight, pictures attached) is left alone.
    if (placed !== 'none-selected') return result('unavailable');
    let step: (() => void) | null;
    try { step = await ports.draftFor(number, operation.body, replyThreadId); } catch { return result('unavailable'); }
    ports.current();
    if (!step) return result('unavailable');
    present(step);
    return result('drafted');
  }
  // The port answers every outcome it observed, including a refusal before anything was sent. It
  // throws only when the native send's answer was lost: the radio may have taken the message. No
  // dialog follows the card. Outside Messages it sends from Android's default SMS SIM, as the card says.
  try { return result(await ports.sendSms(number, operation.body, operationId, signal)); }
  catch { return result('unknown'); }
}

type ContactUpdate = Extract<ContactWriteOperation, {type: 'contact_update'}>;
type ContactSet = NonNullable<ContactUpdate['set']>;
/** Numbers and addresses to put on a contact beside the ones it has, or to take off it. */
export type ContactValues = Pick<ContactSet, 'phoneNumbers' | 'emailAddresses'>;
/**
 * Whether two written numbers are the same line: the same digits, or the same last ten when a
 * country code or trunk prefix is written on one side only ("+14155550100", "(415) 555-0100").
 */
export function sameContactNumber(a: string, b: string): boolean {
  const x = a.replace(/\D/g, ''), y = b.replace(/\D/g, '');
  return x === y || (x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10));
}
/**
 * `set` replaces a named field whole. Then the `remove` values are taken away and the `add` values
 * the contact does not hold yet are appended; every other value stays. Numbers match as the same
 * line (`sameContactNumber`, a country code aside) and addresses without case, and a value already
 * on the contact keeps its type.
 */
export function appliedContactChange(before: ContactRecord, set: ContactSet, normalize: (number: string) => string | null, add: ContactValues = {}, remove: ContactValues = {}): ContactDraft {
  const key = (number: string) => normalize(number) || number, mail = (address: string) => address.toLowerCase();
  const line = (a: string, b: string) => sameContactNumber(key(a), key(b)), sameMail = (a: string, b: string) => mail(a) === mail(b);
  const gone = (values: string[] | undefined, same: (a: string, b: string) => boolean, value: string) => !!values?.some(other => same(other, value));
  const phoneNumbers = (set.phoneNumbers ? set.phoneNumbers.map(number => ({number, type: before.phoneNumbers.find(row => line(row.number, number))?.type || 'mobile'})) : before.phoneNumbers).filter(row => !gone(remove.phoneNumbers, line, row.number));
  const emailAddresses = (set.emailAddresses ? set.emailAddresses.map(address => ({address, type: before.emailAddresses.find(row => sameMail(row.address, address))?.type || 'home'})) : before.emailAddresses).filter(row => !gone(remove.emailAddresses, sameMail, row.address));
  return {
    displayName: set.displayName ?? before.displayName,
    phoneNumbers: [...phoneNumbers, ...(add.phoneNumbers || []).filter((number, index, all) => !phoneNumbers.some(row => line(row.number, number)) && all.findIndex(other => line(other, number)) === index).map(number => ({number, type: 'mobile'}))],
    emailAddresses: [...emailAddresses, ...(add.emailAddresses || []).filter((address, index, all) => !emailAddresses.some(row => sameMail(row.address, address)) && all.findIndex(other => sameMail(other, address)) === index).map(address => ({address, type: 'home'}))],
  };
}
/** The change leaves every field of the contact exactly as it is. */
function changesNothing(option: {before: ContactRecord; after: ContactDraft}): boolean {
  const fields = (draft: ContactDraft) => JSON.stringify([draft.displayName, draft.phoneNumbers.map(row => [row.number, row.type]), draft.emailAddresses.map(row => [row.address, row.type])]);
  return fields(option.before) === fields(option.after);
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
/**
 * The matching contacts the editor can read completely; null when some matched but none can be offered.
 * A change or deletion is offered (and its approval card names them) only for these. `more`: more
 * contacts match than the lookup lists, and the card and review say so.
 */
export async function contactWriteTargets(query: string, ports: Pick<TelephonyPorts, 'searchContacts' | 'getContact'>): Promise<{contacts: ContactRecord[]; more: boolean} | null> {
  const {rows, more} = await lookup(query, ports), found: ContactRecord[] = [];
  for (const row of rows) {
    try { found.push(await ports.getContact(row.id)); }
    // Only a contact that is gone, or holds more than the editor can read, is left out. Any other
    // failed read (Contacts closed or paused) is not "no match".
    catch (error) { const code = refusalCode(error); if (code !== 'incomplete' && code !== 'not-found') throw error; }
  }
  return rows.length && !found.length ? null : {contacts: found, more};
}
async function write(operation: ContactWriteOperation, ports: TelephonyPorts, signal: AbortSignal): Promise<ContactWriteResult> {
  const result = (status: ContactWriteResult['status']): ContactWriteResult => ({kind: 'contact-write', status});
  let dispatched=false;
  try {
    if (operation.type === 'contact_create') {
      // The approval the owner already gave showed every field of the new contact. A contact with
      // the same name or one of its numbers is shown first, so the same person is not added twice unseen.
      // The name search only returns contacts whose names match, so each number is also looked up
      // on its own: a number saved under another name ("Mother" for "Mom") is found that way.
      const {contact} = operation, key = (number: string) => ports.normalize(number) || number, wanted = contact.phoneNumbers.map(key);
      let twin: {name: string; numbers: string[]} | undefined;
      const named = (await ports.searchContacts(contact.displayName, LOOKUP_LIMIT)).find(row =>
        row.displayName.trim().toLowerCase() === contact.displayName.toLowerCase() || row.phoneNumbers.some(number => wanted.some(other => sameContactNumber(other, key(number)))));
      if (named) twin = {name: contactChoiceName(named.displayName), numbers: named.phoneNumbers};
      for (const number of twin ? [] : contact.phoneNumbers) {
        const holder = await ports.contactForNumber(number);
        if (holder !== null) { twin = {name: contactChoiceName(holder), numbers: [number]}; break; }
      }
      ports.current();
      if (twin) {
        if (await ports.ask({kind: 'contact-create', options: [twin]}, signal) !== 0) return result('cancelled');
        ports.current();
      }
      dispatched=true;
      const saved = await ports.saveContact({displayName: contact.displayName,
        phoneNumbers: contact.phoneNumbers.map(number => ({number, type: 'mobile'})), emailAddresses: contact.emailAddresses.map(address => ({address, type: 'home'}))});
      return result(saved.status === 'saved' ? 'saved' : saved.status === 'unknown' ? 'unknown' : 'failed');
    }
    const targets = await contactWriteTargets(operation.query, ports);
    ports.current();
    if (!targets) return result('unavailable');
    const {contacts: found, more} = targets;
    if (!found.length) return result('not-found');
    if (operation.type === 'contact_update') {
      // Each change is worked out against the contact as the phone holds it now, and shown before and after.
      // A change that would leave a contact exactly as it is (removing a number or address it does not
      // hold, adding one it already holds) is never offered: approving it would save nothing, yet report
      // a save. When no matching contact would change, nothing is asked and nothing was changed.
      const options = found.flatMap(before => contactChangeOptions(before, operation, ports.normalize, ports.contactValues)).filter(option => !changesNothing(option));
      if (!options.length) return result('not-found');
      const choice = await ports.ask({kind: 'contact-save', options, ...flagMore(more)}, signal);
      if (choice === null || !options[choice]) return result('cancelled');
      ports.current();
      // The write names the version the owner was shown; a contact that changed since is stale.
      dispatched=true;
      return result((await ports.saveContact(options[choice].after, {id: options[choice].before.id, version: options[choice].before.version})).status);
    }
    const choice = await ports.ask({kind: 'contact-delete', options: found, ...flagMore(more)}, signal);
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
    case 'sms_latest_sender': {
      const sender = await ports.latestIncomingSender?.(operation.includeAddress).catch(() => null);
      signal.throwIfAborted();
      ports.current();
      return {kind: 'sms-latest-sender', ...(sender ?? {status:'unavailable'})};
    }
    case 'voicemail_read_selected': {
      const voicemail = ports.openVoicemail();
      return voicemail ? {kind: 'voicemail-read', status: 'read', ...voicemail} : {kind: 'voicemail-read', status: 'none-selected'};
    }
    case 'voicemail_delete_selected': return {kind: 'voicemail-delete', status: await ports.deleteOpenVoicemail(() => ports.current(), signal)};
  }
}
