/**
 * Camera surface resume policy: whether the camera surface shows its preview again when the app
 * returns to the foreground. The denial classification, Keep outcome and capture identity stay in
 * the shared camera host ports.
 */

/** What a camera surface knows when the app returns to the foreground. */
interface CameraResumeState {
  /** The access kind the preview stopped on, if it stopped on a denial. */
  denied?: string;
  phase: string;
  disposed: boolean;
}

/**
 * Whether a resume may restart a preview that stopped on a camera denial. Closing Android's own
 * permission dialog resumes the app too, so restarting on every resume would ask for the camera
 * again straight after "Don't allow". Only an actual grant (made in system settings) restarts the
 * preview; the read never prompts, an unreadable state restarts nothing, and a state that changed
 * while reading wins.
 */
export async function restartAfterResume(
  state: () => CameraResumeState,
  check: () => Promise<{ camera?: string }>,
): Promise<boolean> {
  const stopped = () => {
    const now = state();
    return now.denied === "camera" && now.phase === "error" && !now.disposed;
  };
  if (!stopped()) return false;
  let granted = false;
  try {
    granted = (await check()).camera === "granted";
  } catch {
    // Unknown access never restarts.
  }
  return granted && stopped();
}
