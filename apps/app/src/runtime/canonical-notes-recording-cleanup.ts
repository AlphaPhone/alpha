import type {NotesTrashRecordingCleanup} from '../../../../.eliza/client-features/plugins/plugin-notes/src/types.ts';
import type {NotesRecordingIdentity,NotesRecordingReceipt,NotesRecordingStore} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/notes-recording-effects.ts';

/** The agent's receipts for voice notes it permanently erased whose recording on this phone still needs erasing. */
export interface CanonicalRecordingCleanupSource {
 readTrashRecordingCleanup(signal:AbortSignal):Promise<NotesTrashRecordingCleanup[]>;
 /** True when the agent retired the receipt, false when it was no longer pending; throws when refused. */
 completeTrashRecordingCleanup(receipt:NotesTrashRecordingCleanup,signal:AbortSignal):Promise<boolean>;
}
/** The phone's recording store (AlphaNoteAudio): moves and erases carry the erase's operation id. */
export type CanonicalRecordingCleanupStore=Pick<NotesRecordingStore,'remove'|'purge'|'deletionStatus'>;
export interface CanonicalRecordingCleanupReport {erased:number;acknowledged:number;retained:number}

const sameOperation=(receipt:NotesRecordingReceipt,identity:NotesRecordingIdentity)=>
 receipt.audioId===identity.audioId&&receipt.noteId===identity.noteId&&receipt.operationId===identity.operationId;

/**
 * Erases on this phone the recording of each voice note the agent permanently erased from its Notes
 * Trash, then acknowledges that receipt to the agent. The recording is named by the receipt alone: its
 * audio id, the note that owns it and the erase's operation id. It moves to the recording store's trash
 * under that operation and is erased there, and only the store's `purged` receipt for exactly that
 * operation counts. A receipt is acknowledged only after that, so a recording is never reported gone
 * on a guess. A step that fails or is refused (a recording this phone does not hold, another deletion
 * that owns it, an agent that will not yet accept the acknowledgement) leaves the receipt pending for
 * the next pass; an erase already confirmed is not repeated. Resolves null when the agent has no
 * cleanups to read, which is the case while its Trash keeps notes until they are restored.
 */
export async function eraseCanonicalNoteRecordings(source:CanonicalRecordingCleanupSource,recordings:CanonicalRecordingCleanupStore,signal:AbortSignal):Promise<CanonicalRecordingCleanupReport|null>{
 let receipts:NotesTrashRecordingCleanup[];
 try{receipts=await source.readTrashRecordingCleanup(signal);}catch{signal.throwIfAborted();return null;}
 const report={erased:0,acknowledged:0,retained:0};
 for(const receipt of receipts){
  signal.throwIfAborted();
  const identity={audioId:receipt.audioId,noteId:receipt.noteId,operationId:receipt.operationId};
  try{
   const status=await recordings.deletionStatus(identity);
   if(!sameOperation(status,identity))throw Error('Recording operation unconfirmed');
   if(status.status!=='purged'){
    if(status.status==='unknown')await recordings.remove(identity);
    else if(status.status!=='removed')throw Error('Recording operation unconfirmed');
    const erased=await recordings.purge(identity);
    if(!sameOperation(erased,identity)||erased.status!=='purged')throw Error('Recording erase unconfirmed');
    report.erased++;
   }
  }catch{signal.throwIfAborted();report.retained++;continue;}
  signal.throwIfAborted();
  try{if(await source.completeTrashRecordingCleanup(receipt,signal))report.acknowledged++;}
  catch{signal.throwIfAborted();report.retained++;}
 }
 return report;
}
