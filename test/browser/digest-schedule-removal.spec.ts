import {installWorkflowListFixture} from './workflow-navigation';
import {test,expect as baseExpect,type Page} from '@playwright/test';
// The digest panel fills from IndexedDB and its first tick; under load that has taken longer than 5s.
const expect=baseExpect.configure({timeout:15_000});
test.describe.configure({timeout:90_000});
test.use({contextOptions:{reducedMotion:'reduce'}});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/,route=>route.abort());});
const panel=(page:Page)=>page.getByRole('dialog',{name:'Scheduled digests',exact:true});

/** A digest schedule is a workflow on the agent (plugin-workflow lists it with the hosted digest metadata under the
 * loop's own ID and removes it through the reviewed workflow lifecycle). The development profile keeps digest loops
 * in their own store, so this fixture answers the workflow reads for the one loop and applies a confirmed removal to it. */
async function setup(page:Page){
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'development',profile:'local'})));
 await page.goto('/?mode=dev&workflows=agent');await installWorkflowListFixture(page);
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');await c.initialize();await c.startDevelopment('local');
  const {developmentDigestRequest:request}=await import('/src/browser/development-digests.ts'),{developmentIdentity}=await import('/src/browser/development-identity.ts'),{developmentDigestDocument,readDevelopmentDigests,initialDevelopmentDigests}=await import('/src/browser/development-digest-document.ts');
  const identity=developmentIdentity('local'),call=(path:string,body?:any)=>request(identity,'/api/workflow/hosted/'+path,body);
  const source:any=await call('sources',{id:crypto.randomUUID(),kind:'notes',label:'Morning notes',text:'Saved text',observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),confirmed:true});
  const saved:any=await call('loops',{mutationId:crypto.randomUUID(),confirmed:true,spec:{version:1,template:'morning',sourceId:source.source.id,sourceRevision:source.source.revision,timeZone:'UTC',localTime:'07:00',enabled:true}});
  const f=(window as any).digestRemovalFixture={loopId:saved.loop.id as string,lifecycle:[] as any[]};
  const loop=async()=>(await readDevelopmentDigests(identity)).loops.find((row:any)=>row.id===f.loopId)!;
  const workflow=async()=>{const row=await loop();return {id:row.id,name:'Morning digest',description:'',active:row.active,removed:row.removed,triggerCleanup:'complete',versionId:row.versionId,hostedDigest:true,steps:[]};};
  const {WorkflowProtocol:P}=await import('/src/runtime/workflow-protocol.ts');
  const list=P.prototype.list,detail=P.prototype.detail,executions=P.prototype.executions;
  P.prototype.lifecycleSupported=async()=>true;
  P.prototype.list=async function(signal){const rows=await list.call(this,signal),digest=await workflow();return digest.removed?rows:[...rows,digest];};
  P.prototype.detail=async function(id,signal){return id===f.loopId?workflow():detail.call(this,id,signal);};
  P.prototype.executions=async function(id,signal){return id===f.loopId?[]:executions.call(this,id,signal);};
  P.prototype.lifecycle=async(id,version,operation,signal,beforeSubmit)=>{
   const mutationId=crypto.randomUUID();await beforeSubmit(mutationId);signal.throwIfAborted();f.lifecycle.push({id,version,operation});
   if(id!==f.loopId)throw Error('Only the digest workflow is removed here');
   const versionId=crypto.randomUUID();
   await developmentDigestDocument(identity).edit(initialDevelopmentDigests,(state:any)=>{const row=state.loops.find((r:any)=>r.id===id);if(row.versionId!==version)throw Error('Workflow changed; review again');row.removed=true;row.active=false;row.versionId=versionId;});
   return {mutationId,workflowId:id,previousVersionId:version,versionId,operation,appliedAt:new Date().toISOString()};
  };
 });
}

test('Remove on a digest schedule opens its workflow with the reviewed removal, and nothing is removed until the owner confirms',async({page},info)=>{
 await setup(page);
 const loopId=await page.evaluate(()=>(window as any).digestRemovalFixture.loopId as string);
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha:hosted-digests')));
 const schedules=panel(page).getByRole('region',{name:'Digest schedules',exact:true});
 await expect(schedules).toContainText('Morning at 07:00 (UTC)');
 await schedules.screenshot({path:info.outputPath('digest-schedule-remove-control.png'),animations:'disabled'});
 await schedules.getByRole('button',{name:'Remove Morning schedule',exact:true}).click();
 // The panel closes and the digest's workflow opens with its removal review; nothing has been sent.
 await expect(panel(page)).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','workflows');
 await expect(page.getByText('Keeps history; stops future runs.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).digestRemovalFixture.lifecycle)).toEqual([]);
 await page.screenshot({path:info.outputPath('digest-schedule-removal-review.png'),animations:'disabled'});
 await page.getByRole('button',{name:'Remove',exact:true}).click();
 await expect(page.getByText('Workflow removed; execution history retained.')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).digestRemovalFixture.lifecycle.map((call:any)=>[call.id,call.operation]))).toEqual([[loopId,'remove']]);
 // Back in Scheduled digests the removed schedule is gone.
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha:hosted-digests')));
 await panel(page).getByRole('button',{name:'Refresh',exact:true}).click();
 await expect(panel(page)).toBeVisible();
 await expect(panel(page).getByRole('region',{name:'Digest schedules',exact:true})).toHaveCount(0);
});
