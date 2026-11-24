import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {installHomeCalendar,refreshHomeCalendar} from './helpers/home-calendar';
import {test,expect as baseExpect,type Page} from '@playwright/test';
test.describe.configure({timeout:90_000});
const expect=baseExpect.configure({timeout:15_000});
test.use({contextOptions:{reducedMotion:'reduce'}});
import {returnToApps} from './app-navigation';
import {calendarUnavailable,failBrowserCalendarReads,openBrowserCalendar,restoreBrowserCalendarReads,selectCalendarSource} from './helpers/browser-calendar';

const offline=()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
const home=(page:Page)=>page.getByRole('region',{name:'Home',exact:true});
const calendarCard=(page:Page)=>page.locator('[data-alpha-home-calendar]');
const inboxCard=(page:Page)=>home(page).locator('[data-alpha-home-inbox]');
const briefCard=(page:Page)=>home(page).locator('[data-alpha-home-brief]');
const dateLine=(page:Page)=>home(page).locator('[data-alpha-home-date]');
const browserCalendarHome=async(page:Page)=>{await openBrowserCalendar(page);await returnToApps(page);};
const nearNow=(page:Page)=>page.evaluate(async()=>{const {formatTime}=await import('/src/prototype/locale-time.ts'),now=Date.now();return [-60000,0,60000].map(offset=>formatTime(new Date(now+offset)));});

test('calendar card keeps source and time accessible without generic app labels',async({page},info)=>{
 test.slow();
 await page.addInitScript(offline);await page.goto('/');await browserCalendarHome(page);
 const card=calendarCard(page);
 await expect(card).toHaveCount(0);
 const source=card.locator('[data-alpha-home-calendar-source]');
 const origin=card.locator('[data-alpha-home-calendar-origin]');
 const expected=await page.evaluate(async()=>{
  const {BrowserCalendar}=await import('/src/browser/calendar.ts'),date=new Date(Date.now()+2*86400000);date.setHours(9,30,0,0);
  await new BrowserCalendar().save({calendarId:'local',title:'Synthetic overview event',begin:date.getTime(),end:date.getTime()+1800000,allDay:false,creationId:crypto.randomUUID()});
  const time=(value:number)=>new Date(value).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return {day:date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}),footer:`${time(date.getTime())} – ${time(date.getTime()+1800000)}`};
 });
 await page.reload();await browserCalendarHome(page);
 await expect(card).toHaveAccessibleName(`Open calendar event: Synthetic overview event, ${expected.day}, ${expected.footer}`);
 await expect(card.locator('.home-calendar-footer')).toHaveText(expected.footer);
 await expect(source).toHaveCount(0);
 await expect(origin).toHaveText('');
 await expect(dateLine(page)).toHaveCount(0);
 await expect(card).not.toContainText('In this app');
 await expect(card).toHaveAttribute('aria-description',/^In this app\. Read \d{1,2}:\d{2}.* from the calendar saved in this app$/);
 expect(await card.evaluate(element=>{const footer=element.querySelector<HTMLElement>('.home-calendar-footer')!,a=footer.getBoundingClientRect(),box=element.getBoundingClientRect();return {footerClipped:footer.scrollWidth>footer.clientWidth,inside:a.right<=box.right&&a.bottom<=box.bottom,overflow:element.scrollWidth-element.clientWidth};})).toEqual({footerClipped:false,inside:true,overflow:0});
 await page.screenshot({path:info.outputPath('home-calendar-source.png'),animations:'disabled'});
});

test('events of an app calendar hidden in Calendar stay off Home until it is shown again',async({page})=>{
 test.slow();
 await page.addInitScript(offline);await page.goto('/');await browserCalendarHome(page);
 const card=calendarCard(page);
 await expect(card).toHaveCount(0);
 const toggle=()=>page.evaluate(async()=>{const {BrowserCalendar}=await import('/src/browser/calendar.ts');await new BrowserCalendar().changePreferences({action:'visibility'});});
 await page.evaluate(async()=>{
  const {BrowserCalendar}=await import('/src/browser/calendar.ts'),date=new Date(Date.now()+2*86400000);date.setHours(9,30,0,0);
  await new BrowserCalendar().save({calendarId:'local',title:'Synthetic hidden event',begin:date.getTime(),end:date.getTime()+1800000,allDay:false,creationId:crypto.randomUUID()});
 });
 await page.reload();await browserCalendarHome(page);
 await expect(card).toContainText('Synthetic hidden event');
 await toggle();await page.reload();await browserCalendarHome(page);
 await expect(card).toHaveCount(0);
 await expect(card.locator('[data-alpha-home-calendar-source]')).toHaveCount(0);
 await toggle();await page.reload();await browserCalendarHome(page);
 await expect(card).toContainText('Synthetic hidden event');
});

