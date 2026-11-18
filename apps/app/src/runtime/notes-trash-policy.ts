import type {NoteRecord} from './notes-store';
import type {NotesTarget} from './notes-contract';
import {createNotesTrashPolicy,type NotesTrashDocument as SharedDocument,type NotesTrashEntry as SharedEntry} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/notes-trash-policy.ts';

/** Product deletion policy: a deleted note stays restorable in Recently deleted for exactly 30 days. */
const NOTES_TRASH_RETENTION_MS=30*24*60*60*1000;
const NOTES_TRASH_MAX_ENTRIES=10000;
const NOTES_TRASH_MAX_BYTES=30*1024*1024;
/**
 * The generic retention policy is the elizaOS Notes Trash module; Alpha
 * supplies the product inputs: 30 days, its limits, its note kinds and voice recordings.
 */
const policy=createNotesTrashPolicy<NoteRecord,NotesTarget>({retentionMs:NOTES_TRASH_RETENTION_MS,maxEntries:NOTES_TRASH_MAX_ENTRIES,maxBytes:NOTES_TRASH_MAX_BYTES,kinds:['text','list','voice','link'],recordingKind:'voice'});
export const notesTrashPolicy=policy;

/**
 * One trashed note. `id` is the deletion operation id; for agent and voice deletions it
 * equals the shared store tombstone's operationId. `target` is the reviewed revision of
 * the exact record at deletion, so a restore can prove it reinstated the same note.
 * `audio` is present only when the recording itself was moved to the audio trash under
 * the same operation id.
 */
type NotesTrashEntry=SharedEntry<NoteRecord,NotesTarget>;
export type NotesTrashDocument=SharedDocument<NoteRecord,NotesTarget>;

/**
 * Expired exactly when 30 full days of wall-clock time have elapsed since deletion
 * (epoch milliseconds, so time-zone and DST changes have no effect). A clock moved
 * backwards delays the purge rather than advancing it: early erasure is the
 * unrecoverable failure, so deletedAt is never rewritten from a possibly wrong clock.
 */
export function notesTrashExpired(entry:Pick<NotesTrashEntry,'deletedAt'>,now:number){return policy.expired(entry,now);}
export function removeNotesTrashEntries(doc:NotesTrashDocument,ids:Iterable<string>):NotesTrashDocument{return policy.remove(doc,ids);}
