import {seedCompletedAccessSetup} from './flag-off-android';
import {test,expect,type Page} from '@playwright/test';
import {flagOffAndroid,fenceNetwork,harness,button,completeAccessSetup} from './flag-off-android';
import {residentStub} from './resident-stub';
const token='d32f7f34-962b-47b7-8f0d-f2fe7f12610a';
type Mode='success'|'held-review'|'review-unavailable'|'changed'|'partial'|'transient'|'lost'|'attach-pending'|'startup-read'|'changed-provider';
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
   if(p==='Agent'&&m==='providerStatus'&&mode==='changed-provider'&&archived)
     return {configured:true,provider:'cerebras',mode:'own',revision:'changed-provider'};
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
 await button(page,'Open conversation').click();
 const conversation=page.locator('[data-alpha-layer="conversation"][aria-hidden="false"]');
 await expect(conversation.getByRole('textbox',{name:'Message Alpha',exact:true})).toBeVisible();
 return conversation;
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
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
 await page.evaluate(()=>{(window as any).recoveryControl.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 await page.screenshot({path:testInfo.outputPath('recovery-restart.png'),fullPage:true});
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
});
test('explicit restart requires complete archival before one ordinary start and retains the Cloud credential',async({page})=>{
 const panel=await boot(page);const key=await harness(page,f=>f.slots['cloud:production']);
 const draft=panel.getByRole('textbox',{name:'Message Alpha',exact:true});
 await draft.fill('Keep this draft during restart');
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:1,archives:[{reviewToken:token}]});
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toHaveCount(0);
 await expect(draft).toHaveValue('Keep this draft during restart');
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(key);
 expect(await harness(page,f=>f.streams)).toBe(0);
});
test('a provider change during restart does not carry the unsent draft into that session',async({page})=>{
 const panel=await boot(page,'changed-provider');
 const draft=panel.getByRole('textbox',{name:'Message Alpha',exact:true});
 await draft.fill('Keep these words in the previous provider');
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:1,archives:[{reviewToken:token}]});
 await expect(draft).toHaveValue('');
 expect(await harness(page,f=>f.streams)).toBe(0);
});
test('unavailable native inventory keeps restart blocked without archival',async({page})=>{
 const panel=await boot(page,'review-unavailable');await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[]});
 await expect(panel.getByRole('status',{name:'Assistant draft status',exact:true})).toHaveText('Restart blocked');
});
for(const mode of ['changed','partial'] as const)test(`${mode} archival cannot start the agent and retry gets a fresh native review`,async({page})=>{
 const panel=await boot(page,mode);await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toBeEnabled();
 expect(await calls(page)).toEqual({starts:1,reviews:1,archives:[{reviewToken:token}]});
 await panel.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:1,reviews:2,archives:[{reviewToken:token},{reviewToken:token.replace(/.{12}$/,String(2).padStart(12,'0'))}]});
 await expect(panel.getByRole('status',{name:'Assistant draft status',exact:true})).toHaveText(mode==='partial'?'Restart incomplete':'Restart blocked');
});
async function assertReattached(page:Page, panel:Awaited<ReturnType<typeof boot>>, priorStreams:number) {
 expect(await harness(page,f=>f.streams)).toBe(priorStreams);
 const draft=panel.getByRole('textbox',{name:'Message Alpha',exact:true});
 await draft.fill('Connection check '+(priorStreams+1));
 await panel.getByRole('button',{name:'Send',exact:true}).click();
 await expect(panel.getByText('Resident reply '+(priorStreams+1),{exact:true})).toBeVisible();
 expect(await harness(page,f=>f.streams)).toBe(priorStreams+1);
}
test('automatic recovery continues past the old retry limit without a Status page or manual retry',async({page})=>{
 await page.clock.install();
 const panel=await boot(page,'transient');
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 for(const [index,delay] of [3000,10000,30000,60000,60000].entries()){
  await page.clock.fastForward(delay+50);
  await expect.poll(()=>calls(page)).toEqual({starts:index+2,reviews:0,archives:[]});
 }
 await assertReattached(page,panel,0);
 expect(await calls(page)).toEqual({starts:6,reviews:0,archives:[]});
});

for(const [mode,name] of [
 ['attach-pending','a transient native attach check'],
 ['startup-read','a native owner read interrupted by restart'],
] as const)test(`${name} retries without changing the saved binding`,async({page})=>{
 await page.clock.install();
 const panel=await boot(page,mode);
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toHaveCount(0);
 const credential=await harness(page,f=>f.slots['cloud:production']);
 const initialProviderCalls=await page.evaluate(()=>(window as any).recoveryControl.initialProviderCalls as string[]);

 await page.clock.fastForward(3050);
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:0,archives:[]});
 await page.evaluate(()=>(window as any).recoveryControl.release());
 await assertReattached(page,panel,0);
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(credential);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.stop'||call==='Agent.configureCloudProvider'))).toEqual(initialProviderCalls);
 expect(await calls(page)).toEqual({starts:2,reviews:0,archives:[]});
});

test('returning to Alpha after a resident process exit reconnects without a user request',async({page})=>{
 await page.clock.install();
 const panel=await boot(page,'lost');
 await assertReattached(page,panel,0);
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
 await expect(panel.getByRole('button',{name:'Restart Alpha',exact:true})).toHaveCount(0);
 await expect(page.getByText(/Your agent stopped|Retry in Settings/)).toHaveCount(0);
 await page.clock.fastForward(3050);
 await expect.poll(()=>calls(page)).toEqual({starts:3,reviews:0,archives:[]});
 await assertReattached(page,panel,1);
 expect(await calls(page)).toEqual({starts:3,reviews:0,archives:[]});
 expect(await harness(page,f=>f.slots['cloud:production'])).toBe(credential);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.stop').length)).toBe(stops);
 expect(await harness(page,f=>f.calls.filter(call=>call==='Agent.configureCloudProvider').length)).toBe(configs);
});

test('a signed-out startup refusal keeps guarded restart reachable on the sign-in page',async({page})=>{
 const gate=await boot(page,'success',true);
 expect(await calls(page)).toEqual({starts:1,reviews:0,archives:[]});
 await gate.getByRole('button',{name:'Restart Alpha',exact:true}).click();
 await expect.poll(()=>calls(page)).toEqual({starts:2,reviews:1,archives:[{reviewToken:token}]});
 await expect(gate.getByRole('button',{name:'Send code',exact:true})).toBeEnabled();
 expect(await harness(page,f=>f.slots['cloud:production']??null)).toBeNull();
});

test.beforeEach(async({page})=>seedCompletedAccessSetup(page));
