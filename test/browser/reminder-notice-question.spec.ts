import {test,expect} from '@playwright/test';
import {installDeliveryFixture,startResidentAgent} from './helpers/delivery-fixture';
for(const mode of ['compose','interrupted','source-changed','owner-changed'] as const)test('reminder Ask attachment '+mode,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await installDeliveryFixture(page);
 await startResidentAgent(page);
 await page.evaluate(held=>{const f=(window as any).deliveryFixture,target={sourceId:'local-source',sourceRevision:'a'.repeat(64),reminderId:'reminder',occurrenceId:'one',revision:'b'.repeat(64),timingVersion:2};f.reminder={id:'reminder',title:'Reviewable reminder',body:'Public meeting plan',at:Date.now(),dueAt:Date.now(),alertMinutes:0,status:'posted',occurrenceId:'one',target};f.holdReminderQuestion=held;f.reminderTap={token:'ask-token',target,retained:true,question:true};document.dispatchEvent(new Event('visibilitychange'));},mode!=='compose');
 const attachment=page.getByRole('button',{name:'Remove Alpha Phone notification.txt',exact:true});
 if(mode==='compose'){
  await expect(attachment).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('Help me with this notification.');
  await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).deliveryFixture.consumed)).toBe(1);
  expect(await page.evaluate(()=>(window as any).deliveryFixture.wakeTurnedOff)).toBe(1);
  await expect(page.getByText('Wake listening could not be confirmed off. Turn it off in Android settings.',{exact:true})).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('notice-chat-attachment.png'),animations:'disabled'});
  await attachment.click();await expect(attachment).toHaveCount(0);
 }else{
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).deliveryFixture.releaseReminderRead))).toBe(true);
  if(mode==='source-changed')await page.evaluate(()=>{(window as any).deliveryFixture.reminderTap.retained=false;});
  if(mode==='owner-changed')await page.evaluate(async()=>{const c=(await import('/src/runtime/connection-ui.tsx')).connectionController;await c.disconnect();});
  if(mode==='interrupted')await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
  await page.evaluate(()=>(window as any).deliveryFixture.releaseReminderRead());
  if(mode==='source-changed')await expect(page.getByText('This notification changed.',{exact:true})).toBeVisible();
  await expect(attachment).toHaveCount(0);
  expect(await page.evaluate(()=>{const f=(window as any).deliveryFixture;return {consumed:f.consumed||0,released:f.released||0,pending:f.reminderTap.token};})).toEqual({consumed:0,released:0,pending:'ask-token'});
 }
 expect(await page.evaluate(()=>(window as any).residentAgent.state.unexpected)).toEqual([]);expect(errors).toEqual([]);
});
