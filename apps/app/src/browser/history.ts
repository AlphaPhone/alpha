import type { SavedBrowsing } from '../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/browsing-session';

const minute = 60_000;

export const browserHistoryRanges = [
  { id: '15-minutes', label: 'Last 15 minutes', duration: 15 * minute },
  { id: 'hour', label: 'Last hour', duration: 60 * minute },
  { id: 'day', label: 'Last day', duration: 24 * 60 * minute },
  { id: 'week', label: 'Last week', duration: 7 * 24 * 60 * minute },
  { id: 'year', label: 'Last year', duration: 365 * 24 * 60 * minute },
  { id: 'all', label: 'All time', duration: null },
] as const;

export type SavedBrowserHistory = SavedBrowsing & { visitTimes?: Record<string, number> };
export type BrowserHistoryInterval = { since: number | null; until: number };

export function historyOutsideInterval(history: readonly string[], dates: SavedBrowserHistory['visitTimes'], {since, until}: BrowserHistoryInterval): string[] {
  if (since === null) return [];
  return history.filter(url => {
    const time = dates?.[url];
    return time === undefined || time < since || time > until;
  });
}

/** Retain dates only for valid URLs already admitted into the bounded history. */
export function browserVisitTimes(history: readonly string[], input: unknown): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const dates = input as Record<string, unknown>;
  return Object.fromEntries(history.flatMap(url => {
    const time = dates[url];
    return typeof time === 'number' && Number.isSafeInteger(time) && time > 0 ? [[url, time]] : [];
  }));
}
