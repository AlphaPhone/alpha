import {expect, type Page} from '@playwright/test';

export async function openRetainedCalendarSource(page:Page,authority:'android-native'|'browser-local'|'canonical'){
  await page.evaluate(authority=>{
    const root=document.getElementById('root') as any,key=Object.keys(root).find(name=>name.startsWith('__reactContainer$'));
    if(!key)throw Error('Phone shell is unavailable');
    const pending=[root[key]];
    while(pending.length){const fiber=pending.pop(),shell=fiber?.stateNode;
      if(typeof shell?.vset==='function'&&typeof shell?.openView==='function'){
        if(shell.vget('calendar').form)throw Error('Cannot replace an active Calendar draft');
        shell.vset('calendar',{calendarAuthority:authority,open:null});
        shell.openView('calendar',{calendarAuthority:authority});return;
      }
      if(fiber?.sibling)pending.push(fiber.sibling);if(fiber?.child)pending.push(fiber.child);
    }
    throw Error('Phone shell is unavailable');
  },authority);
  await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');
}
export async function selectCalendarSource(page:Page,name:string){
  const authority=name==='Android calendars'?'android-native':name==='Browser calendar (development)'?'browser-local':name==='Agent Calendar'?'canonical':null;
  if(!authority)throw Error('Unsupported retained Calendar fixture authority');
  await openRetainedCalendarSource(page,authority);
}

export async function openBrowserCalendar(page: Page) {
  await expect(page.getByRole('button', {name: 'Calendar', exact: true})).toBeVisible();
  await selectCalendarSource(page, 'Browser calendar (development)');
}

export async function chooseCalendarEventAction(page: Page, action: 'Edit event' | 'Delete event') {
  const menu = page.locator('details').filter({has: page.getByLabel('Event actions', {exact: true})});
  await expect(menu).toBeVisible();
  if (await menu.getAttribute('open') === null) await menu.getByLabel('Event actions', {exact: true}).click();
  await menu.getByRole('button', {name: action, exact: true}).click();
}

export const calendarUnavailable = 'Calendar unavailable';

export async function failBrowserCalendarReads(page: Page) {
  await page.evaluate(async () => {
    const {BrowserCalendar} = await import('/src/browser/calendar.ts'), proto = BrowserCalendar.prototype as any;
    (window as any).__calendarList = proto.list;
    proto.list = () => Promise.reject(Error('Calendar storage unavailable'));
    window.dispatchEvent(new Event('alpha:calendar-preferences'));
  });
}

export async function restoreBrowserCalendarReads(page: Page, {notify}: {notify: boolean}) {
  await page.evaluate(async notify => {
    const {BrowserCalendar} = await import('/src/browser/calendar.ts'), proto = BrowserCalendar.prototype as any, list = (window as any).__calendarList;
    (window as any).__calendarReads = 0;
    proto.list = function (...args: unknown[]) { (window as any).__calendarReads++; return list.apply(this, args); };
    if (notify) window.dispatchEvent(new Event('alpha:calendar-preferences'));
  }, notify);
}