test('a failed calendar widget stays honest and opening Calendar explicitly retries',async({page})=>{
 test.slow();
 await page.addInitScript(offline);await page.goto('/');await browserCalendarHome(page);
 const card=calendarCard(page),source=card.locator('[data-alpha-home-calendar-source]');
 await page.evaluate(async()=>{const {BrowserCalendar}=await import('/src/browser/calendar.ts'),begin=Date.now()+3600000;await new BrowserCalendar().save({calendarId:'local',title:'Recoverable overview event',begin,end:begin+1800000,allDay:false,creationId:crypto.randomUUID()});window.dispatchEvent(new Event('alpha:calendar-preferences'));});
 await expect(card).toContainText('Recoverable overview event');
 await expect(source).toHaveCount(0);
 await page.evaluate(async()=>{
  const {BrowserCalendar}=await import('/src/browser/calendar.ts'),proto=BrowserCalendar.prototype as any;
  (window as any).__calendarList=proto.list;proto.list=()=>Promise.reject(Error('Calendar storage unavailable'));
  window.dispatchEvent(new Event('alpha:calendar-preferences'));
 });
 await expect(card).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Calendar',exact:true})).toBeVisible();
 await page.evaluate(async()=>{
  const {BrowserCalendar}=await import('/src/browser/calendar.ts'),proto=BrowserCalendar.prototype as any,list=(window as any).__calendarList;
  (window as any).__calendarReads=0;proto.list=function(...args:unknown[]){(window as any).__calendarReads++;return list.apply(this,args);};
 });
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Unsent rerender');
 await page.waitForTimeout(500);
 await expect(card).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__calendarReads)).toBe(0);
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');
 await expect.poll(()=>page.evaluate(()=>(window as any).__calendarReads)).toBeGreaterThan(0);
 await returnToApps(page);
 await expect(card).toContainText('Recoverable overview event');
 await expect(source).toHaveCount(0);
});

