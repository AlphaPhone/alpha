import {openBrowserCalendar, chooseCalendarEventAction} from './helpers/browser-calendar';
// Touch feedback and the predictive Back preview (app review #855, NOTIF-12), seen in the rendered
// app. A recording device stands in for AlphaDevice.haptic, and the 'alpha-back-preview' events are
// the ones MainActivity sends while Android's Back gesture is held. No Android vibration, setting or
// gesture is involved: test/haptics.test.mjs and test/predictive-back.test.mjs cover the native side.
import {test,expect,type Page} from '@playwright/test';
test.use({timezoneId:'UTC'});

const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const titles=(page:Page)=>page.evaluate(async()=>(JSON.parse((await (await import('/src/browser/calendar-store.ts')).calendarDocument.readRaw())||'{"events":[]}').events as {title:string}[]).map(row=>row.title).sort());
const played=(page:Page)=>page.evaluate(()=>(window as any).__haptics as string[]);
const preview=(page:Page,phase:string,progress=0,edge='left')=>page.evaluate(detail=>window.dispatchEvent(new CustomEvent('alpha-back-preview',{detail})),{phase,progress,edge});

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('alpha.connection.selection.v1'))localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));});
 await page.clock.install({time:new Date('2026-10-06T12:00:00Z')});await page.goto('/?mode=dev&tools=1');await openBrowserCalendar(page);
 // The same module the app installed; this device records what Android would play.
 await page.evaluate(async()=>{const w=window as any;w.__haptics=[];(await import('/src/runtime/haptics.ts')).installHaptics({haptic:async({kind}:{kind:string})=>{w.__haptics.push(kind);}});});
 await button(page,'New event').click();await page.getByRole('textbox',{name:'Title',exact:true}).fill('Harbour pickup');
});

test('switches, a confirmed delete and nothing else give touch feedback',async({page})=>{
 const video=page.getByRole('switch',{name:'Video link',exact:true});
 await video.click();await expect(video).toHaveAttribute('aria-checked','true');
 await page.clock.runFor(400);await video.click();await expect(video).toHaveAttribute('aria-checked','false');
 expect(await played(page)).toEqual(['toggle-on','toggle-off']);
 await button(page,'Save event').click();await expect(page.getByRole('heading',{name:'Harbour pickup',exact:true})).toBeVisible();
 // Opening the review from the event menu is not a confirmation, and Cancel is not destructive.
 await chooseCalendarEventAction(page,'Delete event');
 const review=page.getByRole('dialog',{name:'Delete calendar event?'});
 await review.getByRole('button',{name:'Cancel',exact:true}).click();await expect(review).toHaveCount(0);
 expect(await played(page)).toEqual(['toggle-on','toggle-off']);
 await chooseCalendarEventAction(page,'Delete event');
 await review.getByRole('button',{name:'Delete event',exact:true}).click();
 await expect(review).toHaveCount(0);
 expect(await played(page)).toEqual(['toggle-on','toggle-off','confirm']);
});

test('held Back previews the review it would close; cancelling restores it and letting go closes it',async({page},info)=>{
 await button(page,'Save event').click();await expect(page.getByRole('heading',{name:'Harbour pickup',exact:true})).toBeVisible();
 await chooseCalendarEventAction(page,'Delete event');
 const review=page.getByRole('dialog',{name:'Delete calendar event?'});await expect(review).toBeVisible();
 const style=()=>review.evaluate(el=>({translate:(el as HTMLElement).style.translate,scale:(el as HTMLElement).style.scale,marked:(el as HTMLElement).dataset.alphaBackPreview!==undefined}));
 await preview(page,'start');await preview(page,'progress',0.5,'left');
 expect(await style()).toEqual({translate:'8px',scale:'0.96',marked:true});
 await page.screenshot({path:info.outputPath('back-preview.png'),animations:'disabled'});
 await preview(page,'progress',1,'right');
 expect(await style()).toEqual({translate:'-16px',scale:'0.92',marked:true});
 // Cancelling the gesture puts the review back exactly; it stays open.
 await preview(page,'cancel');
 expect(await style()).toEqual({translate:'',scale:'',marked:false});
 await expect(review).toBeVisible();
 // Letting go is the ordinary Back: the review closes and nothing is deleted.
 await preview(page,'start');await preview(page,'progress',0.7,'left');
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
 await expect(review).toHaveCount(0);
 expect(await titles(page)).toEqual(['Harbour pickup']);
 // With no sheet or dialog open, a held Back previews nothing and changes no layout.
 await preview(page,'start');await preview(page,'progress',0.5);
 expect(await page.locator('[data-alpha-back-preview]').count()).toBe(0);
});

test('reduced motion previews nothing',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await button(page,'Save event').click();await expect(page.getByRole('heading',{name:'Harbour pickup',exact:true})).toBeVisible();
 await chooseCalendarEventAction(page,'Delete event');
 const review=page.getByRole('dialog',{name:'Delete calendar event?'});await expect(review).toBeVisible();
 await preview(page,'start');await preview(page,'progress',0.8);
 expect(await review.evaluate(el=>(el as HTMLElement).style.scale)).toBe('');
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));await expect(review).toHaveCount(0);
});
