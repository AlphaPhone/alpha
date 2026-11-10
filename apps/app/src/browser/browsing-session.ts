/** Saved normal browser tabs and history. Owner decision: tabs keep sign-ins.
 * Engineering choice: they are restored after a cold start; private tabs are never saved. Mirrors
 * the bounds of the native encrypted `BrowserSessionStore`. */
export const MAX_SAVED_TABS = 8, MAX_SAVED_HISTORY = 100, MAX_SAVED_TITLE = 200;
export type SavedTab = { id: string; url: string; title: string };
export type SavedBrowsing = { history: string[]; tabs: SavedTab[]; cur: string };
type Bag = Record<string, any>;

export function savedBrowserUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 4096 || /[\u0000- \u007f]/.test(value)) return false;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
const savedTitle = (value: unknown) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, MAX_SAVED_TITLE).trim();

/** Bounded canonical form; invalid rows are dropped rather than stored. */
export function normalizeBrowsing(input: any): SavedBrowsing {
  const history: string[] = [];
  for (const url of Array.isArray(input?.history) ? input.history : []) if (history.length < MAX_SAVED_HISTORY && savedBrowserUrl(url) && !history.includes(url)) history.push(url);
  const tabs: SavedTab[] = [];
  for (const tab of Array.isArray(input?.tabs) ? input.tabs : [])
    if (tabs.length < MAX_SAVED_TABS && typeof tab?.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(tab.id) && savedBrowserUrl(tab.url) && !tabs.some(saved => saved.id === tab.id))
      tabs.push({ id: tab.id, url: tab.url, title: savedTitle(tab.title) });
  return { history, tabs, cur: tabs.some(tab => tab.id === input?.cur) ? input.cur : '' };
}

/** A page whose address is final: committed, finished loading and not an error page. Only such a
 * page enters history or becomes a tab's saved address. */
export const committedPage = (event: { url?: unknown; committed?: unknown; loading?: unknown; error?: unknown } | null | undefined): boolean =>
  !!event && !!event.url && !!event.committed && !event.loading && !event.error;

/** Whether `count` open tabs (normal and private together) leave no room for another. */
export const tabLimitReached = (count: number): boolean => !(count < MAX_SAVED_TABS);

/** What the renderer saves: normal tabs with a committed (or still-unloaded
 * restored) address, and history. Private tabs and their pages are excluded.
 * When more tabs qualify than fit, the selected tab takes the last place. */
export function browsingSnapshot(state: { tabs: Bag[]; visits: string[]; cur: string }, page: (id: string) => { url?: string; title?: string } | undefined): SavedBrowsing {
  const tabs: SavedTab[] = [];
  let selected: SavedTab | undefined;
  for (const tab of state.tabs) {
    if (tab.priv || (tabs.length >= MAX_SAVED_TABS && tab.id !== state.cur)) continue;
    const known = page(tab.id);
    if (!savedBrowserUrl(known?.url)) continue;
    const saved = { id: tab.id, url: known!.url!, title: savedTitle(known!.title) };
    if (tabs.length < MAX_SAVED_TABS) tabs.push(saved); else selected = saved;
  }
  if (selected) tabs[MAX_SAVED_TABS - 1] = selected;
  return normalizeBrowsing({ history: state.visits, tabs, cur: state.cur });
}

/** Merge a saved record into the renderer. Saved tabs replace only an untouched single new tab.
 * Otherwise every open tab is kept and stays selected, and the saved tabs that still fit under the
 * tab limit are added after them, unloaded, so the next save does not drop them. */
export function restoreBrowsing(saved: unknown, state: { tabs: Bag[]; visits: string[]; cur?: string }, pristine: boolean) {
  const record = normalizeBrowsing(saved);
  const visits = [...state.visits, ...record.history.filter(url => !state.visits.includes(url))].slice(0, MAX_SAVED_HISTORY);
  const row = (tab: SavedTab) => ({ id: tab.id, hist: ['newtab'], pos: 0 });
  if (pristine) {
    if (!record.tabs.length) return { visits, restored: [] as SavedTab[] };
    const tabs = record.tabs.map(row);
    return { visits, restored: record.tabs, tabs, cur: record.cur || tabs[0].id };
  }
  const added = record.tabs.filter(tab => !state.tabs.some(open => open.id === tab.id)).slice(0, Math.max(0, MAX_SAVED_TABS - state.tabs.length));
  if (!added.length) return { visits, restored: [] as SavedTab[] };
  return { visits, restored: added, tabs: [...state.tabs, ...added.map(row)], cur: state.cur ?? state.tabs[0]?.id };
}
