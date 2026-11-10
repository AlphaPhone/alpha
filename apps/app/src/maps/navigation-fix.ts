import type { Position } from './native-location.ts';

export const NAVIGATION_FIX_LIMITS = { maxFixAgeMs: 30_000, maxAccuracyMeters: 50 } as const;
/** Recheck at use time: a previously accepted GPS fix can age without another event. */
export function usableNavigationFix(fix: Position | undefined, now = Date.now(), limits: { maxFixAgeMs: number; maxAccuracyMeters: number } = NAVIGATION_FIX_LIMITS): fix is Position {
 return !!fix && Number.isFinite(fix.timestamp) && now - fix.timestamp <= limits.maxFixAgeMs && fix.timestamp <= now + 5_000 &&
  Number.isFinite(fix.accuracyMeters) && fix.accuracyMeters >= 0 && fix.accuracyMeters <= limits.maxAccuracyMeters && fix.precision === 'precise';
}
/** Starts the location watch that feeds guidance. A start that is refused before a watch exists
 * (another start or a permission request still settling, no native location) rejects instead of
 * reporting through its error callback; both reach `onError`, so guidance never waits on a watch
 * that was not started. */
export function watchNavigationFixes(location: { start(oneShot: boolean, onFix: (fix: Position) => void, onError: (error: Error) => void): Promise<void> },
 onFix: (fix: Position) => void, onError: (error: unknown) => void): void {
 void location.start(false, onFix, onError).catch(onError);
}
