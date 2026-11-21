/** Work the browser adapter's 100 ms poll may skip, and where an approved open loads. Pure decisions;
 * nothing here touches the DOM or a native plugin directly. */

/** The existing tab an approved (agent) open loads into, or undefined for a new tab: the selected
 * tab while it is an untouched New tab, else the agent's own earlier tab, else any untouched New
 * tab. Only tabs of the requested profile qualify; a page the user opened is never replaced. An
 * open the owner asked for in a new tab (`newTab`) never replaces the agent's earlier page either:
 * only an untouched New tab, which is a new tab already, is reused. */
export function approvedOpenTab(tabs: ReadonlyArray<{id: string; priv?: boolean}>, selected: string | undefined, agentTab: string | undefined, privateTab: boolean, untouched: (id: string) => boolean, newTab = false): string | undefined {
  const fits = (id: string | undefined) => tabs.some(tab => tab.id === id && !!tab.priv === privateTab);
  if (selected && fits(selected) && untouched(selected)) return selected;
  if (!newTab && agentTab && fits(agentTab)) return agentTab;
  return tabs.find(tab => !!tab.priv === privateTab && untouched(tab.id))?.id;
}

/** The open tabs a chat request names by a few words of a title or of a site's host
 * (browser_tab_switch, browser_tab_close). A tab whose title or host is exactly those words wins
 * over tabs that merely contain them. `page` is the tab's last known page; a tab without one is
 * matched by its New tab label. The caller passes only the tabs the request may see. */
export function matchingTabs<T extends {id: string; priv?: boolean}>(tabs: readonly T[], target: string, page: (id: string) => {title?: string; url?: string} | undefined): T[] {
  const words = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const wanted = words(target);
  if (!wanted) return [];
  const names = (tab: T) => {
    const known = page(tab.id), host = known?.url && URL.canParse(known.url) ? new URL(known.url).hostname.replace(/^www\./, '') : '';
    return [known?.title ? words(known.title) : known?.url ? '' : tab.priv ? 'new private tab' : 'new tab', host].filter(Boolean);
  };
  const exact = tabs.filter(tab => names(tab).includes(wanted));
  return exact.length ? exact : tabs.filter(tab => names(tab).some(name => name.includes(wanted)));
}

/** An approved open or Browser control refused before any effect: nothing happened, and the
 * message says why in words the owner can act on. Any other failure of an approved open may
 * have reached the native tab host, so its outcome stays unknown. */
export class BrowserOpenRefused extends Error {
  name = 'BrowserOpenRefused';
}

/** The web search this phone opens for words typed in the address bar and for a reviewed chat search. */
export const searchAddress = (query: string): URL => { const url = new URL('https://www.google.com/search'); url.searchParams.set('q', query); return url; };
/** Browser is full: an approved open or new tab is refused before a tab is created. */
export const tabLimitRefusal = (max: number) => new BrowserOpenRefused(`Browser already has ${max} tabs open. Close one, then ask again.`);

/** Whether the tab document the agent's turn observed is still the selected tab's document. A
 * command that carries no observation is not fenced by it. */
export const observedTabCurrent = (observed: {id: string; revision: string} | undefined, selected: {id: string; revision?: string} | undefined): boolean =>
  !observed || (!!selected && selected.id === observed.id && selected.revision === observed.revision);

/** Off the Browser view with the native surface already hidden, there is no geometry to measure or send. */
export const surfacePollIdle = (view: unknown, lastGeometry: string, hiddenGeometry: string): boolean =>
  surfaceIdleForView(typeof view === 'string' ? view : '', lastGeometry, hiddenGeometry);
/** `surfacePollIdle` for a view name; any non-string view is passed as ''. Checked by LemmaScript. */
export function surfaceIdleForView(view: string, lastGeometry: string, hiddenGeometry: string): boolean {
  //@ verify
  //@ ensures \result <==> view !== 'browser' && lastGeometry === hiddenGeometry
  //@ ensures view === 'browser' ==> !\result
  return view !== 'browser' && lastGeometry === hiddenGeometry;
}
