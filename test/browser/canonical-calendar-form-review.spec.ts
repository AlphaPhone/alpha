import {test,expect} from '@playwright/test';
import {openCanonicalCalendar} from './helpers/canonical-calendar';
import {chooseCalendarEventAction} from './helpers/browser-calendar';
test.use({timezoneId:'America/New_York',contextOptions:{reducedMotion:'reduce'}});
const state=(page:any,patch?:Record<string,unknown>)=>page.evaluate((patch:any)=>{const screen=document.querySelector('[data-screen]') as any;let fiber=screen[Object.keys(screen).find(key=>key.startsWith('__reactFiber$'))!];while(fiber&&!(fiber.stateNode&&typeof fiber.stateNode.vget==='function'))fiber=fiber.return;const shell=fiber.stateNode;if(patch)shell.vset('calendar',patch);return shell.vget('calendar');},patch);
test('canonical spring detail and editor show both real clocks and the current guests',async({page})=>{
 await page.clock.setFixedTime(new Date('2027-03-14T12:00Z'));
 await openCanonicalCalendar(page,{eventTitle:'Spring transition',begin:Date.parse('2027-03-14T06:30Z'),end:Date.parse('2027-03-14T07:30Z'),guestEmails:['guest@example.org']});
 await page.getByRole('button',{name:/^Spring transition,/}).click();
 await expect(page.getByText(/UTC-05:00.*UTC-04:00/)).toBeVisible();await expect(page.getByText('guest@example.org',{exact:true})).toBeVisible();
 await chooseCalendarEventAction(page,'Edit event');
 await expect(page.getByLabel('Start time',{exact:true})).toHaveValue('01:30');await expect(page.getByLabel('End time',{exact:true})).toHaveValue('03:30');expect((await state(page)).form.d).toBe(2);
 await expect(page.getByRole('button',{name:'Remove guest@example.org',exact:true})).toBeVisible();
 await page.getByLabel('End time',{exact:true}).fill('04:17');expect(Math.round((await state(page)).form.d*60)).toBe(167);
 expect(await page.evaluate(()=>(window as any).canonicalCalendarAccessibility.requests.every((request:any)=>request.method==='GET'))).toBe(true);
});
test('a backward-clock interval keeps truthful timing while allowing metadata edits',async({page})=>{
 await page.clock.setFixedTime(new Date('2027-11-07T12:00Z'));
 await openCanonicalCalendar(page,{eventTitle:'Repeated hour',begin:Date.parse('2027-11-07T05:45Z'),end:Date.parse('2027-11-07T06:15Z')});
 await page.getByRole('button',{name:/^Repeated hour,/}).click();await chooseCalendarEventAction(page,'Edit event');
 await expect(page.getByLabel('Original event time',{exact:true})).toBeVisible();await expect(page.getByLabel('Start time',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Calendar date',{exact:true})).toHaveCount(0);
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Kept timing');expect((await state(page)).form.title).toBe('Kept timing');
});
test('canceling or retiring a canonical deletion review dispatches no record mutation',async({page})=>{
 await page.clock.setFixedTime(new Date('2027-06-10T12:00Z'));
 await openCanonicalCalendar(page,{eventTitle:'Reviewed deletion',begin:Date.parse('2027-06-10T13:00Z'),end:Date.parse('2027-06-10T14:00Z'),organizerSelf:true});
 await page.getByRole('button',{name:/^Reviewed deletion,/}).click();await chooseCalendarEventAction(page,'Delete event');
 const review=page.getByRole('dialog',{name:'Delete event?',exact:true});await expect(review).toContainText('Reviewed deletion');await expect(review).toContainText('No guest notification');await review.getByRole('button',{name:'Cancel',exact:true}).click();
 await chooseCalendarEventAction(page,'Delete event');await expect(review).toBeVisible();const before=await state(page);await state(page,{open:null});await expect(review).toHaveCount(0);await state(page,{open:before.open});
 expect(await page.evaluate(()=>(window as any).canonicalCalendarAccessibility.requests.filter((r:any)=>r.method!=='GET'))).toEqual([]);
});
test('a managed Google event says where to delete it, and Join opens its meeting link',async({page})=>{
 await page.clock.setFixedTime(new Date('2027-06-10T12:00Z'));
 await openCanonicalCalendar(page,{eventTitle:'Team sync',begin:Date.parse('2027-06-10T13:00Z'),end:Date.parse('2027-06-10T14:00Z'),organizerSelf:true,managedGoogle:true,conferenceLink:'https://meet.google.com/abc-defg-hij'});
 await page.getByRole('button',{name:/^Team sync,/}).click();
 const detail=page.locator('[data-alpha-subview="calendar-detail"]');
 await expect(detail.getByText('Fixture Calendar · Delete in Google',{exact:true})).toBeVisible();
 await detail.getByLabel('Event actions',{exact:true}).click();
 await expect(detail.getByRole('button',{name:'Edit event',exact:true})).toBeVisible();await expect(detail.getByRole('button',{name:'Delete event',exact:true})).toHaveCount(0);
 await expect(detail.getByText('meet.google.com/abc-defg-hij',{exact:true})).toBeVisible();
 await page.evaluate(()=>{(window as any).openedMeetings=[];window.open=((url:string,target:string,features:string)=>{(window as any).openedMeetings.push([url,target,features]);return null;}) as typeof window.open;});
 await detail.getByRole('button',{name:'Join',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).openedMeetings)).toEqual([['https://meet.google.com/abc-defg-hij','_blank','noopener,noreferrer']]);
 expect(await page.evaluate(()=>(window as any).canonicalCalendarAccessibility.requests.every((r:any)=>r.method==='GET'))).toBe(true);
});
test('an event without a meeting link shows no Join row',async({page})=>{
 await page.clock.setFixedTime(new Date('2027-06-10T12:00Z'));
 await openCanonicalCalendar(page,{eventTitle:'Quiet hour',begin:Date.parse('2027-06-10T13:00Z'),end:Date.parse('2027-06-10T14:00Z'),organizerSelf:true});
 await page.getByRole('button',{name:/^Quiet hour,/}).click();
 const detail=page.locator('[data-alpha-subview="calendar-detail"]');
 await expect(detail.getByText('Fixture Calendar',{exact:true})).toBeVisible();await expect(detail.getByRole('button',{name:'Join',exact:true})).toHaveCount(0);
});