test('an overdue reminder stays on Home, marked overdue with its own source, and opens in Calendar',async({page,context},info)=>{
 test.slow();
 await context.grantPermissions(['notifications']);
 await page.addInitScript(offline);await page.goto('/');await browserCalendarHome(page);
 const scheduled=await page.evaluate(async()=>{
  const {DailyApps}=await import('/src/daily.ts'),at=Date.now()+1500;
  const a=await DailyApps.scheduleReminder({id:'overview-overdue-a',title:'Synthetic overdue reminder',body:'',at});
  const b=await DailyApps.scheduleReminder({id:'overview-overdue-b',title:'Synthetic second overdue',body:'',at:at+200});
  const {BrowserCalendar}=await import('/src/browser/calendar.ts'),begin=Date.now()-3600000;
  await new BrowserCalendar().save({calendarId:'local',title:'Synthetic in-progress event',begin,end:begin+3*3600000,allDay:false,creationId:crypto.randomUUID()});
  return {at,statuses:[a.status,b.status]};
 });
 expect(scheduled.statuses).toEqual(['scheduled','scheduled']);
 await expect.poll(()=>page.evaluate(at=>Date.now()>at+400,scheduled.at),{timeout:10000}).toBe(true);
 await page.reload();await browserCalendarHome(page);
 const card=calendarCard(page);
 await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','true');
 await expect(card).toContainText('Synthetic overdue reminder');
 const due=await page.evaluate(async at=>{const {overdueDueLabel}=await import('/src/prototype/home-cards.ts');return overdueDueLabel(at,Date.now());},scheduled.at);
 expect(due).toMatch(/^Due (\S+, \S+ \d+ )?\d{1,2}:\d{2}/);
 await expect(card).toHaveAccessibleName(`Open overdue reminder: Synthetic overdue reminder, ${due}`);
 await expect(card).toContainText('2 overdue reminders');
 await expect(card.locator('.home-calendar-footer')).toHaveText(due);
 await expect(card.locator('[data-alpha-home-calendar-origin]')).toHaveText('');
 await expect(card.locator('[data-alpha-home-calendar-source]')).toHaveCount(0);
 const next=card.locator('[data-alpha-home-calendar-next-line]');
 await expect(next.locator('.home-calendar-next-text')).toHaveText('Next: Synthetic in-progress event Now');
 await expect(next.locator('[data-alpha-home-calendar-next-source]')).toHaveCount(0);
 await expect(card).toHaveAttribute('aria-description',/^Overdue reminder saved on this browser, read .+\. Next: Synthetic in-progress event, Now\. In this app\. Read .+ from the calendar saved in this app$/);
 expect(await card.evaluate(element=>{const line=element.querySelector<HTMLElement>('.home-calendar-next-text')!,a=line.getBoundingClientRect(),box=element.getBoundingClientRect();return {clipped:line.scrollWidth>line.clientWidth,inside:a.bottom<=box.bottom&&a.right<=box.right};})).toEqual({clipped:false,inside:true});
 await page.reload();await browserCalendarHome(page);await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','true');
 await page.screenshot({path:info.outputPath('home-overdue.png'),animations:'disabled'});
 await card.click();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');
 await expect(page.getByText('Synthetic overdue reminder').first()).toBeVisible();
 const done=(id:string)=>page.evaluate(async id=>{const {DailyApps}=await import('/src/daily.ts'),row=(await DailyApps.listReminders()).reminders.find(reminder=>reminder.id===id)!;return (await DailyApps.reminderDecision({id,occurrenceId:row.occurrenceId!,action:'done'})).status;},id);
 expect(await done('overview-overdue-a')).toBe('completed');
 await page.reload();await browserCalendarHome(page);
 await expect(card).toContainText('Synthetic second overdue');
 await expect(card).toContainText('Overdue reminder');await expect(card).not.toContainText('overdue reminders');
 await expect(card.locator('.home-calendar-next-text')).toHaveText('Next: Synthetic in-progress event Now');
 expect(await done('overview-overdue-b')).toBe('completed');
 await page.reload();await browserCalendarHome(page);
 await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','false');
 await expect(card).toContainText('Synthetic in-progress event');
 await expect(card.locator('[data-alpha-home-calendar-next-line]')).toHaveCount(0);
 await expect(card.locator('[data-alpha-home-calendar-origin]')).toHaveText('');
 await expect(card).toHaveAttribute('aria-description',/^In this app\. Read \d{1,2}:\d{2}.* from the calendar saved in this app$/);
});

test('an upcoming reminder is attributed to the reminder store, not to a calendar',async({page,context})=>{
 test.slow();
 await context.grantPermissions(['notifications']);
 await page.addInitScript(offline);await page.goto('/');await browserCalendarHome(page);
 expect(await page.evaluate(async()=>{
  const {DailyApps}=await import('/src/daily.ts');
  return (await DailyApps.scheduleReminder({id:'overview-upcoming',title:'Synthetic upcoming reminder',body:'',at:Date.now()+3600000})).status;
 })).toBe('scheduled');
 await page.reload();await browserCalendarHome(page);
 const card=calendarCard(page);
 await expect(card).toContainText('Synthetic upcoming reminder');
 await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','false');
 await expect(card.locator('[data-alpha-home-calendar-origin]')).toHaveText('Reminder');
 await expect(card.locator('[data-alpha-home-calendar-source]')).toHaveCount(0);
 await expect(card).toHaveAttribute('aria-description',/^Reminder saved on this browser, read .+/);
 await expect(card).not.toContainText(/In this app|This app/);
});

test('calendar card shows the verified Agent Calendar event and its source without browser fallback',async({page},info)=>{
 await page.addInitScript(offline);await page.goto('/');await installHomeCalendar(page);
 const card=calendarCard(page);await expect(card).toHaveCount(0);
 const event=await page.evaluate(()=>{const date=new Date(Date.now()+2*86400000);date.setHours(9,30,0,0);const end=new Date(date.getTime()+1800000),time=(d:Date)=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return{title:'Synthetic overview event',startAt:date.toISOString(),endAt:end.toISOString(),day:date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}),footer:time(date)+' – '+time(end)};});
 await installHomeCalendar(page,event);await page.reload();await installHomeCalendar(page,event);
 await expect(card).toHaveAccessibleName(`Open calendar event: Synthetic overview event, ${event.day}, ${event.footer}`);
 await expect(card.locator('.home-calendar-footer')).toHaveText(event.footer);
 await expect(card).not.toContainText('Agent Calendar');
 await expect(card.locator('[data-alpha-home-calendar-source]')).toHaveCount(0);
 await expect(card).not.toContainText('In this app');await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','false');
 expect(await card.evaluate(element=>{const footer=element.querySelector<HTMLElement>('.home-calendar-footer')!,a=footer.getBoundingClientRect(),box=element.getBoundingClientRect();return{footerClipped:footer.scrollWidth>footer.clientWidth,inside:a.right<=box.right&&a.bottom<=box.bottom,overflow:element.scrollWidth-element.clientWidth};})).toEqual({footerClipped:false,inside:true,overflow:0});
 expect(await page.evaluate(()=>(window as any).homeCalendarFixture.requests.every((r:any)=>r.method==='GET'))).toBe(true);
 await page.screenshot({path:info.outputPath('home-calendar-source.png'),animations:'disabled'});
});

