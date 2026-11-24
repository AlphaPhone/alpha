/** A recording kept with a note. */
export type SavedNoteAudio = { audioId: string; noteId: string; durationMs: number; transcript: string };
/** The receipt of one Notes Trash operation on a recording (RecordingStore.receipt). */
export type NoteAudioDeletionReceipt = { audioId: string; noteId: string; operationId: string; status: string };
type NoteAudioOperation = { audioId: string; noteId: string; operationId: string };

/**
 * AlphaNoteAudioPlugin: playback of kept note recordings and their Notes Trash lifecycle. The
 * browser host registers BrowserVoice under the same name (browser/register.ts), so this module
 * exports no singleton.
 */
export interface AlphaNoteAudioPlugin {
  describe(input: { audioId: string }): Promise<SavedNoteAudio & { deletedAt?: number }>;
  play(input: { audioId: string }): Promise<void>;
  stop(): Promise<void>;
  state(): Promise<{ playing: boolean; audioId?: string; positionMs: number }>;
  remove(input: NoteAudioOperation): Promise<NoteAudioDeletionReceipt>;
  restore(input: NoteAudioOperation): Promise<NoteAudioDeletionReceipt>;
  purge(input: NoteAudioOperation): Promise<NoteAudioDeletionReceipt>;
  deletionStatus(input: NoteAudioOperation): Promise<NoteAudioDeletionReceipt>;
}
