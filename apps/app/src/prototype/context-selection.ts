/** Selection identity and review scope for sources whose own views publish them:
 * the open Settings page, a pressed Alpha Phone notification and the capture a
 * question is about. Dependency-free so the rules run in node tests
 * (test/context-selection.test.mjs).
 *
 * Identities are opaque. A display name, path or provider URI never becomes an
 * identity, and neither does a capture's own revision string (it embeds sizes and
 * times): its shared revision is a counter local to this app session. Content is
 * shared only as an excerpt the owner reviewed. */
import { randomHex } from '../lib/hash.ts';
type Bag = Record<string, any>;
// LemmaScript (specs/lemma) has no model for a RegExp; no proved function reads it.
//@ skip
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
/** Random per app session, so a later session can never repeat a revision for other content. */
const sessionMarker = () => randomHex(6);
//@ skip
const SETTINGS_SECTION = /^[a-z][a-z0-9-]{0,63}$/;
//@ skip
const SETTINGS_CATEGORIES = new Set(['settings-account','settings-general','settings-privacy','settings-apps','settings-help']);
//@ skip
const SENSITIVE_SETTINGS = /pass|credential|vault|secret|token|key|unlock|pin|biometric/;
/** The open Settings page as an identity: its section slug only, never a value shown on it.
 * Credential and unlock pages have no identity (the screen is also paused as sensitive). */
export function settingsSelection(state: Bag | undefined): { kind: 'settings'; id: string } | undefined {
  const page = state?.page ?? (SETTINGS_CATEGORIES.has(state?.settingsCategory) ? state?.settingsCategory : undefined);
  if (typeof page !== 'string' || !SETTINGS_SECTION.test(page) || SENSITIVE_SETTINGS.test(page)) return undefined;
  return { kind: 'settings', id: page };
}

export type Notice = { id: string; revision: string; source: string; kind?: string; title?: string; text?: string; appLabel?: string };
/** Own-notice kinds that may be reviewed for a question (AlphaNotificationsPlugin.noticeKind).
 * Hosted results, scheduled digests and workflow notices can carry mail-derived text and are
 * never offered; neither is an unrecognized kind. */
export const ASKABLE_NOTICE_KINDS: readonly string[] = ['reminder', 'calendar', 'navigation'];
/** Android reports each own row's kind. The browser build's own rows carry none: there they are
 * reminders, calendar alerts ('calendar:'), workflow notices ('workflow:') and the messages a
 * workflow Focus block held ('focus:'), which count as workflow notices. */
export function noticeKind(notice: Pick<Notice, 'id' | 'kind'>): string {
  if (notice.kind !== undefined) return notice.kind;
  return /^(workflow|focus):/.test(notice.id) ? 'workflow' : notice.id.startsWith('calendar:') ? 'calendar' : 'reminder';
}
/** What Android's AlphaNotificationsPlugin.list returns in place of a row's title and text
 * while the device is locked or the notification is secret (test/context-selection.test.mjs
 * keeps these in step with the Java source). */
export const HIDDEN_NOTICE_TITLE = 'Alpha Phone notification';
export const HIDDEN_NOTICE_TEXTS: readonly string[] = ['Unlock to view', 'Content hidden'];
/** A row whose content the platform withheld. The browser build shows the app label and no
 * text; Android shows fixed placeholder wording. Neither is the notification's content. */
export function noticeHidden(notice: Notice): boolean {
  const title = (notice.title || '').trim(), text = (notice.text || '').trim();
  if (!text) return !title || title === (notice.appLabel || '').trim() || title === HIDDEN_NOTICE_TITLE;
  return title === HIDDEN_NOTICE_TITLE && HIDDEN_NOTICE_TEXTS.includes(text);
}
/** Only Alpha Phone's own, unredacted notifications of an askable kind can be reviewed for a
 * question. A row hidden by the lock screen or marked secret carries no content, which is
 * nothing to review; a hosted-result, digest or workflow notice may carry mail text. */
export function noticeReviewable(notice: Notice): boolean {
  return notice.source === 'own' && ASKABLE_NOTICE_KINDS.includes(noticeKind(notice)) && OPAQUE.test(notice.id) && OPAQUE.test(notice.revision) && !noticeHidden(notice);
}
/** The exact notification is still listed with the revision that was reviewed. */
export type NoticeIdentity = Pick<Notice, 'id' | 'revision' | 'source'>;
export function noticeCurrent(reviewed: NoticeIdentity, items: readonly Notice[] | undefined): boolean {
  //@ verify
  //@ ensures items === undefined ==> !\result
  //@ ensures items !== undefined && items.length === 0 ==> !\result
  //@ ensures \result ==> items !== undefined
  //@ ensures \result && items !== undefined ==> exists(k, 0 <= k && k < items.length && items[k].id === reviewed.id && items[k].source === reviewed.source && items[k].revision === reviewed.revision && forall(j, 0 <= j && j < items.length && items[j].id === reviewed.id && items[j].source === reviewed.source ==> j === k))
  //@ ensures items !== undefined && exists(j, exists(k, 0 <= j && j < k && k < items.length && items[j].id === reviewed.id && items[j].source === reviewed.source && items[k].id === reviewed.id && items[k].source === reviewed.source)) ==> !\result
  //@ ensures items !== undefined && exists(k, 0 <= k && k < items.length && items[k].id === reviewed.id && items[k].source === reviewed.source && items[k].revision === reviewed.revision && forall(j, 0 <= j && j < items.length && items[j].id === reviewed.id && items[j].source === reviewed.source ==> j === k)) ==> \result
  if (!items) return false;
  return items.filter(item => item.id === reviewed.id && item.source === reviewed.source).length === 1
    && items.some(item => item.id === reviewed.id && item.source === reviewed.source && item.revision === reviewed.revision);
}
export function noticeExcerpt(notice: Notice): string {
  return [notice.title, notice.text].map(value => (value || '').trim()).filter(Boolean).join('\n');
}

