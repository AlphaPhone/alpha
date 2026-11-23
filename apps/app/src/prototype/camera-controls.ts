/** Camera control rules the Camera adapter presents: pure, so they are tested without a camera. */
export type CameraAccessNotice = 'camera' | 'microphone' | 'unavailable';

/** The one line under the Camera access notice: why access is needed, or what went wrong, and the way on. */
export function accessDetail(kind: CameraAccessNotice, browser: boolean): string {
  if (kind === 'unavailable') return 'The camera didn’t start. If another app is using it, close that app, then tap Retry.';
  const allow = browser ? 'Allow it for this page in your browser, then tap Retry' : 'Tap Allow to turn it on in Settings';
  return kind === 'camera'
    ? `Alpha needs camera access to take photos and videos. ${allow}.`
    : `Videos record sound with the microphone. ${allow}, or record without sound.`;
}

/** Off, Auto (the camera decides at the shutter) and On. A browser track has only its torch, on or off. */
export type FlashMode = 'off' | 'auto' | 'on';
export function nextFlashMode(mode: FlashMode, browser: boolean): FlashMode {
  if (browser) return mode === 'off' ? 'on' : 'off';
  return mode === 'off' ? 'auto' : mode === 'auto' ? 'on' : 'off';
}
export function flashLabel(mode: FlashMode): string {
  return mode === 'auto' ? 'Flash auto' : mode === 'on' ? 'Flash on' : 'Flash off';
}
/** A preview receipt reports only whether the flash may fire ("on" for both Auto and On). A
 * receipt that says it may fire keeps the owner's Auto or On; one that says off is off. */
export function flashFromReceipt(receiptOn: boolean, previous: FlashMode): FlashMode {
  if (!receiptOn) return 'off';
  return previous === 'off' ? 'on' : previous;
}

/** The self-timer: off, 3 seconds or 10 seconds before a photo. */
export const TIMER_STEPS = [0, 3, 10] as const;
export type TimerSeconds = typeof TIMER_STEPS[number];
export function nextTimer(seconds: TimerSeconds): TimerSeconds {
  return TIMER_STEPS[(TIMER_STEPS.indexOf(seconds) + 1) % TIMER_STEPS.length];
}
export function timerLabel(seconds: TimerSeconds): string {
  return seconds ? `Timer ${seconds} seconds` : 'Timer off';
}

const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
/** Seconds before the end of a recording at which the time left is shown. */
export const RECORDING_WARNING = 60;
/** The time a recording has left before its length or size limit stops it. The size limit is
 * estimated from the bytes written so far; under two seconds in, there is no estimate yet. */
export function recordingLeft(duration: number, fileSize: number, limits: { maxDuration: number; maxFileSize: number }): number | undefined {
  const elapsed = Math.max(0, Number.isFinite(duration) ? duration : 0);
  let left = limits.maxDuration > 0 ? limits.maxDuration - elapsed : Infinity;
  if (limits.maxFileSize > 0 && elapsed >= 2 && fileSize > 0) left = Math.min(left, (limits.maxFileSize - fileSize) / (fileSize / elapsed));
  return Number.isFinite(left) ? Math.max(0, left) : undefined;
}
/** The recording timer: elapsed time, and the time left once a limit is near. */
export function recordingLabel(duration: number, fileSize: number, limits: { maxDuration: number; maxFileSize: number }): string {
  const elapsed = clock(duration), left = recordingLeft(duration, fileSize, limits);
  return left !== undefined && left <= RECORDING_WARNING ? `${elapsed} · ${clock(Math.ceil(left))} left` : elapsed;
}

/** Photo aspect ratios Camera offers, in the order the chip cycles them. 4:3 is the native camera's
 * default; another ratio is the upstream `captureAspectRatio` preview option. */
export const ASPECT_RATIOS = ['4:3', '16:9'] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];
/** The ratios a camera device lists (`supportedCaptureAspectRatios`) that Camera offers. */
export function supportedAspects(device: { supportedCaptureAspectRatios?: unknown } | undefined): AspectRatio[] {
  const listed = device?.supportedCaptureAspectRatios;
  return Array.isArray(listed) ? ASPECT_RATIOS.filter(ratio => listed.includes(ratio)) : [];
}
/** The next listed ratio after `current`; with one ratio or none there is no other to pick. */
export function nextAspect(current: AspectRatio, supported: readonly AspectRatio[]): AspectRatio {
  if (supported.length < 2) return current;
  const at = supported.indexOf(current);
  return supported[(at + 1) % supported.length];
}
export function aspectLabel(ratio: AspectRatio): string {
  return `Aspect ratio ${ratio}`;
}
/** The portrait viewfinder frame (and its grid) for a photo ratio, as a CSS aspect-ratio. */
export function frameAspect(ratio: AspectRatio): string {
  return ratio === '16:9' ? '9 / 16' : '3 / 4';
}

/** Video mode's light on the phone: the flash unit held on (the torch), since a flash cannot fire
 * during a recording. It can be turned on or off before and during the recording. */
export function videoLightLabel(on: boolean): string {
  return on ? 'Light on' : 'Light off';
}

/** Camera's volume-key shutter on Android. The native side takes the volume keys only while it is
 * told Camera can use them, and starts with them off. The wanted state is sent once per change; a
 * failed call is sent again on the next update. */
export function volumeShutterSync(send: (enabled: boolean) => Promise<unknown>): (wanted: boolean) => void {
  let sent: boolean | undefined = false;
  return wanted => {
    if (wanted === sent) return;
    sent = wanted;
    void send(wanted).catch(() => { if (sent === wanted) sent = undefined; });
  };
}
