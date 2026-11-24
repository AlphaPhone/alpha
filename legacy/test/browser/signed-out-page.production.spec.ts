import {seedCompletedAccessSetup} from './flag-off-android';
import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, harness, button, fenceNetwork, expectNoDevelopmentSurface, completeAccessSetup } from './flag-off-android';
import { residentStub, stub, setStub, enterNativeEmailCode } from './resident-stub';
const account={token:'signed-out-page-qa-key',userId:'9f1dc45a-4011-4e44-947a-30d999d24fa5',email:'signed-out-qa@example.invalid',balance:5};
const waiting='Checking code';
test.describe('mandatory production sign-in page',()=>{
 async function start(page:Page, holdAgentStart=false){
  const foreign=await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page,{nativeSignIn:true,emptyKeystore:true,accounts:[account]});
  if(holdAgentStart)await page.addInitScript(()=>{
   const w=window as any,bridge=w.Capacitor,original=bridge.nativePromise;
   bridge.nativePromise=(plugin:string,method:string,input:any)=>{
    if(plugin==='Agent'&&method==='start'&&w.holdPostSignInAgentStart)
     return new Promise(resolve=>{w.releasePostSignInAgentStart=()=>{w.holdPostSignInAgentStart=false;resolve(original(plugin,method,input));};});
    return original(plugin,method,input);
   };
  });
  await page.goto('/?mode=dev');await setStub(page,{nextToken:account.token});const gate=page.locator('[role="main"].alpha-cloud-sign-in');await expect(gate).toBeVisible();await expect(gate.getByRole('button',{name:'Send code',exact:true})).toBeEnabled();await expect(gate).not.toContainText('Reconnect agent');await expect(gate).not.toContainText('Phone action history');await expect(page.getByRole('dialog',{name:'Your agent',exact:true})).toHaveCount(0);return{gate,foreign};}
 test('pending native verification and Cancel stay on the mandatory gate',async({page})=>{const{gate,foreign}=await start(page);await setStub(page,{login:'hold'});await enterNativeEmailCode(page);await expect(page.getByText(waiting,{exact:true})).toBeVisible();await expect.poll(()=>stub(page,s=>s.order.includes('native sign-in verifyEmail'))).toBe(true);await page.getByRole('button',{name:'Back',exact:true}).click();await expect(gate).toBeVisible();await expect(gate.getByRole('button',{name:'Send code',exact:true})).toBeEnabled();expect(await harness(page,f=>f.slots['cloud:production']??null)).toBeNull();expect(await stub(page,s=>s.order.filter((x:string)=>x.startsWith('store')||x.startsWith('revoke')))).toEqual([]);await expectNoDevelopmentSurface(page);expect(foreign).toEqual([]);});
 test('expired request shows the error and permits an explicit retry without opening the app',async({page})=>{
  await page.clock.install();
  const {gate}=await start(page);
  await setStub(page,{login:'expired'});
  await enterNativeEmailCode(page);
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(gate.getByText('owner@example.invalid',{exact:true})).toBeVisible();
  await expect(gate.getByRole('button',{name:/^Resend/})).toBeDisabled();
  await page.clock.fastForward(60_001);
  await expect(gate.getByRole('button',{name:'Resend',exact:true})).toBeEnabled();
  await gate.getByRole('button',{name:'Back',exact:true}).click();
  await expect(gate.getByRole('textbox',{name:'Email',exact:true})).toHaveValue('owner@example.invalid');
  await expect(gate.getByRole('button',{name:'Send code',exact:true})).toBeEnabled();
  expect(await harness(page,f=>f.slots['cloud:production']??null)).toBeNull();
 });
 test('email sign-in holds Home until the agent is ready and Alpha replies to one typed message',async({page})=>{
  const {gate,foreign}=await start(page,true);
  await page.evaluate(()=>{(window as any).holdPostSignInAgentStart=true;});
  await enterNativeEmailCode(page);
  await expect(gate).toHaveCount(0,{timeout:30000});
  await expect.poll(()=>page.evaluate(()=>typeof (window as any).releasePostSignInAgentStart)).toBe('function');
  await expect(page.getByRole('status',{name:'Loading Alpha',exact:true})).toBeVisible();
  await expect(page.locator('[data-alpha-startup-shell]')).toHaveAttribute('inert','');
  await expect(button(page,'Notes')).toHaveCount(0);
  expect(await harness(page,f=>f.streams)).toBe(0);
  await page.evaluate(()=>(window as any).releasePostSignInAgentStart());
  await completeAccessSetup(page);
  await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button(page,'Notes')).toBeVisible();
  expect(await harness(page,f=>f.streams)).toBe(0);

  await button(page,'Open conversation').click();
  const chat=page.locator('[data-alpha-layer="conversation"][aria-hidden="false"]');
  await chat.getByRole('textbox',{name:'Message Alpha',exact:true}).fill('First text after sign-in');
  await chat.getByRole('button',{name:'Send',exact:true}).click();
  await expect(chat.getByText('Resident reply 1',{exact:true})).toBeVisible();
  expect(await harness(page,f=>f.posts)).toEqual(['First text after sign-in']);
  expect(foreign).toEqual([]);
 });
});

// UI progress only: this feature fixture does not manufacture OS/provider grants.
test.beforeEach(async({page})=>seedCompletedAccessSetup(page));
