import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {test,expect,type Page} from '@playwright/test';
import {returnToApps} from './app-navigation';

// v610: with Browser in front, "go back" and "reload the page" moved the page, then the reply
// ended as "The agent stopped this reply." The agent's own Browser command (a view:interact frame
// sent while its reply was in flight) changed the page the reply was answering on, and the new
// document's context revision read as the owner leaving that page, which cancels the request.
// Real shell, connection controller, renderer view-interaction client, Alpha's Browser executor
// and the web Browser surface in native presentation. The agent's HTTP answers and the websites
// are synthetic; the reply is held open until the page has moved.
// Evidence class: browser test of the web renderer; not a device, WebView, agent or model run.
async function setup(page:Page){
 await page.addInitScript(()=>{
  if(window!==window.top)return;
  const w=window as any,store=new Map(),agentId='12345678-1234-4234-8234-123456789abc';
  const f=w.historyReplyFixture={posts:[] as string[],cancels:0,claims:0,results:[] as any[],release:null as null|((text:string)=>void)};
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  w.Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureCompareExchange','secureRemove'])},{name:'AlphaActionJournal',methods:methods(['reserve','markApplying','finish','get','list'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin==='AlphaActionJournal')return method==='list'?{entries:[]}:{};
   if(plugin!=='AlphaConnection')throw Error('Unexpected native effect');
   if(method==='secureRead')return{value:store.get(input.slot)??null};
   if(method==='secureWrite'){store.set(input.slot,input.value);return{};}
   if(method==='secureRemove'){store.delete(input.slot);return{};}
   if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return{status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return{status:'saved'};}
   if(method==='cancel'){f.cancels++;return{};}
   const path=new URL(input.url).pathname,body=input.body?JSON.parse(input.body):{},ok=(data:any)=>({status:200,data});
   if(path==='/api/auth/status')return ok({required:true,authenticated:false,pairingEnabled:true,bootstrapRequired:false,instanceId:'history-fixture',expiresAt:Date.now()+60000});
   if(path==='/api/auth/pair')return ok({token:'synthetic-session',identityId:'fixture-owner',access:'owner',instanceId:'history-fixture'});
   if(path==='/api/auth/me')return ok({identity:{id:'fixture-owner',displayName:'Fixture',kind:'owner'},session:{id:'synthetic-session',kind:'machine',expiresAt:Date.now()+600000},access:{role:'OWNER',mode:'session'}});
   if(path==='/api/agents')return ok({agents:[{id:agentId,name:'History fixture',status:'running'}]});
   if(path==='/api/client-devices/register')return ok({installationId:input.headers['X-Eliza-Device-Id'],enrollmentId:'history-enrollment',capabilities:['browser.history.v1']});
   if(path==='/api/workflow/status')return ok({});
   if(path==='/api/client-devices/proposals')return ok({proposals:[]});
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'history-chat',title:'Fixture'}});
   // The reply stays in flight until the spec releases it, as the agent's BROWSER action does.
   if(path==='/api/conversations/history-chat/messages'&&input.method==='POST'){
    f.posts.push(String(body.text));
    const text=await new Promise<string>(resolve=>{f.release=resolve;});
    return ok({text,agentName:'History fixture',userMessageId:crypto.randomUUID()});
   }
   if(path==='/api/views/interact-claim'){f.claims++;return ok({claimId:'history-claim-'+f.claims});}
   if(path==='/api/views/interact-result'){f.results.push(body);return ok({accepted:true});}
   throw Error('Unexpected fixture route '+path);
  }};
 });
 const loads:Record<string,number>={};
 await page.route(/^https:\/\/history\.example\//,route=>{const name=new URL(route.request().url()).pathname.slice(1);loads[name]=(loads[name]??0)+1;return route.fulfill({contentType:'text/html',body:`<title>${name}</title><h1>${name}</h1>`});});
 await page.goto('/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByText('Local development agent',{exact:true}).click();
 const local=page.locator('.alpha-connection details').filter({has:page.getByText('Local development agent',{exact:true})});
 await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');
 await local.getByLabel('Pairing code',{exact:true}).fill('synthetic-code');
 await local.getByRole('button',{name:'Connect local agent',exact:true}).click();
 await page.locator('.alpha-connection-scrim').waitFor({state:'detached'});
 await returnToApps(page);
 // Back, forward and reload from the agent are native Browser commands; the web surface stands in for the WebView.
 // The web surface answers commands with nothing; the native plugin answers with the tab it acted on.
 await page.evaluate(async()=>{(window as any).Capacitor.isNativePlatform=()=>true;
  const {BrowserSurface}=await import('/src/browser/browser-surface.ts'),command=BrowserSurface.prototype.command;
  BrowserSurface.prototype.command=async function(input){await command.call(this,input);return {session:input.session,id:input.id} as any;};
 });
 await page.getByRole('button',{name:'Browser',exact:true}).click();
 for(const path of ['first','second']){
  if(!await page.getByRole('textbox',{name:'Address',exact:true}).isVisible())await page.getByRole('button',{name:'Edit address',exact:true}).click();
  const box=page.getByRole('textbox',{name:'Address',exact:true});await box.fill('https://history.example/'+path);await box.press('Enter');
  await expect(showing(page,path)).toBeVisible();
 }
 const fixture=()=>page.evaluate(()=>{const f=(window as any).historyReplyFixture;return {posts:f.posts,cancels:f.cancels,claims:f.claims,results:f.results,held:!!f.release};});
 const ask=async(text:string)=>{
  const input=page.getByRole('textbox',{name:/^(Ask Alpha|Message Alpha|Ask about this page)$/});await input.fill(text);await input.press('Enter');
  await expect.poll(async()=>(await fixture()).posts.at(-1)?.endsWith('\n'+text)).toBe(true);await expect.poll(async()=>(await fixture()).held).toBe(true);
  await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toBeVisible();
 };
 // The agent's BROWSER action reaches the renderer as one view:interact frame for the page the turn observed.
 const command=async(subaction:'back'|'reload')=>{
  const count=(await fixture()).results.length;
  await page.evaluate(async subaction=>{
   const {connectionController}=await import('/src/runtime/connection-ui.tsx'),{alphaClient}=await import('/src/runtime/alpha-client.ts');
   const context=alphaClient.getState().context,client=connectionController.captureViewNavigation(context)?.client as any;
   if(!client)throw Error('No renderer view client');
   await client.receiveInteraction({type:'view:interact',requestId:crypto.randomUUID(),viewId:'browser',viewType:'gui',installationId:'history-installation',capability:'browser-command',params:{command:{subaction},selection:{id:context.selectedObject!.id,revision:context.selectedObject!.revision}}});
  },subaction);
  await expect.poll(async()=>(await fixture()).results.length).toBe(count+1);
  return (await fixture()).results.at(-1);
 };
 const release=(text:string)=>page.evaluate(text=>{const f=(window as any).historyReplyFixture,release=f.release;f.release=null;release(text);},text);
 return {fixture,ask,command,release,loads};
}
const showing=(page:Page,name:string)=>page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name,exact:true});
const replies=(page:Page)=>page.locator('[data-alpha-message-text]');

