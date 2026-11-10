/**
 * Speech and recording paths refuse to start new audio while an earlier playback or capture could
 * not be confirmed stopped (the `speech-cleanup-unconfirmed` failure). That state lasts until the
 * app restarts, so every path that meets it says the same thing.
 *
 * Plain constants and function exports only: Node contract tests evaluate this source.
 */
export const SPEECH_CLEANUP_NOTICE = 'Voice media has not finished stopping. Close the app if this continues.';
/** The shared notice when `error` is the unconfirmed-cleanup failure, otherwise null. */
export function speechCleanupNotice(error: unknown): string | null {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 'speech-cleanup-unconfirmed' ? SPEECH_CLEANUP_NOTICE : null;
}
