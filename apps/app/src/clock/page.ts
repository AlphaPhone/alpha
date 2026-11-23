// spec/clock/ringer.md, "Story: Hear an alarm once, from the page in front"; spec/clock/alarms.md, "Story: Set an alarm in the browser build"
// Page glue VibeLang keeps out of `.vibe`: visibility, the Web Locks alarm lock, the alarm tone and the phone's calendar.

const LOCK = "alpha.browser.alarm-owner";
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Whether the page is visible now.
 * @throws {never}
 */
export function pageVisible(): boolean {
  return typeof document === "undefined" ? false : !document.hidden;
}

/** Calls `listener` with the page's visibility whenever it changes, or the page hides or shows; returns the unsubscribe.
 * @throws {never}
 */
export function watchVisibility(listener: (visible: boolean) => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  const changed = () => listener(!document.hidden);
  const hidden = () => listener(false);
  document.addEventListener("visibilitychange", changed);
  window.addEventListener("pagehide", hidden);
  window.addEventListener("pageshow", changed);
  return () => {
    document.removeEventListener("visibilitychange", changed);
    window.removeEventListener("pagehide", hidden);
    window.removeEventListener("pageshow", changed);
  };
}

/** Asks for the alarm lock only if it is free: `granted` receives the release, `busy` runs when another page holds it.
 * @throws {never}
 */
export function requestAlarmLock(granted: (release: () => void) => void, busy: () => void): void {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) {
    granted(() => undefined);
    return;
  }
  void locks.request(LOCK, { ifAvailable: true }, (lock) => {
    if (!lock) {
      busy();
      return undefined;
    }
    return new Promise<void>((resolve) => granted(resolve));
  }).catch(() => busy());
}

let context: AudioContext | undefined;
const tones = new Set<OscillatorNode>();

/** Primes the audio context on the owner's first gesture, as browsers require.
 * @throws {never}
 */
export function primeAudio(): void {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
  } catch {
    context = undefined;
  }
}

/** Plays one short 880 Hz alarm or timer tone. `volume` is 0 to 100.
 * @throws {never}
 */
export function playTone(volume: number): void {
  const level = Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) / 100 : 0.7;
  if (!level || !context || context.state !== "running") return;
  try {
  const tone = context.createOscillator();
  const gain = context.createGain();
  const at = context.currentTime;
  tone.frequency.value = 880;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level * 0.12, at + 0.015);
  gain.gain.linearRampToValueAtTime(0, at + 0.3);
  tone.connect(gain);
  gain.connect(context.destination);
  tones.add(tone);
  tone.onended = () => {
    tone.disconnect();
    gain.disconnect();
    tones.delete(tone);
  };
  tone.start();
  tone.stop(at + 0.32);
  } catch {
    stopTones();
  }
}

/** Stops every tone at once.
 * @throws {never}
 */
export function stopTones(): void {
  for (const tone of tones) {
    try {
      tone.stop();
    } catch {
      tone.disconnect();
    }
    tone.disconnect();
  }
  tones.clear();
}

/** Primes audio on the first pointer or key, for as long as the page lives.
 * @throws {never}
 */
export function primeOnGesture(): () => void {
  if (typeof document === "undefined") return () => undefined;
  document.addEventListener("pointerdown", primeAudio, true);
  document.addEventListener("keydown", primeAudio, true);
  return () => {
    document.removeEventListener("pointerdown", primeAudio, true);
    document.removeEventListener("keydown", primeAudio, true);
  };
}

/**
 * The phone's IANA time zone, or "" when it cannot be read.
 * @throws {never}
 */
export function phoneTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone.length > 0 && zone.length <= 100 ? zone : "";
  } catch {
    return "";
  }
}

/**
 * Whether `zone` is a time zone this phone knows.
 * @throws {never}
 */
export function knownTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone.length > 0 && zone.length <= 100;
  } catch {
    return false;
  }
}

/**
 * The time zones the phone knows, for the world clock picker.
 * @throws {never}
 */
export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/**
 * The next instant after `now` at `hour:minute` local time on one of `days` (Sunday 1 … Saturday 7), or any day when none.
 * Skips a local time daylight saving removes. Returns 0 when none exists in the next eight days.
 * @throws {never}
 */
export function nextAlarmAt(hour: number, minute: number, days: readonly number[], now: number): number {
  for (let offset = 0; offset <= 8; offset++) {
    const at = new Date(now);
    at.setDate(at.getDate() + offset);
    at.setHours(hour, minute, 0, 0);
    if (at.getHours() !== hour || at.getMinutes() !== minute) continue;
    if (at.getTime() <= now) continue;
    if (days.length && !days.includes(at.getDay() + 1)) continue;
    return at.getTime();
  }
  return 0;
}

/**
 * The local wall time `dayOffset` days from today at `minuteOfDay`, or 0 when daylight saving skips it.
 * @throws {never}
 */
export function wallTime(dayOffset: number, minuteOfDay: number, now: number): number {
  const at = new Date(now);
  at.setHours(0, 0, 0, 0);
  at.setDate(at.getDate() + dayOffset);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  at.setHours(hour, minute, 0, 0);
  return at.getHours() === hour && at.getMinutes() === minute ? at.getTime() : 0;
}

/**
 * The local calendar date and time of `at`, as the store's recurrence names them.
 * @throws {never}
 */
export function localDateTime(at: number): { date: string; time: string; weekday: number } {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, weekday: d.getDay() };
}

/**
 * A fresh random identity.
 * @throws {never}
 */
export function freshId(): string {
  return crypto.randomUUID();
}

/** The SHA-256 of the canonical JSON of `value`, in hex. */
export async function digestOf(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Whether a notice id is an opaque identity the agent may hold.
 * @throws {never}
 */
export function opaqueId(id: string): boolean {
  return OPAQUE.test(id);
}

/**
 * Offers `text` to the developer as a file named `name`.
 * @throws {never}
 */
export function saveText(name: string, text: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