test('events excluded by the Agent Calendar feed stay off Home until included again',async({page})=>{
 await page.addInitScript(offline);await page.goto('/');
 const event={title:'Synthetic hidden event',startAt:new Date(Date.now()+86400000).toISOString(),endAt:new Date(Date.now()+90000000).toISOString()};
 await installHomeCalendar(page,event);const card=calendarCard(page);await expect(card).toContainText(event.title);
 await refreshHomeCalendar(page,{include:false});await expect(card).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).homeCalendarFixture.event.title)).toBe(event.title);
 await refreshHomeCalendar(page,{include:true});await expect(card).toContainText(event.title);
});

test('a failed Agent Calendar widget stays honest until an explicit Calendar retry',async({page})=>{
 await page.addInitScript(offline);await page.goto('/');const event={title:'Recoverable agent overview',startAt:new Date(Date.now()+3600000).toISOString(),endAt:new Date(Date.now()+5400000).toISOString()};await installHomeCalendar(page,event);
 const card=calendarCard(page);await expect(card).toContainText(event.title);await refreshHomeCalendar(page,{fail:true});await expect(card).toHaveCount(0);await expect(page.getByRole('button',{name:'Calendar',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>(window as any).homeCalendarFixture.requests.length);
 await page.evaluate(()=>{(window as any).homeCalendarFixture.fail=false;});await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Unsent rerender');await page.waitForTimeout(500);
 expect(await page.evaluate(()=>(window as any).homeCalendarFixture.requests.length)).toBe(before);await expect(card).toHaveCount(0);
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.getByRole('button',{name:'Calendar',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');await returnToApps(page);await expect(card).toContainText(event.title);
 expect(await page.evaluate(()=>(window as any).homeCalendarFixture.requests.length)).toBeGreaterThan(before);
});

test('an overdue reminder keeps priority over Agent Calendar and restores its event after completion',async({page,context},info)=>{
 await context.grantPermissions(['notifications']);await page.addInitScript(offline);await page.goto('/');
 const event={title:'Synthetic in-progress event',startAt:new Date(Date.now()-3600000).toISOString(),endAt:new Date(Date.now()+7200000).toISOString()};await installHomeCalendar(page,event);
 const scheduled=await page.evaluate(async()=>{const {DailyApps}=await import('/src/daily.ts'),at=Date.now()+1500;const a=await DailyApps.scheduleReminder({id:'overview-overdue-a',title:'Synthetic overdue reminder',body:'',at});const b=await DailyApps.scheduleReminder({id:'overview-overdue-b',title:'Synthetic second overdue',body:'',at:at+200});const future=await DailyApps.scheduleReminder({id:'overview-future',title:'Unselected future reminder',body:'',at:at+3600000});return{at,statuses:[a.status,b.status,future.status]};});expect(scheduled.statuses).toEqual(['scheduled','scheduled','scheduled']);await expect.poll(()=>page.evaluate(at=>Date.now()>at+400,scheduled.at),{timeout:10000}).toBe(true);
 await page.reload();await installHomeCalendar(page,event);const card=calendarCard(page);await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','true');await expect(card).toContainText('Synthetic overdue reminder');await expect(card).toContainText('2 overdue reminders');await expect(card).toHaveAttribute('aria-description',/^Overdue reminder saved on this browser, read /);
 await expect(card).toHaveAttribute('aria-description',/Next: Synthetic in-progress event, Now\. Agent Calendar$/);await expect(card).not.toHaveAttribute('aria-description',/Unselected future reminder/);await page.screenshot({path:info.outputPath('home-overdue.png'),animations:'disabled'});
 await card.click();await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');await expect(page.getByText('Synthetic overdue reminder').first()).toBeVisible();
 const done=(id:string)=>page.evaluate(async id=>{const {DailyApps}=await import('/src/daily.ts'),row=(await DailyApps.listReminders()).reminders.find(r=>r.id===id)!;return(await DailyApps.reminderDecision({id,occurrenceId:row.occurrenceId!,action:'done'})).status;},id);
 expect(await done('overview-overdue-a')).toBe('completed');await page.reload();await installHomeCalendar(page,event);await expect(card).toContainText('Synthetic second overdue');expect(await done('overview-overdue-b')).toBe('completed');await page.reload();await installHomeCalendar(page,event);await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','false');await expect(card).toContainText(event.title);await expect(card.locator('[data-alpha-home-calendar-source]')).toHaveCount(0);
});

test('an upcoming reminder leads Home under Agent Calendar with its own source and stays in Calendar',async({page,context})=>{
 await context.grantPermissions(['notifications']);await page.addInitScript(offline);await page.goto('/');await installHomeCalendar(page);
 expect(await page.evaluate(async()=>{const {DailyApps}=await import('/src/daily.ts');return(await DailyApps.scheduleReminder({id:'overview-upcoming',title:'Synthetic upcoming reminder',body:'',at:Date.now()+3600000})).status;})).toBe('scheduled');
 await page.reload();await installHomeCalendar(page);const card=calendarCard(page);await expect(card).toContainText('Synthetic upcoming reminder');await expect(card.locator('[data-alpha-home-calendar-origin]')).toHaveText('Reminder');await expect(card).toHaveAttribute('aria-description',/^Reminder saved on this browser/);await expect(card).not.toContainText('Nothing planned');await expect(card).toHaveAttribute('data-alpha-home-calendar-overdue','false');
 expect(await page.evaluate(async()=>{const {DailyApps}=await import('/src/daily.ts');return(await DailyApps.listReminders()).reminders.some(r=>r.id==='overview-upcoming');})).toBe(true);
 await card.click();await expect(page.getByText('Synthetic upcoming reminder',{exact:true}).first()).toBeVisible();
});

test('after a browser calendar read and local midnight, a reminder under Agent Calendar keeps its own source',async({page,context})=>{
 test.slow();
 await context.grantPermissions(['notifications']);
 const evening=new Date();evening.setHours(23,50,0,0);
 await page.clock.install({time:evening});
 await page.addInitScript(offline);await page.goto('/');
 expect(await page.evaluate(async()=>{
  const {DailyApps}=await import('/src/daily.ts');
  return (await DailyApps.scheduleReminder({id:'overview-agent-after-device',title:'Synthetic agent-scope reminder',body:'',at:Date.now()+3600000})).status;
 })).toBe('scheduled');
 await page.reload();
 await openBrowserCalendar(page);
 await selectCalendarSource(page,'Agent Calendar');
 await returnToApps(page);
 const card=calendarCard(page);
 await expect(card).toContainText('Synthetic agent-scope reminder');
 await page.clock.fastForward(20*60000);
 await returnToApps(page);
 await expect(card).toContainText('Synthetic agent-scope reminder');
 await expect(card).toHaveAttribute('data-alpha-home-calendar-stale','false');
 await expect(card.locator('[data-alpha-home-calendar-origin]')).toHaveText('Reminder');
 await expect(card).toHaveAttribute('aria-description',/^Reminder saved on this browser, read .+/);
 await expect(card).not.toContainText(/Not updated since/);
});


async function mailFixture(page:Page){
 await page.addInitScript(offline);await page.goto('/');
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx'),{secureConnectionStore:s}=await import('/src/runtime/native-connection.ts');
  s.read=async()=>null;
  const f=(window as any).overviewMail={reads:0,threadReads:0,fail:false,rows:[
   {id:'unread-a',threadId:'thread-a',subject:'Synthetic overview subject',from:'Synthetic sender A',to:[],snippet:'Synthetic body preview',receivedAt:'2026-10-09T00:00:00Z',unread:true},
   {id:'read',threadId:'thread-read',subject:'Synthetic read subject',from:'Synthetic sender B',to:[],snippet:'',receivedAt:'2026-10-09T00:00:00Z',unread:false}]};
  const client={gmailAccounts:async()=>[{connectionId:'grant-overview',label:'Synthetic mailbox',connected:true,grantedCapabilities:['google.gmail.triage']}],
   gmailSearch:async()=>{f.reads++;if(f.fail)throw Error('Synthetic provider unavailable');return {messages:structuredClone(f.rows),syncedAt:'fixture',nextPageToken:null};},
   gmailThread:async()=>{f.threadReads++;throw Error('Synthetic thread read is not part of this test');},
   gmailInboxCapabilities:async()=>({send:false,providerDrafts:false,mailboxMutations:false})};
  c.getCloudClient=()=>({client,sessionId:'fixture-overview'} as any);
  const snapshot={...c.getSnapshot(),cloudAccount:{environment:'production',userId:'fixture-overview',sessionId:'fixture-overview',credentialId:'fixture-only'}};c.getSnapshot=()=>snapshot;
 });
}
const mailReads=(page:Page)=>page.evaluate(()=>({reads:(window as any).overviewMail.reads,threads:(window as any).overviewMail.threadReads}));

test('Inbox card never reads mail from Home and shows the account and read time of the loaded page',async({page},info)=>{
 const renderErrors:string[]=[];page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Cannot update during an existing state transition'))renderErrors.push(message.text());});
 await mailFixture(page);
 const card=inboxCard(page);
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Unsent rerender');
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(1500);
 expect(await mailReads(page)).toEqual({reads:0,threads:0});
 await expect(card).toHaveCount(0);
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:/Unread, Synthetic sender A/})).toBeVisible();
 const times=await nearNow(page);
 await returnToApps(page);
 expect(await mailReads(page)).toEqual({reads:1,threads:0});
 await expect(card).toHaveAccessibleName('Open Inbox: 1 unread email');
 await expect(card).toContainText('1 unread');await expect(card).toContainText('Synthetic overview subject');
 await expect(card).not.toContainText('Synthetic body preview');await expect(card).not.toContainText('Synthetic read subject');
 const status=await card.getAttribute('aria-description');
 expect(times.map(time=>`Synthetic mailbox · Updated ${time}`)).toContain(status);
 await expect(card).toContainText(status!);
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Another unsent rerender');
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.waitForTimeout(1000);
 expect(await mailReads(page)).toEqual({reads:1,threads:0});
 await expect(card).toHaveAttribute('aria-description',status!);
 await page.screenshot({path:info.outputPath('home-inbox-read-time.png'),animations:'disabled'});
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).blur();
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:/Unread, Synthetic sender A/})).toBeVisible();
 await page.evaluate(()=>{(window as any).overviewMail.fail=true;});
 await page.getByRole('button',{name:'Refresh inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:'Refresh inbox',exact:true})).toBeEnabled();
 await returnToApps(page);
 await expect(card).toHaveAttribute('aria-description',/^Open to retry · last updated \d{1,2}:\d{2}/);
 expect(renderErrors,'Inbox cache restoration must not update React during render').toEqual([]);
});

