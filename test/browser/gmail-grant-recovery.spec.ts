import {test,expect} from '@playwright/test';
import {preloadPageModules} from './helpers/page-modules';
for(const reason of ['disconnected','scope-revoked'] as const)test(`Gmail same-ID ${reason} clears read availability and recovers explicitly`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha:startup-permission-walkthrough:v1',JSON.stringify({version:1,status:'completed',step:4})));
 await page.goto('/');
 await preloadPageModules(page,['/src/runtime/connection-ui.tsx']);
 await page.waitForFunction(()=>{
  const {connectionController}=(window as any).__alphaModules['/src/runtime/connection-ui.tsx'];
  const state=connectionController.getSnapshot();
  return state.startupResolved&&!state.busy;
 });
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {inboxLocalStore:s}=await import('/src/runtime/inbox-local-store.ts');s.read=async()=>null;
  const w=window as any;w.gmailGrantFixture={connected:true,triage:true,reads:0,oauth:0};
  const client={gmailAccounts:async()=>[{connectionId:'same-grant',label:'Fixture mailbox',configured:true,connected:w.gmailGrantFixture.connected,grantedCapabilities:w.gmailGrantFixture.triage?['google.gmail.triage']:[]}],gmailSearch:async()=>{w.gmailGrantFixture.reads++;return {messages:[],syncedAt:'fixture-revision'};},initiateGmail:async()=>{w.gmailGrantFixture.oauth++;throw Error('No live OAuth in fixture');}};
  c.getCloudClient=()=>({client,sessionId:'fixture-cloud',credentialId:'fixture-only'} as any);
  const snapshot={...c.getSnapshot(),cloudAccount:{environment:'production',userId:'fixture-owner',sessionId:'fixture-cloud',credentialId:'fixture-only'}};c.getSnapshot=()=>snapshot as any;
 });
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:'Refresh inbox',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).gmailGrantFixture.reads)).toBe(1);
 await page.evaluate(reason=>{const f=(window as any).gmailGrantFixture;if(reason==='disconnected')f.connected=false;else f.triage=false;},reason);
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha:google-accounts-changed')));
 await expect(page.getByRole('button',{name:'Refresh inbox',exact:true})).toBeVisible();
 await expect(page.locator('span:text-is("Connect Gmail")')).toBeVisible();
 await expect(page.getByRole('button',{name:'Fixture mailbox',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Refresh inbox',exact:true})).toBeVisible();
 await expect(page.locator('span:text-is("Connect Gmail")')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).gmailGrantFixture)).toMatchObject({reads:1,oauth:0});
 await page.evaluate(()=>{const f=(window as any).gmailGrantFixture;f.connected=true;f.triage=true;});
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha:google-accounts-changed')));
 await expect(page.getByRole('button',{name:'Refresh inbox',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).gmailGrantFixture.reads)).toBe(2);
 await page.getByRole('button',{name:'Refresh inbox',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).gmailGrantFixture.reads)).toBe(3);
 expect(await page.evaluate(()=>(window as any).gmailGrantFixture.oauth)).toBe(0);
});

