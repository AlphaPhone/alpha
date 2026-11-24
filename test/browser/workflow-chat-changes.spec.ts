import {openWorkflowActions} from './workflow-navigation';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';

// Real renderer, pairing, connection controller, chat and Workflows; a synthetic agent whose WORKFLOW
// action commits a workflow change and answers with plugin-workflow's own sentence and effect receipt.
async function connect(page:Page){
 await page.addInitScript(()=>{
  const w=window as any,store=new Map();
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  const flows:{id:string;name:string;active:boolean;versionId:string;steps:never[];removed?:boolean;triggerCleanup?:'complete'}[]=[{id:'workflow-fixture',name:'Morning digest',active:true,versionId:'version-1',steps:[]}];
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
   if(path==='/api/automations'){fixture.automationLists++;return ok({automations:flows.filter(flow=>!flow.removed).map(flow=>({id:'workflow:'+flow.id,type:'workflow',workflowId:flow.id,title:flow.name,enabled:flow.active,status:flow.active?'active':'paused',schedules:[]}))});}
   if(path==='/api/lifeops/reminders')return ok({reminders:[]});
   if(path==='/api/lifeops/scheduled-tasks')return ok({tasks:[]});
   if(path==='/api/workflow/status')return ok({engine:'smthrs',status:'ready'});
   if(path==='/api/workflow/workflows')return ok({workflows:flows.filter(flow=>!flow.removed)});
   const flow=flows.find(item=>path==='/api/workflow/workflows/'+item.id||path==='/api/workflow/workflows/'+item.id+'/executions');
   if(flow&&path.endsWith('/executions'))return ok({executions:[]});
   if(flow){fixture.detailReads++;return ok(flow);}
   if(path.endsWith('/approvals'))return {status:404,data:{}};
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'fixture-conversation',title:'Chat change fixture'}});
   if(path==='/api/conversations')return ok({conversations:[]});
   if(path==='/api/conversations/fixture-conversation/messages'&&input.method==='POST'){
    const ids={messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),agentName:'Chat change fixture'};
    // The owner's words follow the client's screen observation.
    const said=String(JSON.parse(input.body).text).split('\n').pop()!,changed=(text:string,operation:string,flow=flows[0])=>ok({...ids,text,actionResults:[{success:true,text,effectReceipts:[receipt(operation,flow)]}]});
    if(/create/i.test(said)){
     const created={id:'workflow-created',name:'Daily notes',active:false,versionId:'created-1',steps:[] as never[]};flows.push(created);
     return changed(`Created “${created.name}”. It is off until you turn it on.`,'workflow.create',created);
    }
    if(/rename/i.test(said)){Object.assign(flows[0],{name:'Daily brief',versionId:'version-renamed'});return changed('Renamed “Morning digest” to “Daily brief”.','workflow.rename');}
    if(/remove/i.test(said)){Object.assign(flows[0],{removed:true,triggerCleanup:'complete',active:false,versionId:'version-removed'});return changed(`Removed “${flows[0].name}”. It no longer runs. You can restore it later.`,'workflow.remove');}
    if(/restore/i.test(said)){Object.assign(flows[0],{removed:false,active:false,versionId:'version-restored'});return changed(`Restored “${flows[0].name}”. It is off until you turn it on.`,'workflow.restore_removed');}
    // plugin-workflow refuses a chat edit of a workflow built in the view; the failed result carries its code.
    if(/schedule/i.test(said))return ok({...ids,text:'“Morning digest” was built in the Workflows view. Open it there to change its steps or schedule.',actionResults:[{success:false,error:'WORKFLOW_EDIT_IN_VIEW',text:'“Morning digest” was built in the Workflows view. Nothing was changed.'}]});
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

test('a workflow created from chat gets a card that opens it in Workflows',async({page})=>{
 await connect(page);await say(page,'Create a workflow that summarizes my notes');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Created “Daily notes”. It is off until you turn it on.'})).toBeVisible();
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

test('a workflow renamed, removed and restored from chat follows in its open detail, the list and the cards',async({page})=>{
 await connect(page);await page.getByRole('button',{name:'Workflows',exact:true}).click();
 const list=page.getByRole('region',{name:'Workflows',exact:true});await list.getByText('Morning digest',{exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Morning digest',exact:true})).toBeVisible();
 const card=(change:string)=>page.locator('.workflow-run-card[data-workflow-id="workflow-fixture"]').filter({hasText:change});
 const minimize=async()=>{const button=page.getByRole('button',{name:'Minimize chat',exact:true});await button.press('Enter');await expect(button).toBeHidden();};
 test.slow();

 await say(page,'Rename this to Daily brief');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Renamed “Morning digest” to “Daily brief”.'})).toBeVisible();
 await expect(card('Renamed')).toBeVisible();
 await expect.poll(async()=>(await fixture(page)).detailReads).toBe(2);
 await minimize();await expect(page.getByRole('heading',{name:'Daily brief',exact:true})).toBeVisible();

 // The open workflow is shown as removed: it offers only to be restored.
 await say(page,'Remove this');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Removed “Daily brief”. It no longer runs. You can restore it later.'})).toBeVisible();
 await expect(card('Removed')).toBeVisible();
 await expect.poll(async()=>(await fixture(page)).detailReads).toBe(3);
 await minimize();await openWorkflowActions(page);await expect(page.getByRole('button',{name:'Restore workflow',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to workflows',exact:true}).click();
 await expect(list.getByText('Daily brief',{exact:true})).toHaveCount(0);
 // The removed workflow can still be read, so its card opens it, as removed.
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await card('Removed').getByRole('button',{name:'Open workflow',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Daily brief',exact:true})).toBeVisible();await openWorkflowActions(page);await expect(page.getByRole('button',{name:'Restore workflow',exact:true})).toBeVisible();

 await say(page,'Restore this');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Restored “Daily brief”. It is off until you turn it on.'})).toBeVisible();
 await expect(card('Restored')).toBeVisible();
 await minimize();await openWorkflowActions(page);await expect(page.getByRole('button',{name:'Remove workflow',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to workflows',exact:true}).click();
 await expect(list.getByText('Daily brief',{exact:true}).first()).toBeVisible();
});

test('a change the agent refuses because it is made in the Workflows view offers to open that view',async({page})=>{
 await connect(page);await say(page,'Change the schedule of Morning digest to 7');
 const card=page.locator('.workflow-run-card').filter({hasText:'Make this change in Workflows'});
 await card.getByRole('button',{name:'Open Workflows',exact:true}).click();
 await expect(page.getByRole('region',{name:'Workflows',exact:true})).toBeVisible();
});