test('Brief appears for retained owner results with their run time',async({page},info)=>{
 await page.addInitScript(offline);await page.goto('/');
 await expect(calendarCard(page)).toHaveCount(0);
 await expect(briefCard(page)).toHaveCount(0);
 await expect(home(page)).not.toContainText('Morning brief');
 const {ranAt,ranIso}=await page.evaluate(async()=>{
  const {rememberRetainedDigests}=await import('/src/runtime/hosted-digests.ts'),at=new Date(Date.now()-3600000);
  rememberRetainedDigests([
   {cursor:1,runId:'run-old',completedAt:new Date(at.getTime()-86400000).toISOString(),status:'succeeded',output:'Synthetic older brief'},
   {cursor:2,runId:'run-new',completedAt:at.toISOString(),status:'succeeded',output:{summary:'Synthetic brief: two meetings and one reply to send.'}}] as any,'Synthetic agent');
  const {whenLabel}=await import('/src/prototype/home-cards.ts');return {ranAt:whenLabel(at.getTime(),Date.now()),ranIso:at.toISOString()};
 });
 const card=briefCard(page);
 await expect(card).toBeVisible();
 await expect(card).toContainText('Latest brief');
 await expect(card).toContainText('Synthetic brief: two meetings and one reply to send.');
 await expect(card).not.toContainText('Synthetic older brief');
 await expect(card).toContainText(`Synthetic agent · Ran ${ranAt}`);
 await expect(card).toHaveAccessibleName(`Open Workflows. Latest brief from Synthetic agent, ran ${ranAt}: Synthetic brief: two meetings and one reply to send.`);
 await expect(card).toHaveAttribute('data-alpha-home-brief-failed','false');
 await expect(calendarCard(page)).toHaveCount(0);await expect(inboxCard(page)).toHaveCount(0);await expect(home(page).locator('[data-alpha-home-workflows]')).toHaveCount(0);
 await card.scrollIntoViewIfNeeded();
 expect(await card.evaluate(element=>{const box=element.getBoundingClientRect(),title=element.querySelector('.home-brief-title')!.getBoundingClientRect(),status=element.querySelector('.home-brief-status')!.getBoundingClientRect();return {height:Math.round(box.height),overflow:element.scrollWidth-element.clientWidth,ordered:title.bottom<=status.top,inside:status.bottom<=box.bottom};})).toEqual({height:196,overflow:0,ordered:true,inside:true});
 await page.screenshot({path:info.outputPath('home-brief.png'),animations:'disabled'});
 const missed={cursor:3,runId:'run-missed',completedAt:new Date(Date.now()-1800000).toISOString(),status:'missed',output:{status:'missed',text:'The scheduled time was missed. No backlog was executed.'},error:null};
 const latest=await page.evaluate(async({missed,ranIso})=>{
  const {rememberRetainedDigests,latestRetainedDigest}=await import('/src/runtime/hosted-digests.ts');
  rememberRetainedDigests([{cursor:2,runId:'run-new',completedAt:ranIso,status:'succeeded',output:{summary:'Synthetic brief: two meetings and one reply to send.'}},missed] as any,'Synthetic agent');
  return latestRetainedDigest();
 },{missed,ranIso});
 expect(latest).toMatchObject({status:'succeeded',ranAt:ranIso});
 await expect(card).toContainText('Synthetic brief: two meetings and one reply to send.');
 await expect(card).toContainText(`Synthetic agent · Ran ${ranAt}`);
 await expect(card).not.toContainText('The scheduled time was missed');
 await expect(card).not.toContainText(/Did not run/);
 await expect(card).toHaveAttribute('data-alpha-home-brief-failed','false');
 await page.evaluate(async missed=>{(await import('/src/runtime/hosted-digests.ts')).rememberRetainedDigests([missed] as any,'Synthetic agent');},missed);
 await expect(briefCard(page)).toHaveCount(0);
 await expect(home(page)).not.toContainText('The scheduled time was missed');
 const failedAt=await page.evaluate(async()=>{
  const at=new Date(Date.now()-60000);
  const {rememberRetainedDigests}=await import('/src/runtime/hosted-digests.ts');
  rememberRetainedDigests([{cursor:4,runId:'run-failed',completedAt:at.toISOString(),status:'failed',error:'Synthetic source expired'}] as any,'Synthetic agent');
  const {whenLabel}=await import('/src/prototype/home-cards.ts');return whenLabel(at.getTime(),Date.now());
 });
 await expect(card).toHaveAttribute('data-alpha-home-brief-failed','true');
 await expect(card).toContainText('Synthetic source expired');
 await expect(card).toContainText(`Synthetic agent · Failed ${failedAt}`);
 await card.click();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','workflows');
 await returnToApps(page);
 await page.evaluate(async()=>{(await import('/src/runtime/hosted-digests.ts')).rememberRetainedDigests(null);});
 await expect(briefCard(page)).toHaveCount(0);
});

