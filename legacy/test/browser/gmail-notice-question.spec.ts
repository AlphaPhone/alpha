import {seedCompletedAccessSetup} from './flag-off-android';
import {installDeliveryFixture,startResidentAgent} from './helpers/delivery-fixture';
import {test,expect} from '@playwright/test';
for(const mode of ['compose','interrupted','source-changed','owner-changed'] as const)test('Gmail Ask explicit source attachment '+mode,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await installDeliveryFixture(page,{gmail:true});
 await startResidentAgent(page);
 // Completed-installation UI progress keeps this fixture focused on the Gmail notice review.
 await page.evaluate(async held=>{
  const c=(await import('/src/runtime/connection-ui.tsx')).connectionController,f=(window as any).deliveryFixture,snapshot=c.getSnapshot.bind(c);f.reads=0;
  const client={gmailAccounts:async()=>[{connectionId:'grant',connected:true,label:'Owned mailbox',grantedCapabilities:['google.gmail.triage']}],gmailRead:async()=>{
   f.reads++;
   if(held&&f.reads===2)await new Promise<void>(resolve=>{f.releaseGmailRead=resolve;});
   return {message:{id:'mail',threadId:'thread',subject:'Public subject',snippet:f.changed?'Changed snippet':'Public snippet'},bodyText:'PRIVATE BODY NEVER SHARED',historyId:f.changed?'11':'10',attachments:[]};
  }};
  c.getCloudClient=()=>({client,sessionId:'cloud-session',credentialId:'credential'} as any);const snapshots=new WeakMap<object,any>();c.getSnapshot=()=>{const original=snapshot();if(!snapshots.has(original))snapshots.set(original,{...original,cloudAccount:{environment:'production',userId:'owner',sessionId:'cloud-session'}});return snapshots.get(original);};
  f.gmailTap={token:'ask-token',grantId:'grant',credentialId:'credential',userId:'owner',generation:'generation',question:true,messageId:'mail',threadId:'thread'};
  document.dispatchEvent(new Event('visibilitychange'));
 },mode!=='compose');
 const attachment=page.getByRole('button',{name:'Remove Alpha Phone notification.txt',exact:true});
 if(mode==='compose'){
  await expect(attachment).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Message Alpha',exact:true})).toHaveValue('Help me with this notification.');
  await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).deliveryFixture.consumed)).toBe(1);
  expect(await page.evaluate(()=>(window as any).deliveryFixture.reads)).toBe(2);
  await page.screenshot({path:testInfo.outputPath('notice-chat-attachment.png')});
 }else{
  await expect.poll(()=>page.evaluate(()=>Boolean((window as any).deliveryFixture.releaseGmailRead))).toBe(true);
  if(mode==='source-changed')await page.evaluate(()=>{(window as any).deliveryFixture.changed=true;});
  if(mode==='owner-changed')await page.evaluate(async()=>{await(await import('/src/runtime/connection-ui.tsx')).connectionController.disconnect();});
  if(mode==='interrupted')await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
  await page.evaluate(()=>(window as any).deliveryFixture.releaseGmailRead());
  if(mode==='source-changed')await expect(page.getByText('This notification changed.',{exact:true})).toBeVisible();
  await expect(attachment).toHaveCount(0);
  expect(await page.evaluate(()=>{const f=(window as any).deliveryFixture;return {consumed:f.consumed||0,released:f.released||0,pending:f.gmailTap.token};})).toEqual({consumed:0,released:0,pending:'ask-token'});
 }
 expect(await page.evaluate(()=>(window as any).residentAgent.state.unexpected)).toEqual([]);expect(errors).toEqual([]);
});

test.beforeEach(async({page})=>seedCompletedAccessSetup(page));
