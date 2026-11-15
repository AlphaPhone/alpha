import {seedCompletedAccessSetup} from './flag-off-android';
import {test,expect,type Page} from '@playwright/test';
import {flagOffAndroid,fenceNetwork,harness,button,completeAccessSetup,openYourAgent} from './flag-off-android';
import {residentStub} from './resident-stub';
// Actual flag-off UI/CSS with closed native boundary fixtures. These tests do not archive real files.
const token='d32f7f34-962b-47b7-8f0d-f2fe7f12610a';
type Mode='success'|'held-review'|'review-unavailable'|'changed'|'partial'|'transient'|'lost'|'attach-pending'|'startup-read';
async function boot(page:Page,mode:Mode='success',signedOut=false){
 await fenceNetwork(page);await flagOffAndroid(page);await residentStub(page,{nativeSignIn:true,emptyKeystore:signedOut,accounts:[{token:'synthetic-cloud-key',userId:'9f1dc45a-4011-4e44-947a-30d999d24fa5',email:'owner@example.invalid',balance:5}]});
 await page.addInitScript(({mode,token})=>{
  const w=window as any,c=w.Capacitor,previous=c.nativePromise;let archived=false;
  const calls=w.recoveryCalls={starts:0,reviews:0,archives:[] as unknown[]};
  const control=w.recoveryControl={pending:false,hidden:false,dead:false,release:null as null|(()=>void),initialProviderCalls:[] as string[]};
  const startupFailure=(message:string)=>{
    control.initialProviderCalls=w.flagOff.calls.filter((call:string)=>call==='Agent.stop'||call==='Agent.configureCloudProvider');
    return Object.assign(Error(message),{code:'LOCAL_AGENT_ATTACH_PENDING'});
  };
  Object.defineProperty(document,'hidden',{get:()=>control.hidden});
  c.PluginHeaders.find((p:any)=>p.name==='Agent').methods.push(...['reviewRecovery','archiveRecovery','residentAttachment'].map(name=>({name,rtype:'promise'})));
  c.nativePromise=async(p:string,m:string,input:any)=>{
   if(p==='Agent'&&m==='getStatus'&&control.dead)return {packaged:true,state:'restarting',reason:'agent exited: 137'};
   if(p==='Agent'&&m==='residentAttachment'&&(mode==='lost'||mode==='transient'||mode==='attach-pending'||mode==='startup-read')&&calls.starts>0)
     return {attachable:false,bindingRetained:true,bindingGuard:'a'.repeat(64)};
   if(p==='Agent'&&m==='request'&&mode==='startup-read'&&calls.starts===1&&input.path==='/api/auth/me')
     throw startupFailure('Resident restarted before the first owner read');
   if(p==='Agent'&&m==='start'){
    calls.starts++;
    if(mode==='attach-pending'||mode==='startup-read'){
      if(mode==='attach-pending'&&calls.starts===1)throw startupFailure('Transient native status read failure');
      if(calls.starts===2)await new Promise<void>(resolve=>control.release=resolve);
      if(mode==='startup-read'){
        await previous(p,m,input);
        return {state:'ready',attached:true};
      }
    }else if(mode==='lost'){
      if(control.dead){control.dead=false;throw Object.assign(Error('Native restart pending'),{code:'start-failed'});}
    }else if(!archived&&(mode!=='transient'||calls.starts<=5)){
      throw Object.assign(Error('Native startup refused'),{code:mode==='transient'?'start-failed':'ipc-recovery-retention-limit'});
    }
   }
   if(p==='Agent'&&m==='reviewRecovery'){calls.reviews++;if(mode==='held-review'){control.pending=true;await new Promise<void>(resolve=>control.release=resolve);control.pending=false;}return mode==='review-unavailable'?{status:'unavailable',retainedCount:8,reason:'inventory-unavailable'}:{status:'reviewable',retainedCount:8,reviewToken:calls.reviews===1?token:token.replace(/.{12}$/,String(calls.reviews).padStart(12,'0'))};}
   if(p==='Agent'&&m==='archiveRecovery'){
    calls.archives.push(structuredClone(input));
    if(mode==='changed')return {status:'unavailable',archivedCount:0,retainedCount:8,reason:'records-changed'};
    if(mode==='partial')return {status:'partial',archivedCount:3,retainedCount:5,reason:'interrupted-archive'};
    archived=true;return {status:'archived',archivedCount:8,retainedCount:0};
   }
   return previous(p,m,input);
  };
 },{mode,token});
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).recoveryCalls.starts)).toBeGreaterThanOrEqual(1);
 if(signedOut){const gate=page.locator('[role="main"].alpha-cloud-sign-in');await expect(gate).toBeVisible();return gate;}
 await expect(button(page,'Settings')).toBeVisible();await completeAccessSetup(page);
 return openYourAgent(page);
}
const calls=(page:Page)=>page.evaluate(()=>(window as any).recoveryCalls as {starts:number;reviews:number;archives:unknown[]});
test('recovery waits for explicit restart and a backgrounded review cannot archive or start',async({page},testInfo)=>{
 const panel=await boot(page,'held-review');await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 await expect(panel.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 expect(await calls(page)).toEqual({starts:1,reviews:0,archives:[]});
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).recoveryControl.pending)).toBe(true);
 await page.evaluate(()=>{const c=(window as any).recoveryControl;c.hidden=true;document.dispatchEvent(new Event('visibilitychange'));c.release();});
 await expect.poll(()=>page.evaluate(()=>(window as any).recoveryControl.pending)).toBe(false);
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
 // An explicit restart cannot continue or obtain another review in the background.
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Restart Alpha'));
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Restart Alpha')!.click());
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
 await page.evaluate(()=>{(window as any).recoveryControl.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 await page.screenshot({path:testInfo.outputPath('recovery-restart.png'),fullPage:true});
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
});
test('explicit restart requires complete archival before one ordinary start and retains the Cloud credential',async({page})=>{
 const panel=await boot(page);const key=await harness(page,f=>f.slots['cloud:production']);
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:1,archives:[{reviewToken:token}]});await expect(panel.getByRole('button',{name:'Load conversations',exact:true})).toBeVisible();
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(key);expect(await harness(page,f=>f.streams)).toBe(0);await expect(page.getByRole('region',{name:'Settings',exact:true})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));await expect(button(page,'Notes')).toBeVisible();
});
test('unavailable native inventory keeps restart blocked without archival',async({page})=>{
 const panel=await boot(page,'review-unavailable');await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
 await expect(panel.getByRole('button',{name:'Load conversations',exact:true})).toHaveCount(0);
});
for(const mode of ['changed','partial'] as const)test(`${mode} archival cannot start the agent and retry gets a fresh native review`,async({page})=>{
 const panel=await boot(page,mode);await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[{reviewToken:token}]});
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:1,reviews:2,archives:[{reviewToken:token},{reviewToken:token.replace(/.{12}$/,String(2).padStart(12,'0'))}]});
 await expect(panel.getByRole('button',{name:'Load conversations',exact:true})).toHaveCount(0);
});
test('automatic recovery continues past the old retry limit without a Status page or manual retry',async({page})=>{
 await page.clock.install();
 const activity=await boot(page,'transient');
 await expect(activity.getByRole('button',{name:'Restart Alpha',exact:true})).toHaveCount(0);
 await expect(activity.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await expect(activity.getByText('Loads when your agent is ready',{exact:true})).toBeVisible();
 // These are delays between completed attempts, including a second use of the capped delay.
 for (const [index,delay] of [3000,10000,30000,60000,60000].entries()){
  await page.clock.fastForward(delay+50);
  await expect.poll(()=>calls(page)).toEqual({starts:index+2,reviews:0,archives:[]});
 }
 await expect(activity.getByRole('button',{name:'Load conversations',exact:true})).toBeVisible();
 await activity.getByRole('button',{name:'Back to About',exact:true}).click();
 await expect(activity.getByRole('heading',{name:'About',exact:true})).toBeVisible();
 await expect(activity.getByRole('button',{name:'Status',exact:true})).toHaveCount(0);
 expect(await harness(page,f=>f.streams)).toBe(0);
});

for(const [mode,name] of [
 ['attach-pending','a transient native attach check'],
 ['startup-read','a native owner read interrupted by restart'],
] as const)test(`${name} retries without changing the saved binding`,async({page})=>{
 await page.clock.install();
 const activity=await boot(page,mode);
 const load=activity.getByRole('button',{name:'Load conversations',exact:true});
 await expect(load).toHaveCount(0);
 await expect(activity.getByText('Loads when your agent is ready',{exact:true})).toBeVisible();
 const credential=await harness(page,f=>f.slots['cloud:production']);
 const initialProviderCalls=await page.evaluate(()=>(window as any).recoveryControl.initialProviderCalls as string[]);

 await page.clock.fastForward(3050);
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:0,archives:[]});
 await page.evaluate(()=>(window as any).recoveryControl.release());
 await expect(load).toBeVisible();
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(credential);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.stop'||call==='Agent.configureCloudProvider'))).toEqual(initialProviderCalls);
 expect(await harness(page,f=>f.streams)).toBe(0);
});

