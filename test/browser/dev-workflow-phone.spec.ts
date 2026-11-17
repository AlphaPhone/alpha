import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {openLegacyNotes} from './helpers/legacy-notes';
import {installWorkflowListFixture,workflowCard} from './workflow-navigation';
import {guardCalendarFixture as guardNoMedia} from './calendar-draft-readiness';
import { returnToApps } from './app-navigation';
import {test,expect,type Page} from '@playwright/test';
test.beforeEach(async({context,page})=>{await guardNoMedia(context);await page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/,route=>route.abort());});
/** The agent's Notes, bound when the development session connects: a closed canonical record transport.
 * As in the agent's store, saving text identical to an existing note replays that note. */
async function canonicalNotesPort(page:Page){await page.evaluate(async()=>{
 const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
 const identity={ownerId:'workflow-notes-owner',agentId:'workflow-notes-agent',sessionId:'workflow-notes-session',origin:location.origin};
 const state={notes:[] as any[],trash:[] as any[],revision:0},fixture=(window as any).workflowCanonicalNotes={state,creates:0};
 c.getAppRecordClient=()=>({sessionId:identity.sessionId,identity,current:()=>true,request:async(path:string,method:string,body:any)=>{
  if(path==='/api/notes/state'&&method==='GET')return {success:true,data:structuredClone(state)};
  if(path!=='/api/views/notes/interact'||method!=='POST'||body.capability!=='create-note')throw Error('Unexpected canonical Notes request');
  const content:string=body.params.content,split=content.indexOf('\n'),now=new Date().toISOString();
  let note=state.notes.find(saved=>saved.title+saved.body===content);
  if(!note){note={id:crypto.randomUUID(),title:split<0?content:content.slice(0,split),body:split<0?'':content.slice(split),color:'yellow',createdAt:now,updatedAt:now};state.notes.push(note);state.revision++;fixture.creates++;}
  return {requestId:crypto.randomUUID(),success:true,result:{success:true,text:'Completed',state:structuredClone(state),data:{note:structuredClone(note)}}};
 }} as any);
});}
async function setup(page:Page,mode='write',discover=false){if(mode==='notes')await page.addInitScript(()=>{if(!localStorage.getItem('alphaphone:notes:v2'))localStorage.setItem('alphaphone:notes:v2',JSON.stringify({version:2,collectionId:'00000000-0000-4000-8000-000000000001',records:[{id:'source-note',kind:'text',title:'Input note',body:'Selected private text'}],deleted:[]}));});await page.goto('/?mode=dev&workflows=agent');await installWorkflowListFixture(page);await openLegacyNotes(page);await returnToApps(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);if(mode==='cloud'){await page.getByRole('button',{name:'Use development account'}).click();await expect(page.getByText('Connected development account: first',{exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Development profile'}).selectOption('cloud');}if(mode==='canonical')await canonicalNotesPort(page);await page.getByRole('button',{name:'Connect development profile'}).click();await expect(page.getByRole('dialog',{name:'Development connections'})).toHaveCount(0);/* Connecting changes the owner and returns Notes to its canonical source. Select the retained device source again for this explicit legacy-workflow fixture. */if(mode!=='canonical'){await returnToApps(page);await openLegacyNotes(page);}await returnToApps(page);await page.evaluate(async mode=>{const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');const {normalizePhoneSpec}=await import('/src/runtime/phone-workflow-authoring.ts');const client=c.getWorkflowClient()!.client,signal=new AbortController().signal,catalog=await client.phoneCatalog(signal),spec=normalizePhoneSpec({device:c.getWorkflowDeviceTarget()!,version:1,name:'Phone workflow',description:'Reviewed local write',trigger:{kind:'manual'},steps:[mode==='notes'?{id:'read',kind:'Read',operation:'selected_notes',notes:[{id:'source-note',revision:await (await import('/src/runtime/workflow-device-contract.ts')).workflowSha(['Input note','Selected private text'])}]}:mode==='reminders'?{id:'read',kind:'Read',operation:'selected_reminders',scope:{window:'open_and_completed_today',timeZone:'UTC',maximumItems:50}}:mode==='run-day'?{id:'read',kind:'Read',operation:'calendar_range',range:{calendarIds:['local'],days:1,timeZone:'America/New_York',maximumEvents:200}}:mode==='calendar'?{id:'read',kind:'Read',operation:'calendar_range',range:{calendarIds:['local'],start:new Date(Date.now()-86400000).toISOString(),end:new Date(Date.now()+86400000).toISOString(),timeZone:'UTC',maximumEvents:200}}:{id:'read',kind:'Read',operation:'supplied_text',text:'Exact workflow text'},{id:'save',kind:'Write',operation:'save_note',source:'read',title:'Workflow approved note'},{id:'after',kind:'Write',operation:'compose_draft',source:'save',prefix:'Saved: ',suffix:''}]});const valid=await client.validatePhone(spec,catalog,signal);await client.savePhone(spec,catalog,{mutationId:crypto.randomUUID(),specDigest:valid.specDigest,compilerRevision:catalog.compilerRevision},signal);},mode);await returnToApps(page);await page.getByRole('button',{name:'Workflows',exact:true}).click();await workflowCard(page,'Phone workflow').click();await page.getByRole('button',{name:'Run now',exact:true}).click();await page.getByRole('button',{name:'Confirm run',exact:true}).click();
 if(discover){
  // The development endpoint simulates agent issuance. Prime that fixture before checking discovery.
  await expect(page.getByRole('button',{name:'Cancel run',exact:true})).toBeVisible();
  const pendingIds=()=>page.evaluate(async()=>{
   const {readExecutionPart}=await import('/src/browser/development-execution-document.ts');
   return (await readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[]}))).proposals.map((row:any)=>row.id);
  });
  await page.evaluate(async()=>{
   const {readExecutionPart}=await import('/src/browser/development-execution-document.ts');
   const [run]=(await readExecutionPart({namespace:'local'} as any,'workflows',()=>({runs:[]}))).runs as any[];
   const {connectionController}=await import('/src/runtime/connection-ui.tsx');
   await connectionController.getWorkflowClient()!.client.phoneReview({id:run.id,workflowId:run.workflowId,versionId:run.workflowVersionId},new AbortController().signal);
  });
  const issued=await pendingIds();
  expect(issued).toHaveLength(1);
  await expect(page.getByRole('status').filter({hasText:'Device action awaiting review'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Workflow phone step review'})).toHaveCount(0);
  expect(await pendingIds()).toEqual(issued);
 }
 await page.getByRole('button',{name:'Review device actions',exact:true}).click();await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeVisible();}
const notes=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw())||'{"records":[]}').records.filter((n:any)=>n.title==='Workflow approved note'));
for(const profile of ['write','cloud'])test(`approved ${profile} workflow phone write resumes from its exact receipt once`,async({page})=>{await setup(page,profile,profile==='write');expect(await notes(page)).toHaveLength(0);await page.getByRole('button',{name:'Approve',exact:true}).click();expect(await notes(page)).toHaveLength(0);await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await expect.poll(()=>notes(page)).toHaveLength(1);const output=page.getByText('Saved: Exact workflow text',{exact:true});await expect(async()=>{if(await output.isVisible())return;await page.getByRole('button',{name:'Refresh',exact:true}).click({timeout:2_000});await expect(output).toBeVisible({timeout:2_000});}).toPass({timeout:20_000});await expect(page.getByRole('button',{name:'Check saved device results',exact:true})).toHaveCount(0);expect(await notes(page)).toHaveLength(1);await page.reload();await installWorkflowListFixture(page);await openLegacyNotes(page);await returnToApps(page);expect(await notes(page)).toHaveLength(1);});
// The owner's default Notes are the agent's canonical records: an approved workflow save lands there, not in Previous notes.
test('an approved workflow note write is saved in canonical Notes when they are the open source',async({page})=>{
 await setup(page,'canonical');
 const saved=()=>page.evaluate(()=>(window as any).workflowCanonicalNotes.state.notes.map((note:any)=>[note.title,note.body]));
 expect(await saved()).toEqual([]);
 await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();
 await expect.poll(saved).toEqual([['Workflow approved note','\nExact workflow text']]);
 const output=page.getByText('Saved: Exact workflow text',{exact:true});
 await expect(async()=>{if(await output.isVisible())return;await page.getByRole('button',{name:'Refresh',exact:true}).click({timeout:2_000});await expect(output).toBeVisible({timeout:2_000});}).toPass({timeout:20_000});
 expect(await notes(page)).toHaveLength(0);
 // The saved record is the one the owner sees in Notes.
 await returnToApps(page);await page.getByRole('button',{name:'Notes',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Previous notes',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Open Workflow approved note',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).workflowCanonicalNotes.creates)).toBe(1);
});
test('denied workflow phone step ends the run without writing a note',async({page})=>{await setup(page);await page.getByRole('button',{name:'Deny',exact:true}).click();await page.getByRole('button',{name:'Confirm deny',exact:true}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('This run stopped with an error on your agent.',{exact:true})).toBeVisible();expect(await notes(page)).toHaveLength(0);});
test('cancellation blocks a retained pending proposal from claiming an effect',async({page})=>{await setup(page);await page.getByRole('button',{name:'Cancel run',exact:true}).click();await page.getByRole('button',{name:'Confirm cancel',exact:true}).click();await expect(page.getByRole('button',{name:'Back to workflow',exact:true})).toBeEnabled();await expect(page.locator('.workflow-run-summary').getByText('Cancelled',{exact:true})).toBeVisible();const refused=await page.evaluate(async()=>{const {developmentActionRequest}=await import('/src/browser/development-actions.ts');const p=(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))).proposals[0];try{await developmentActionRequest('local',`/api/client-devices/proposals/${p.id}/decision`,{digest:p.digest,decision:'approve'},new AbortController().signal);return false;}catch{return true;}});expect(refused).toBe(true);expect(await notes(page)).toHaveLength(0);});