test('the digest panel publishes the connected profile\'s newest retained result and withdraws it on disconnect',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('alpha.connection.selection.v1'))localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));});
 await page.goto('/?mode=dev');
 const retained=()=>page.evaluate(async()=>(await import('/src/runtime/hosted-digests.ts')).latestRetainedDigest());
 await expect(page.locator('[data-alpha-home-apps]')).toBeVisible();
 expect(await retained()).toBeNull();
 const completedAt=await page.evaluate(()=>{
  const at=Date.now()-3600000,iso=(value:number)=>new Date(value).toISOString(),key='alpha.browser.digests.local.v1',state=JSON.parse(localStorage.getItem(key)||'{"sources":[],"loops":[],"receipts":[],"results":[],"cursor":0,"acks":{}}');
  const row=(runId:string,completed:number,extra:object)=>({cursor:++state.cursor,runId,workflowId:'workflow',workflowVersionId:'version',templateVersion:'hosted-digest-1',scheduledAt:iso(completed),source:{observedAt:iso(completed),expiresAt:iso(Date.now()+3600000)},startedAt:iso(completed),completedAt:iso(completed),error:null,...extra});
  state.results.push(row('overview-new',at,{status:'finished',output:[{nodeId:'typed-steps',runId:'overview-new',text:'Synthetic retained brief.',steps:[{id:'source',text:'SYNTHETIC_RAW_SOURCE_456'}]}]}),row('overview-old',at-86400000,{status:'finished',output:'Synthetic older brief'}));
  localStorage.setItem(key,JSON.stringify(state));return iso(at);
 });
 expect(await retained()).toBeNull();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);await page.getByRole('button',{name:'Connect development profile'}).click();
 await expect.poll(retained,{timeout:20000}).toMatchObject({summary:'Synthetic retained brief.',ranAt:completedAt,status:'finished'});
 expect(JSON.stringify(await retained())).not.toContain('SYNTHETIC_RAW_SOURCE_456');
 await page.evaluate(async()=>{await(await import('/src/runtime/connection-ui.tsx')).connectionController.offline();});
 await expect.poll(retained).toBeNull();
});