test('returning to Alpha after a resident process exit reconnects without a user request',async({page})=>{
 await page.clock.install();
 const activity=await boot(page,'lost');
 const load=activity.getByRole('button',{name:'Load conversations',exact:true});
 await expect(load).toBeVisible();
 const credential=await harness(page,f=>f.slots['cloud:production']);
 const stops=await harness(page,f=>f.calls.filter(call=>call==='Agent.stop').length);
 const configs=await harness(page,f=>f.calls.filter(call=>call==='Agent.configureCloudProvider').length);
 await page.clock.fastForward(10_001);
 await page.evaluate(()=>{
   const w=window as any;
   w.recoveryControl.dead=true;
   window.dispatchEvent(new Event('pageshow'));
 });
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:0,archives:[]});
 await expect(load).toHaveCount(0);
 await expect(page.getByText(/Your agent stopped|Retry in Settings/)).toHaveCount(0);
 await page.clock.fastForward(3050);
 await expect(load).toBeVisible();
 expect(await calls(page)).toEqual({starts:3,reviews:0,archives:[]});
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(credential);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.stop').length)).toBe(stops);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.configureCloudProvider').length)).toBe(configs);
 expect(await harness(page,f=>f.streams)).toBe(0);
});

test('a signed-out startup refusal keeps guarded restart reachable on the sign-in page',async({page})=>{
 const gate=await boot(page,'success',true);
 expect(await calls(page)).toEqual({starts:1,reviews:0,archives:[]});
 await gate.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:1,archives:[{reviewToken:token}]});
 await expect(gate.getByRole('button',{name:'Send code',exact:true})).toBeEnabled();
 expect(await harness(page,f=>f.slots['cloud:production']??null)).toBeNull();
});

// UI progress only: this feature fixture does not manufacture OS/provider grants.
test.beforeEach(async({page})=>seedCompletedAccessSetup(page));