for(const mode of ['notes','calendar','reminders'])test(`approved ${mode} read continues into a separately approved note write`,async({page})=>{await setup(page,mode);expect(await notes(page)).toHaveLength(0);await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();expect(await notes(page)).toHaveLength(0);await page.getByRole('button',{name:'Review device actions',exact:true}).click();await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await expect.poll(()=>notes(page)).toHaveLength(1);const saved=(await notes(page))[0];expect(JSON.parse(saved.body).kind).toBe(mode);if(mode==='notes')expect(JSON.parse(saved.body).notes[0].text).toBe('Selected private text');await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.workflow-run-summary').getByText('Finished',{exact:true})).toBeVisible();});
test('legacy waiting runs recover their existing proposal identity instead of duplicating it',async({page})=>{await setup(page);const original=await page.evaluate(async()=>{await (await import('/src/browser/development-execution-document.ts')).editExecutionPart({namespace:'local'} as any,'workflows',()=>({runs:[] as any[]}),state=>{delete state.runs[0].proposalIds;});return (await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))).proposals[0].id;});await page.getByRole('button',{name:'Review device actions',exact:true}).click();await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeVisible();const restored=await page.evaluate(async()=>({run:(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'workflows',()=>({workflows:[],receipts:[],runs:[]}))).runs[0],proposals:(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))).proposals}));expect(restored.proposals).toHaveLength(1);expect(restored.run.proposalIds.save).toBe(original);await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await expect.poll(()=>notes(page)).toHaveLength(1);});
test('a lost read receipt resumes after reload using the original result despite source edits',async({page})=>{await setup(page,'notes');await page.evaluate(async()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='alpha.browser.execution.local.v1'&&JSON.parse(JSON.parse(JSON.parse(value.raw).value).actions).proposals.some((p:any)=>p.state==='completed'))throw Error('Receipt storage unavailable');return put.call(this,value,key);};});await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await expect(page.getByText(/Not synced yet; open action history to retry\./)).toBeVisible();await page.evaluate(async()=>{const m=await import('/src/runtime/browser-notes-document.ts'),before=(await m.browserNotesPort.read())!,data=JSON.parse(before.raw);data.records.find((n:any)=>n.id==='source-note').body='Changed after approved read';await m.browserNotesPort.compareExchange(before,JSON.stringify(data));});await page.reload();await installWorkflowListFixture(page);await openLegacyNotes(page);await returnToApps(page);await page.getByRole('button',{name:'Workflows',exact:true}).click();await workflowCard(page,'Phone workflow').click();await page.getByRole('button',{name:'Waiting for approval execution',exact:true}).click();await page.getByRole('button',{name:'Check saved device results',exact:true}).click();await expect(page.getByText('Receipts sent',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Review device actions',exact:true}).click();await page.getByRole('button',{name:'Approve',exact:true}).click();await page.getByRole('button',{name:'Confirm approve',exact:true}).click();await expect.poll(()=>notes(page)).toHaveLength(1);expect(JSON.parse((await notes(page))[0].body).notes[0].text).toBe('Selected private text');await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('.workflow-run-summary').getByText('Finished',{exact:true})).toBeVisible();const journal=await page.evaluate(async()=>(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))).journal);expect(journal).toHaveLength(2);expect(journal.filter((entry:any)=>entry.record.operation.type==='read_selected_notes')).toHaveLength(1);});

test('run-day Calendar confirmation checks its original anchor across midnight',async({page})=>{
 test.setTimeout(120000);
 const anchor='2027-03-15T03:59:00.000Z';
 // Past the 15-minute grace a legacy (unanchored) review allows after midnight, so only the persisted anchor
 // can still admit the previous day's read.
 const nextDay='2027-03-15T04:20:00.000Z';
 await page.clock.setFixedTime(new Date(anchor));
 await setup(page,'run-day');
 const calendarState=()=>page.evaluate(async()=>{
  const {readExecutionPart}=await import('/src/browser/development-execution-document.ts');
  const {proposals,journal}=await readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}));
  return {proposal:proposals[0],journal};
 });
 const issued=await calendarState();
 expect(issued.proposal.payload.operation).toMatchObject({
  type:'read_calendar_range',calendarIds:['local'],start:'2027-03-14T05:00:00.000Z',
  end:'2027-03-15T04:00:00.000Z',timeZone:'America/New_York',
 });
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.clock.setFixedTime(new Date(nextDay));
 const setAnchor=(startedAt:string)=>page.evaluate(async startedAt=>{
  const {editExecutionPart}=await import('/src/browser/development-execution-document.ts');
  await editExecutionPart({namespace:'local'} as any,'workflows',()=>({runs:[] as any[]}),state=>{
   state.runs[0].startedAt=startedAt;
  });
 },startedAt);
 await setAnchor(nextDay);
 await page.getByRole('button',{name:'Confirm approve',exact:true}).click();
 await expect(page.getByRole('region',{name:'Workflow phone steps'})).toContainText('The workflow run time changed. Review the device actions again.');
 await expect(page.getByRole('button',{name:'Approve',exact:true})).toHaveCount(0);
 expect(await calendarState()).toEqual(issued);

 await setAnchor(anchor);
 await page.getByRole('button',{name:'Review device actions',exact:true}).click();
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.getByRole('button',{name:'Confirm approve',exact:true}).click();
 await expect.poll(async()=>(await calendarState()).proposal.state).toBe('completed');
 const confirmed=await calendarState();
 expect(confirmed.proposal.payload.operation).toEqual(issued.proposal.payload.operation);
 expect(confirmed.journal).toHaveLength(1);
 expect(confirmed.journal[0].record.operation).toEqual(issued.proposal.payload.operation);
});