test('the agent\'s own Browser back and reload during its reply let that reply finish',async({page})=>{
 test.setTimeout(90_000);
 const f=await setup(page);
 for(const [ask,subaction,answer] of [['Go back','back','Went back.'],['Reload the page','reload','Reloaded the page.']] as const){
  const loadsBefore=f.loads.first??0;
  await f.ask(ask);
  const result=await f.command(subaction);
  expect(result,JSON.stringify(result)).toMatchObject({success:true,result:{ok:true,data:{dispatched:true}}});
  // The page moved while the reply was still in flight (the open chat sheet covers the page itself).
  await expect.poll(()=>f.loads.first??0).toBe(loadsBefore+1);await expect(page.getByRole('button',{name:'Edit address',exact:true})).toContainText('/first');
  await expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
  await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toBeVisible();
  await f.release(answer);
  await expect(replies(page).filter({hasText:new RegExp('^'+answer.replace('.','\\.')+'$')})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toHaveCount(0);
 }
 await expect(page.getByText(/stopped this reply|did not finish|Request cancelled|May still finish|view changed/)).toHaveCount(0);
 expect((await f.fixture()).cancels).toBe(0);
});

test('the owner\'s Stop still ends a reply after the agent\'s own Browser back',async({page})=>{
 const f=await setup(page);
 await f.ask('Go back');
 await f.command('back');await expect.poll(()=>f.loads.first).toBe(2);
 await page.getByRole('button',{name:'Stop reply',exact:true}).click();
 await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toHaveCount(0);
 await expect.poll(async()=>(await f.fixture()).cancels).toBeGreaterThan(0);
 await f.release('Late reply after Stop.');
 await expect(replies(page).filter({hasText:'Late reply after Stop.'})).toHaveCount(0);
});

test('the owner leaving Browser still ends a reply after the agent\'s own Browser back',async({page})=>{
 const f=await setup(page);
 await f.ask('Go back');
 await f.command('back');await expect.poll(()=>f.loads.first).toBe(2);
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toHaveCount(0);
 await expect.poll(async()=>(await f.fixture()).cancels).toBeGreaterThan(0);
 await f.release('Late reply after leaving Browser.');
 await expect(replies(page).filter({hasText:'Late reply after leaving Browser.'})).toHaveCount(0);
});
