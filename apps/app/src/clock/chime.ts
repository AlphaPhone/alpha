// spec/app/clock/index.md, "Story: Hear and prioritize ringing alerts"
import type { AlarmSound } from "./records.ts";

interface SoundPattern {
  readonly wave: OscillatorType;
  readonly notes: ReadonlyArray<number>;
  readonly noteSec: number;
  readonly gapSec: number;
  readonly gain: number;
}

const PATTERNS: Readonly<Record<AlarmSound, SoundPattern>> = {
  radar: { wave: "triangle", notes: [880, 1174.66, 880], noteSec: 0.12, gapSec: 0.06, gain: 0.22 },
  chime: { wave: "sine", notes: [523.25, 659.25, 783.99, 1046.5], noteSec: 0.16, gapSec: 0.04, gain: 0.2 },
  pulse: { wave: "sine", notes: [698.46, 698.46], noteSec: 0.14, gapSec: 0.1, gain: 0.22 },
  gentle: { wave: "sine", notes: [440, 554.37, 659.25], noteSec: 0.22, gapSec: 0.05, gain: 0.16 },
  classic: { wave: "square", notes: [1046.5, 1318.5, 1046.5], noteSec: 0.1, gapSec: 0.06, gain: 0.12 },
};

const TIMER_PATTERN: SoundPattern = {
  wave: "sine",
  notes: [880, 880, 1174.66],
  noteSec: 0.11,
  gapSec: 0.07,
  gain: 0.2,
};

let sharedContext: AudioContext | undefined;

function audioContext(): AudioContext | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return undefined;
  try {
    sharedContext ??= new ctor();
    if (sharedContext.state === "suspended") void sharedContext.resume().catch(() => undefined);
    return sharedContext;
  } catch {
    return undefined;
  }
}

/**
 * Play one synthesized Web Audio pulse for an alarm sound or timer completion; safe no-op where AudioContext is unavailable.
 * @throws {never}
 */
export function playChimePulse(sound: AlarmSound, isTimer = false): void {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    const pattern = isTimer ? TIMER_PATTERN : PATTERNS[sound];
    let offset = ctx.currentTime + 0.01;
    for (const freq of pattern.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = pattern.wave;
      osc.frequency.setValueAtTime(freq, offset);
      gain.gain.setValueAtTime(0.0001, offset);
      gain.gain.exponentialRampToValueAtTime(pattern.gain, offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + pattern.noteSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(offset);
      osc.stop(offset + pattern.noteSec + 0.01);
      offset += pattern.noteSec + pattern.gapSec;
    }
  } catch {
    return;
  }
}
