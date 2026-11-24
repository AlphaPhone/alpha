// spec/workflows/runs.md, "Run is reviewed first, and the confirmation saves one fresh submission before anything is sent"; spec/workflows/hostedResults.md, "Story: Be told when my digest is ready, and open exactly that result"

export { sha256Hex } from "../calendar/digest.ts";
export { deviceZone } from "../calendar/time.ts";

/**
 * The instant of a date-time string, or 0 when it is not one.
 * @throws {never}
 */
export function instant(text: string | undefined): number {
  const at = text === undefined ? Number.NaN : Date.parse(text);
  return Number.isFinite(at) ? at : 0;
}

/**
 * Whether two instants fall on the same calendar day in `zone`.
 * @throws {never}
 */
export function sameLocalDay(a: number, b: number, zone: string): boolean {
  try {
    const day = (at: number) => new Date(at).toLocaleDateString("sv-SE", { timeZone: zone });
    return day(a) === day(b);
  } catch {
    return false;
  }
}