test('workflows card appears with real workflow states, and keeps its load time accessible',async({page},info)=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/,route=>route.abort());
 await page.addInitScript(offline);await page.goto('/?mode=dev&workflows=agent');
 const {installWorkflowListFixture}=await import('./workflow-navigation');await installWorkflowListFixture(page);
 await page.evaluate(async()=>{
  const f=(window as any).overviewFlows={lists:0,writes:0};
  const {WorkflowProtocol:P}=await import('/src/runtime/workflow-protocol.ts');
  P.prototype.lifecycleSupported=async()=>false;
  P.prototype.list=async()=>{f.lists++;return [{id:'overview',name:'Synthetic overview routine',active:true,description:'',versionId:'v1',steps:[]},{id:'paused',name:'Synthetic paused routine',active:false,description:'',versionId:'v1',steps:[]}];};
  for(const method of ['activate','pause','run','lifecycle','updateMetadata'])(P.prototype as any)[method]=async()=>{f.writes++;throw Error('Writes are not part of Home');};
 });
 const card=home(page).locator('[data-alpha-home-workflows]'),freshness=card.locator('[data-alpha-home-workflow-freshness]');
 await expect(freshness).toHaveCount(0);
 await expect(card).toHaveCount(0);
 await page.evaluate(async()=>{const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');await c.initialize();await c.startDevelopment('local');});
 await expect(card).toContainText('Synthetic overview routine');
 await expect(card).toContainText('Synthetic paused routine');await expect(card).toContainText('Paused');
 await expect(card).not.toContainText(/Loaded \d/);
 const times=await nearNow(page);
 expect(times.map(time=>`Workflows from your agent, loaded ${time}`)).toContain(await card.getAttribute('aria-description'));
 expect(await card.evaluate(element=>({height:Math.round(element.getBoundingClientRect().height),overflowX:element.scrollWidth-element.clientWidth}))).toEqual({height:196,overflowX:0});
 await card.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('home-workflows-loaded.png'),animations:'disabled'});
 await page.evaluate(async()=>{await(await import('/src/runtime/connection-ui.tsx')).connectionController.offline();});
 await expect(card).toHaveCount(0);
 await expect(freshness).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).overviewFlows.writes)).toBe(0);
});


test('empty Home opens Workflows without generating or reading provider content',async({page})=>{
 await page.addInitScript(offline);await page.goto('/');const card=briefCard(page);await expect(card).toHaveCount(0);
 const initial=await page.evaluate(async()=>{
  const f=(window as any).emptyBrief={events:0,requests:[]};window.addEventListener('alpha:hosted-digests',()=>f.events++);
  const original=window.fetch;window.fetch=(...args)=>{const req=args[0],init=args[1];f.requests.push({method:init?.method||(req instanceof Request?req.method:'GET')});return original(...args);};
  const digest=await import('/src/runtime/hosted-digests.ts');return digest.latestRetainedDigest();
 });expect(initial).toBeNull();await page.getByRole('button',{name:'Workflows',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-active-view','workflows');
 expect(await page.evaluate(async()=>({events:(window as any).emptyBrief.events,mutations:(window as any).emptyBrief.requests.filter((r:any)=>r.method!=='GET').length,retained:(await import('/src/runtime/hosted-digests.ts')).latestRetainedDigest()}))).toEqual({events:0,mutations:0,retained:null});
 await returnToApps(page);await expect(card).toHaveCount(0);
});
