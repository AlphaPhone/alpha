/**
 * Alpha's import names for the shared voice-note origin links (elizaOS Notes client).
 * A link is identity only: note id, recording id and reviewed revision, never the title
 * or content. Validation, the series key and fail-closed resolution are upstream.
 */
import {sha256Hex} from '../lib/hash.ts';
export {
 NOTE_ORIGIN_LIMIT as noteOriginLimit,
 addNoteOrigin,
 findNoteLink,
 findNoteOrigin,
 noteOriginFor,
 noteOriginIndex,
 noteOriginKey,
 noteOriginOf,
 noteOriginTitle,
 noteLinkOf,
 recordNoteRevision,
 removeNoteOrigin,
 resolveNoteLink,
} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-origin.ts';
export type {NoteLink,NoteOriginIndex,NoteOriginKind} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-origin.ts';
/** The revision a new voice-note link stores: SHA-256 of the note's content only (title, text,
 * transcript, summary, action texts, recording). Pinning, ticking an action or a Calendar flag
 * leaves it unchanged. */
export async function voiceNoteContentRevision(note:any):Promise<string>{
 const content=JSON.stringify(['voice-content:v1',note?.id??null,String(note?.title??''),String(note?.body??''),String(note?.audio?.transcript??''),note?.audio?.audioId??null,
  Array.isArray(note?.lines)?note.lines.map((line:any)=>String(line?.t??'')):[],note?.summary??null,
  Array.isArray(note?.actions)?note.actions.map((action:any)=>String(action?.t??'')):[]]);
 return sha256Hex(content);
}