test('Reconnect Gmail opens Google accounts; each authorization hands off once and nothing is read until the owner checks again',async({page})=>{
 const AUTH='https://accounts.google.com/o/oauth2/v2/auth?client_id=fixture&state=synthetic';
 await page.addInitScript(()=>{
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  const f=(window as any).handoffFixture={opened:[] as string[],cancels:0,hold:null as Promise<void>|null};
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  (window as any).Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureRemove','secureCompareExchange','openExternal'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin!=='AlphaConnection')throw Error('Unexpected fixture native plugin');
   if(method==='secureRead')return {value:null};if(method==='secureCompareExchange')return {status:'saved'};if(method==='secureWrite'||method==='secureRemove')return {};
   if(method==='cancel'){f.cancels++;return {};}
   if(method==='openExternal'){f.opened.push(input.url);if(f.hold)await f.hold;return {};}
   throw Error('No network in fixture');
  }};
 });
 await page.goto('/');
 await page.evaluate(async AUTH=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {CloudProtocolError}=await import('/src/runtime/cloud-protocol.ts');
  const w=window as any,f=w.handoffFixture;Object.assign(f,{reads:0,lists:0,initiates:[] as unknown[],revokeNext:true});
  const client={gmailAccounts:async()=>{f.lists++;return [{connectionId:'grant-1',label:'Fixture mailbox',configured:true,connected:true,grantedCapabilities:['google.gmail.triage','google.gmail.send']}];},
   gmailSearch:async()=>{f.reads++;if(f.revokeNext){f.revokeNext=false;throw new CloudProtocolError('http',409);}return {messages:[],syncedAt:'fixture-revision',nextPageToken:null};},
   initiateGoogle:async(_signal:AbortSignal,calendar:string,gmail:string)=>{f.initiates.push([calendar,gmail]);return AUTH;},
   initiateGmail:async()=>{throw Error('Gmail authorization goes through Google accounts');},
   disconnectGmail:async()=>{throw Error('Not disconnected in this fixture');}};
  c.getCloudClient=()=>({client,sessionId:'fixture-cloud',credentialId:'fixture-only'} as any);
  const snapshot={...c.getSnapshot(),cloudAccount:{environment:'production',userId:'fixture-owner',organizationId:'fixture-org',sessionId:'fixture-cloud',credentialId:'fixture-only'}};c.getSnapshot=()=>snapshot as any;
 },AUTH);
 const f=()=>page.evaluate(()=>(window as any).handoffFixture);
 const panel=page.getByRole('dialog',{name:'Google accounts',exact:true});
 const next=panel.getByText('Waiting for Google…',{exact:true});
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 const reconnect=page.getByRole('button',{name:'Reconnect Gmail',exact:true});
 await expect(reconnect).toBeVisible();
 expect((await f()).reads).toBe(1);
 await reconnect.click();
 await expect(panel).toBeVisible();
 await expect(panel.getByRole('img',{name:/Gmail: Read and send access/})).toBeVisible();
 let state=await f();
 expect(state.initiates).toEqual([]);expect(state.opened).toEqual([]);expect(state.reads).toBe(1);
 for(const [label,role] of [['Add account','button'],['Edit events','switch']] as const){
  const before=await f();
  await panel.getByRole(role,{name:label,exact:true}).click();
  await expect.poll(async()=>(await f()).opened.length,label).toBe(before.opened.length+1);
  await expect(next).toBeVisible();
  const after=await f();
  expect(after.initiates.slice(before.initiates.length),label).toEqual([['write','send']]);
  expect(after.opened.slice(before.opened.length),label).toEqual([AUTH]);
  expect(after.reads,label+': no mailbox read until the owner checks again').toBe(before.reads);
 }
 const lists=(await f()).lists;
 await page.evaluate(async()=>window.dispatchEvent(new Event((await import('/src/runtime/google-accounts.ts')).GOOGLE_ACCOUNTS_CHANGED)));
 await expect.poll(async()=>(await f()).lists).toBeGreaterThan(lists);
 await expect.poll(async()=>(await f()).reads).toBe(2);
 await page.evaluate(()=>{const f=(window as any).handoffFixture;f.hold=new Promise<void>(resolve=>{f.release=resolve;});});
 await panel.getByRole('button',{name:'Add account',exact:true}).click();
 await expect.poll(async()=>(await f()).opened.length).toBe(3);
 await page.keyboard.press('Escape');
 await expect(panel).toHaveCount(0);
 await page.evaluate(()=>(window as any).handoffFixture.release());
 await page.waitForTimeout(300);
 await expect(next).toHaveCount(0);
 state=await f();
 expect(state.initiates.length).toBe(3);expect(state.reads).toBe(2);
});