export type CaptureSelection = { kind: 'photo' | 'video'; id: string; revision: string };
const CAPTURE_REVISIONS_KEPT = 256;
/** Maps each saved photo or video to an identity whose revision is a counter local to this
 * app session. The library's own revision never leaves the phone: on Android it is the item's
 * added time and byte size (AlphaPhotosPlugin.metadata), with a '|generation' suffix the wire
 * contract would refuse once the item was favorited, trashed or restored. The counter changes
 * exactly when that item's library revision or mutation revision changes, so an edited,
 * trashed, restored or replaced capture is never the identity that was shared before. An item
 * without an opaque id or a library revision has no identity. */
export function createCaptureRevisions() {
  const seen = new Map<string, { signature: string; revision: number }>();
  const session = sessionMarker();
  let counter = 0;
  return (row: { kind?: string; id?: unknown; revision?: unknown; mutationRevision?: unknown; contentRevision?: unknown } | undefined): CaptureSelection | null => {
    if (!row || typeof row.id !== 'string' || !OPAQUE.test(row.id) || typeof row.revision !== 'string' || !row.revision) return null;
    const signature = JSON.stringify([row.revision, typeof row.mutationRevision === 'string' ? row.mutationRevision : null, typeof row.contentRevision === 'string' ? row.contentRevision : null]), previous = seen.get(row.id);
    const revision = previous?.signature === signature ? previous.revision : ++counter;
    // Most recently used last. A forgotten item simply gets a new revision when opened again.
    seen.delete(row.id); seen.set(row.id, { signature, revision });
    if (seen.size > CAPTURE_REVISIONS_KEPT) seen.delete(seen.keys().next().value as string);
    return { kind: row.kind === 'video' ? 'video' : 'photo', id: row.id, revision: 'capture-' + session + '-' + revision };
  };
}

/** A saved photo or video as the library reports it. contentRevision (Android: modified time,
 * size and modification generation) changes when another app rewrites the file in place. */
export type CaptureRevisionFields = { trashed?: boolean; revision: string; mutationRevision?: string; contentRevision?: string };
/** The library's current row is still the item that was reviewed: same trash state, same
 * mutation (or library) revision and, when the reviewed row carried one, the same content
 * revision. Anything else, including a row that dropped its content revision, is a changed item
 * and is never used as context. */
export function captureUnchanged(reviewed: CaptureRevisionFields, current: CaptureRevisionFields | undefined): boolean {
  //@ verify
  //@ ensures current === undefined ==> !\result
  //@ ensures current === reviewed ==> \result
  //@ ensures \result && current !== undefined ==> !current.trashed === !reviewed.trashed
  //@ ensures \result && current !== undefined && reviewed.mutationRevision !== undefined && reviewed.mutationRevision !== '' ==> current.mutationRevision === reviewed.mutationRevision
  //@ ensures \result && current !== undefined && (reviewed.mutationRevision === undefined || reviewed.mutationRevision === '') ==> current.revision === reviewed.revision
  //@ ensures current !== undefined && reviewed.contentRevision !== undefined && current.contentRevision !== reviewed.contentRevision ==> !\result
  if (!current) return false;
  if (!current.trashed !== !reviewed.trashed) return false;
  if (reviewed.mutationRevision ? current.mutationRevision !== reviewed.mutationRevision : current.revision !== reviewed.revision) return false;
  return reviewed.contentRevision === undefined || current.contentRevision === reviewed.contentRevision;
}

export type CaptureQuestion =
  /** The live viewfinder frame. */
  | { kind: 'frame' }
  /** One saved photo or video, by its exact library identity. */
  | { kind: 'item'; id: string }
  /** A typed library search. It names no capture and reads no media. */
  | { kind: 'search' }
  /** The viewer is open on something this adapter does not own. */
  | { kind: 'none' };
/** Routes a Camera or Photos question control to what it is about. A search question is
 * never treated as a capture, and a viewer question always carries the open item's id. */
export function captureQuestion(module: string, key: string, path: string, state: Bag | undefined): CaptureQuestion | undefined {
  if (module !== 'camera' && module !== 'photos') return undefined;
  if (key === 'askQ' || key === 'askSearch') return { kind: 'search' };
  if (key !== 'ask') return undefined;
  if (module === 'camera') return { kind: 'frame' };
  const open = state?.open;
  return path === 'v.ask' && typeof open === 'string' && open ? { kind: 'item', id: open } : { kind: 'none' };
}

/** Document types for a Files location tile, as the list the native picker accepts
 * (DailyAppsPlugin.mimeTypes). Undefined means any document. */
export function locationMimeTypes(name: string): string[] | undefined {
  const key = name.toLowerCase();
  return /(picture|image|photo)/.test(key) ? ['image/*']
    : /(music|audio|recording)/.test(key) ? ['audio/*']
    : /video|movie/.test(key) ? ['video/*']
    : /doc|pdf/.test(key) ? ['application/pdf', 'text/*', 'application/*']
    : undefined;
}

/** Publishes the Settings identity the agent context reads from the shell. */
export function installContextSelection(Component: any) {
  Component.prototype.settingsSelection = function () {
    return document.hidden || this.S().view !== 'settings' ? undefined : settingsSelection(this.vget('settings'));
  };
}
