import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,test,type Page} from '@playwright/test';
import {localAgentStorage} from '../../scripts/local-agent-dev-storage';
import {fenceNetwork} from './flag-off-android';
import {startHostedServer,type HostedServer} from './hosted-harness';

let server:HostedServer;
test.beforeAll(async()=>{server=await startHostedServer({privatePreview:true});});
test.afterAll(async()=>{await server?.close();});

const snapshot=(page:Page)=>page.evaluate(async()=>{
 const {connectionController}=await import('/src/runtime/connection-ui.tsx');
 const {busy,kind,session,startupResolved}=connectionController.getSnapshot();
 return {busy,kind,ownerId:session?.ownerId??null,startupResolved};
});

for(const unavailable of ['/api/auth/me','/api/agents','owner-refused'] as const){
 test(`private preview recovers only a temporary host bootstrap failure at ${unavailable}`,async({page})=>{
  const profile=await mkdtemp(join(tmpdir(),'alpha-preview-recovery-'));
  try{
   await fenceNetwork(page);
   const calls:{path:string;method:string}[]=[];
   let available=false;
   await page.route('**/__alpha-local-agent',async route=>{
    const input=route.request().postDataJSON();
    if(input.storage)return route.fulfill({json:localAgentStorage(profile,input.storage)});
    calls.push({path:input.path,method:input.method});
    if(!available&&input.path===unavailable)
     return route.fulfill({status:503,body:'Local runtime unavailable. Check the private host log.'});
    let body:unknown;
    if(input.path==='/api/auth/me')body={identity:{kind:'owner',id:'fixture-owner'},access:{role:unavailable==='owner-refused'?'MEMBER':'OWNER',mode:'session'}};
    else if(input.path==='/api/agents')body={agents:[{id:'fixture-agent',name:'Browser fixture',status:'running'}]};
    else if(input.path==='/api/client-devices/register')body={installationId:input.headers['X-Eliza-Device-Id'],enrollmentId:'fixture-enrollment',capabilities:[]};
    else if(input.path==='/api/conversations')body={conversations:[]};
    else return route.fulfill({json:{status:404,body:'{}'}});
    return route.fulfill({json:{status:200,body:JSON.stringify(body)}});
   });
   await page.clock.install({time:new Date('2026-11-15T12:00:00Z')});
   await page.clock.pauseAt(new Date('2026-11-15T12:01:00Z'));
   await page.goto(server.origin,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>snapshot(page)).toEqual({busy:false,kind:'recovering',ownerId:null,startupResolved:true});
   const authReads=()=>calls.filter(call=>call.path==='/api/auth/me'&&call.method==='GET').length;
   expect(authReads()).toBe(1);
   available=true;
   await page.clock.fastForward(3050);
   if(unavailable==='owner-refused'){
    expect(await snapshot(page)).toMatchObject({kind:'recovering',ownerId:null});
    expect(authReads()).toBe(1);
   }else{
    await expect.poll(()=>snapshot(page)).toMatchObject({kind:'resident',ownerId:'fixture-owner'});
    expect(authReads()).toBe(2);
   }
   expect(calls.filter(call=>call.method==='POST'&&call.path.includes('/messages'))).toEqual([]);
   await expect(page.locator('.alpha-connection-scrim')).toHaveCount(0);
  }finally{
   await page.close();
   await rm(profile,{recursive:true,force:true});
  }
 });
}
