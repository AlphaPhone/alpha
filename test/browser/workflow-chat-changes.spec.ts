import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';

// Real renderer, pairing, connection controller, chat and Workflows; a synthetic agent whose WORKFLOW
// action commits a workflow change and answers with plugin-workflow's own sentence and effect receipt.
async function connect(page:Page){
 await page.addInitScript(()=>{
  const w=window as any,store=new Map();
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  const flows=[{id:'workflow-fixture',name:'Morning digest',active:true,versionId:'version-1',steps:[]}];
  const fixture=w.workflowChatFixture={detailReads:0,automationLists:0};
  const receipt=(operation:string,flow:{id:string;versionId:string})=>({receiptId:crypto.randomUUID(),operation,resource:{kind:'workflow.definition',id:flow.id,version:flow.versionId},artifacts:[],idempotency:{key:null,replayed:false},observedAt:'2026-11-17T12:00:00.000Z',outcome:'applied',commit:{kind:'durable',id:flow.versionId,committedAt:'2026-11-17T12:00:00.000Z'}});
  w.Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureCompareExchange','secureRemove'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin!=='AlphaConnection')throw Error('Unexpected native call');
   if(method==='secureRead')return {value:store.get(input.slot)??null};if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return {status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return {status:'saved'};}
   if(method==='secureWrite'){store.set(input.slot,input.value);return {};}if(method==='secureRemove'){store.delete(input.slot);return {};}if(method==='cancel')return {};
   const path=new URL(input.url).pathname,ok=(data:any)=>({status:200,data});
   if(path==='/api/auth/status')return ok({required:true,authenticated:false,pairingEnabled:true,bootstrapRequired:false,instanceId:'chat-change-fixture',expiresAt:Date.now()+60000});
   if(path==='/api/auth/pair')return ok({token:'synthetic-session',identityId:'owner',access:'owner',instanceId:'chat-change-fixture'});
   if(path==='/api/auth/me')return ok({identity:{id:'owner',displayName:'Fixture owner',kind:'owner'},session:{id:'synthetic-session',kind:'machine',expiresAt:Date.now()+600000},access:{role:'OWNER',mode:'session'}});
   if(path==='/api/agents')return ok({agents:[{id:'12345678-1234-4234-8234-123456789abc',name:'Chat change fixture',status:'running'}]});
   if(path==='/api/client-devices/register')return {status:404,data:{}};
   if(path==='/api/automations'){fixture.automationLists++;return ok({automations:flows.map(flow=>({id:'workflow:'+flow.id,type:'workflow',workflowId:flow.id,title:flow.name,enabled:flow.active,status:flow.active?'active':'paused',schedules:[]}))});}
   if(path==='/api/lifeops/reminders')return ok({reminders:[]});
   if(path==='/api/lifeops/scheduled-tasks')return ok({tasks:[]});
   if(path==='/api/workflow/status')return ok({engine:'smthrs',status:'ready'});
   if(path==='/api/workflow/workflows')return ok({workflows:flows});
   const flow=flows.find(item=>path==='/api/workflow/workflows/'+item.id||path==='/api/workflow/workflows/'+item.id+'/executions');
   if(flow&&path.endsWith('/executions'))return ok({executions:[]});
   if(flow){fixture.detailReads++;return ok(flow);}
   if(path.endsWith('/approvals'))return {status:404,data:{}};
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'fixture-conversation',title:'Chat change fixture'}});
   if(path==='/api/conversations')return ok({conversations:[]});
   if(path==='/api/conversations/fixture-conversation/messages'&&input.method==='POST'){
    const ids={messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),agentName:'Chat change fixture'};
    if(/create/i.test(JSON.parse(input.body).text)){
     const created={id:'workflow-created',name:'Daily notes',active:false,versionId:'created-1',steps:[]};flows.push(created);
     return ok({...ids,text:`Created “${created.name}” as an inactive Smithers workflow (${created.id}, version ${created.versionId}).`,actionResults:[{success:true,effectReceipts:[receipt('workflow.create',created)]}]});
    }
    // The pause committed, then the reply was cut off.
    Object.assign(flows[0],{active:false,versionId:'version-2'});
    return ok({...ids,text:'The request remains incomplete because processing stopped unexpectedly.',terminalFailure:{kind:'handler_error',code:'TURN_INTERRUPTED_AFTER_EFFECT',transient:false},actionResults:[{success:true,effectReceipts:[receipt('workflow.deactivate',flows[0])]}]});
   }
   throw Error('Unexpected fixture route '+path);
  }};
 });
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);await page.getByText('Local development agent',{exact:true}).click();
 const local=page.locator('.alpha-connection details').filter({has:page.getByText('Local development agent',{exact:true})});await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');await local.getByLabel('Pairing code',{exact:true}).fill('fixture-code');await local.getByRole('button',{name:'Connect local agent',exact:true}).click();await expect(page.locator('.alpha-connection-scrim')).toHaveCount(0);
 await returnToApps(page);
}
async function say(page:Page,text:string){
 // An app view offers Type; Home shows the composer itself.
 const type=page.getByRole('button',{name:'Type',exact:true});if(await type.isVisible())await type.click();
 const composer=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();await composer.fill(text);await composer.press('Enter');
}
const fixture=(page:Page)=>page.evaluate(()=>(window as any).workflowChatFixture as {detailReads:number;automationLists:number});

test('a workflow created from chat reads in Alpha’s words and its card opens it in Workflows',async({page})=>{
 await connect(page);await say(page,'Create a workflow that summarizes my notes');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Created “Daily notes”. It is paused until you turn it on.'})).toBeVisible();
 await expect(page.getByText(/Smithers|workflow-created|created-1/)).toHaveCount(0);
 const card=page.locator('.workflow-run-card[data-workflow-id="workflow-created"]');await expect(card).toContainText('Created');
 expect((await fixture(page)).detailReads).toBe(0);
 await card.getByRole('button',{name:'Open workflow',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Daily notes',exact:true})).toBeVisible();
 expect((await fixture(page)).detailReads).toBe(1);
});

test('a change committed before the reply was cut off still refreshes the open workflow and the list',async({page})=>{
 await connect(page);await page.getByRole('button',{name:'Workflows',exact:true}).click();
 const list=page.getByRole('region',{name:'Workflows',exact:true});await list.getByText('Morning digest',{exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Morning digest',exact:true})).toBeVisible();
 const before=await fixture(page);expect(before.detailReads).toBe(1);
 await say(page,'Pause this');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Done · reply cut off'})).toBeVisible();
 // The open workflow is read again, once, for the change the receipt proves.
 await expect.poll(async()=>(await fixture(page)).detailReads).toBe(2);
 await page.getByRole('button',{name:'Minimize chat',exact:true}).press('Enter');
 await page.getByRole('button',{name:'Back to workflows',exact:true}).click();
 await expect(list.getByText('Paused',{exact:true})).toBeVisible();
 expect((await fixture(page)).automationLists).toBeGreaterThan(before.automationLists);
 expect((await fixture(page)).detailReads).toBe(2);
});
