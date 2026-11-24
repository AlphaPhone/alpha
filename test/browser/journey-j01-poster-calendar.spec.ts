import {openBrowserCalendar} from './helpers/browser-calendar';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';

test.use({timezoneId:'America/New_York'});
test.setTimeout(300_000);

const poster='Open studio\nOctober 10, 2026\nTime: 6:30 PM - 8:00 PM\nVenue: Main hall';
const events=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/browser/calendar-store.ts')).calendarDocument.readRaw())||'{"events":[]}').events as any[]);
const ready=(page:Page)=>expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible({timeout:90_000});

async function scanPoster(page:Page){
 const dialog=page.getByRole('dialog',{name:'Review scanned text'}),text=dialog.getByRole('textbox',{name:'Scanned text'});
 await page.getByRole('button',{name:'Type',exact:true}).click();{const input=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();await input.fill('Scan this');await input.press('Enter');}
 await expect(text).toBeEnabled({timeout:120_000});
 await expect(text).toHaveValue(/Open studio/);await expect(text).toHaveValue(/October 10, 2026/);await expect(text).toHaveValue(/6:30 PM/);
 await text.fill(poster);
 await dialog.locator('summary').filter({hasText:'Create event draft'}).click();
 await expect(dialog.getByLabel('Event title',{exact:true})).toHaveValue('Open studio');
 await expect(dialog.getByLabel('Event date',{exact:true})).toHaveValue('2026-10-10');
 await expect(dialog.getByLabel('Event start time',{exact:true})).toHaveValue('18:30');
 await expect(dialog.getByLabel('Event duration in minutes',{exact:true})).toHaveValue('90');
 await expect(dialog.getByLabel('Event location',{exact:true})).toHaveValue('Main hall');
 return dialog;
}
async function openScanMode(page:Page){
 await page.getByRole('button',{name:'Camera',exact:true}).click();
 const video=page.locator('[data-alpha-camera="viewfinder"] video');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:60_000}).toBeGreaterThanOrEqual(2);
}

test('J01 poster scan becomes exactly one reviewed Calendar event; suggestions and drafts never save by themselves',async({page})=>{
 const dialogs:string[]=[];
 page.on('dialog',d=>{dialogs.push(d.type()+': '+d.message());void d.dismiss();});
 await page.clock.setFixedTime(new Date('2026-10-09T15:00:00Z'));
 await page.addInitScript(()=>{
  const mediaDevices=navigator.mediaDevices;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:mediaDevices});
  mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=700;const c=canvas.getContext('2d')!;const draw=()=>{c.fillStyle='white';c.fillRect(0,0,1000,700);c.fillStyle='black';c.font='58px Arial';c.fillText('Open studio',60,140);c.fillText('October 10, 2026',60,260);c.fillText('Time: 6:30 PM - 8:00 PM',60,380);c.fillText('Venue: Main hall',60,500);};draw();const stream=canvas.captureStream(10);const timer=setInterval(draw,100);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));return stream;};
 });
 await page.goto('/?mode=dev');await ready(page);await openBrowserCalendar(page);await returnToApps(page);
 const homeAgenda=page.getByRole('region',{name:'Home',exact:true}).locator('[data-alpha-home-calendar]');
 await expect(homeAgenda).toHaveCount(0);
 expect(await events(page)).toHaveLength(0);

 await openScanMode(page);
 let dialog=await scanPoster(page);
 expect(await events(page)).toHaveLength(0);
 await dialog.getByRole('button',{name:'Close scan',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 expect(await events(page)).toHaveLength(0);

 dialog=await scanPoster(page);
 await dialog.getByLabel('Event title',{exact:true}).fill('Reviewed studio visit');
 await dialog.getByRole('button',{name:'Review in Calendar',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Reviewed studio visit');
 await expect(page.getByRole('textbox',{name:'Location',exact:true})).toHaveValue('Main hall');
 await expect(page.getByLabel('Selected event date',{exact:true})).toHaveText('Saturday, October 10, 2026');
 await expect(page.getByRole('textbox',{name:'Notes',exact:true})).toHaveValue(poster);
 expect(await events(page)).toHaveLength(0);
 await page.getByRole('button',{name:'Back to calendar',exact:true}).last().click();
 await expect(page.getByRole('button',{name:'Save event',exact:true})).toHaveCount(0);
 expect(await events(page)).toHaveLength(0);
 await page.reload();await ready(page);
 expect(await events(page)).toHaveLength(0);
 await expect(page.getByRole('button',{name:'Calendar',exact:true})).toBeVisible();

 await openBrowserCalendar(page);
 await page.getByRole('button',{name:'New event',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Reviewed studio visit');
 await expect(page.getByRole('textbox',{name:'Location',exact:true})).toHaveValue('Main hall');
 await expect(page.getByLabel('Selected event date',{exact:true})).toHaveText('Saturday, October 10, 2026');
 await expect(page.getByRole('textbox',{name:'Notes',exact:true})).toHaveValue(poster);
 expect(await events(page)).toHaveLength(0);
 await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect.poll(async()=>(await events(page)).length).toBe(1);
 await expect(page.getByRole('heading',{name:'Reviewed studio visit',level:1})).toBeVisible();

 await page.reload();await ready(page);
 const saved=await events(page);
 expect(saved).toHaveLength(1);
 expect(saved[0]).toMatchObject({calendarId:'local',title:'Reviewed studio visit',location:'Main hall',body:poster,begin:Date.parse('2026-10-10T18:30:00-04:00'),end:Date.parse('2026-10-10T20:00:00-04:00')});

 await expect(page.getByRole('region',{name:'Home',exact:true})).not.toContainText('Reviewed studio visit');
 await openBrowserCalendar(page);
 await page.getByRole('button',{name:'Day 10',exact:true}).click();
 await page.getByRole('button',{name:/^Reviewed studio visit,/}).click();
 await expect(page.getByRole('heading',{name:'Reviewed studio visit',level:1})).toBeVisible();
 await expect(page.getByRole('button',{name:'Main hall',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to calendar',exact:true}).last().click();

 await page.getByRole('button',{name:'Day 10',exact:true}).click();
 await expect(page.getByRole('button',{name:/^Reviewed studio visit,/})).toHaveCount(1);
 expect(await events(page)).toHaveLength(1);
 expect(dialogs).toEqual([]);
});
