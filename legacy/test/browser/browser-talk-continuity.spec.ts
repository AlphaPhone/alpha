import {test,expect} from '@playwright/test';
import {setup,utterance,voice} from './owned-voice-navigation-fixture';

for (const slow of [false,true]) test('Browser Talk survives '+(slow?'a delayed failed load':'a successful load'),async({page})=>{
 await page.route('**/src/runtime/connection-ui.tsx*',async route=>{
  const response=await route.fetch(),body=await response.text();
  const hook=/setDeviceExecutor\(executor\)\s*\{/;
  if(!hook.test(body))throw Error('Could not observe the registered device action executor');
  await route.fulfill({response,body:body.replace(hook,'$& window.replayBrowserExecutor = executor;')});
 });
 await setup(page,'sheet',true);
 let failLoad=()=>{};
 const failed=new Promise<void>(resolve=>failLoad=resolve);
 await page.route('https://preview.example/slow',async route=>{
  if(slow){await failed;await route.abort('timedout');return;}
  await route.fulfill({contentType:'text/html',body:'<h1>Browser Talk replay</h1>'});
 });
 await page.evaluate(async()=>{
  const f=(window as any).ownedVoiceNavigation,{alphaClient}=await import('/src/runtime/alpha-client.ts');
  f.prompt='Visit preview.example/slow';f.answer='Opening the preview page.';
  const transport=(alphaClient as any).transport,send=transport.send;
  transport.send=async(input:any)=>{
   const reply=await send(input);
   if(f.inputs.length===1){
    const executor=(window as any).replayBrowserExecutor;
    if(typeof executor!=='function')throw Error('The browser device action executor was not registered');
    const result=await executor({type:'browser_navigate',url:'https://preview.example/slow'},'replay-visit',alphaClient.getState().context,input.signal,'0'.repeat(64));
    f.operationStatus=result.status;result.presentBrowser();
   }
   return reply;
  };
 });
 await utterance(page,'browser');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.operationStatus)).toBe('succeeded');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 if(!slow)await expect(page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name:'Browser Talk replay'})).toBeVisible();
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 if(slow){
  const timedOut=page.waitForEvent('requestfailed',request=>request.url()==='https://preview.example/slow');
  failLoad();await timedOut;
 }
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.prompt='Can you still hear me?';f.answer='Yes, I can.';});
 await utterance(page,'browser');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(2);
});
