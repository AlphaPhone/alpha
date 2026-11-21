import {test,expect,type Page} from '@playwright/test';
import {canonicalNotesFixture,openCanonicalNotes} from './helpers/canonical-notes';

const date='2026-11-10T12:00:00Z';
const notes=[
 {id:'plain',title:'Plain note',body:'\nClosed fixture text',color:'yellow',createdAt:date,updatedAt:date},
 {id:'checklist',title:'Checklist note',body:'',color:'yellow',createdAt:date,updatedAt:date,format:{kind:'list',data:{items:[{t:'Milk',done:false}]}}},
];
const source={kind:'canonical-note-source',id:'notes',revision:'1'};
const activeContext=(page:Page)=>page.evaluate(async()=>(await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context);
const list=(page:Page)=>page.locator('[data-alpha-subview="notes-list"]');
const rows=(page:Page)=>list(page).locator('button.notes-row');
const actionState=(page:Page)=>page.evaluate(async()=>{
 const {readExecutionPart}=await import('/src/browser/development-execution-document.ts');
 const state=await readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}));
 return {proposals:state.proposals.map((proposal:any)=>proposal.state),journal:state.journal.map((entry:any)=>[entry.phase,entry.status])};
});

async function setup(page:Page,filter:{kind?:string;text?:string}){
 const fixture=await canonicalNotesFixture(page,{path:'/?mode=dev',notes});
 await page.evaluate(async filter=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const port=c.getAppRecordClient()!;
  c.getAppRecordClient=()=>{
   const session=c.getSnapshot().session;
   return session?{...port,identity:session,sessionId:session.sessionId,current:()=>c.getSnapshot().session===session}:null;
  };
  await c.startDevelopment('local');
  if(!c.getSnapshot().session)throw Error('Development session unavailable');
  await c.authorDevelopment('local',JSON.stringify({type:'notes_list_filter',...filter}));
  c.close();
 },filter);
 await openCanonicalNotes(page);
 await expect.poll(async()=> (await activeContext(page)).selectedObject).toEqual(source);
 await expect(rows(page)).toHaveCount(2);
 return fixture;
}

async function requestFilter(page:Page){
 await page.getByRole('button',{name:'Type',exact:true}).click();
 const composer=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
 await composer.fill('Filter my Notes');
 await composer.press('Enter');
 const review=page.getByText('Show notes',{exact:true});
 await expect(review).toBeVisible();
 await expect(rows(page)).toHaveCount(2);
 return review;
}

// Hold the mounted component's single filter write. Its real adapter, React updater,
// and completion callback run unchanged when the test releases the call.
async function holdFilterUpdate(page:Page){
 await page.evaluate(async()=>{
  const {Component}=await import('/src/prototype/model.js');
  const original=Component.prototype.vset;
  Component.prototype.vset=function(key:any,patch:any,options:any){
   if(key==='notes'&&options?.when&&Object.hasOwn(patch,'filter')){
    Component.prototype.vset=original;
    (window as any).releaseNotesFilter=()=>new Promise<void>(resolve=>{
     original.call(this,key,patch,{...options,afterCommit:()=>{options.afterCommit();resolve();}});
    });
    return true;
   }
   return original.call(this,key,patch,options);
  };
 });
}
// Run the mounted component's filter write unchanged (its `when` updater runs and React commits
// the state) but hold the completion callback, so success can only come from the commit callback.
async function holdFilterCommit(page:Page){
 await page.evaluate(async()=>{
  const {Component}=await import('/src/prototype/model.js');
  const original=Component.prototype.vset;
  Component.prototype.vset=function(key:any,patch:any,options:any){
   if(key==='notes'&&options?.when&&Object.hasOwn(patch,'filter')){
    Component.prototype.vset=original;
    const w=window as any;let release!:()=>void;const released=new Promise<void>(resolve=>release=resolve);
    w.notesFilterCommitted=false;
    w.releaseNotesFilter=()=>new Promise<void>(resolve=>{release();released.then(()=>setTimeout(resolve));});
    return original.call(this,key,patch,{...options,afterCommit:()=>{w.notesFilterCommitted=true;void released.then(()=>options.afterCommit());}});
   }
   return original.call(this,key,patch,options);
  };
 });
}
const filterCommitted=(page:Page)=>page.evaluate(()=>(window as any).notesFilterCommitted===true);
const filterHeld=(page:Page)=>page.evaluate(()=>typeof (window as any).releaseNotesFilter==='function');
const releaseFilter=(page:Page)=>page.evaluate(async()=>{
 const release=(window as any).releaseNotesFilter;
 delete (window as any).releaseNotesFilter;
 await release();
});

async function canonicalStateUnchanged(page:Page){
 expect(await page.evaluate(()=>{
  const fixture=(window as any).canonicalNotesFixture;
  return {notes:fixture.state.notes,revision:fixture.state.revision,writes:fixture.requests.filter((request:any)=>request.method==='POST')};
 })).toEqual({notes,revision:1,writes:[]});
}

test('the approved canonical Notes filter receives success after the active list commits',async({page})=>{
 const {foreign,errors}=await setup(page,{text:'checklist',kind:'list'});
 await holdFilterCommit(page);
 await (await requestFilter(page)).click();
 // The admitted list has committed; only its completion callback is held. A receipt written
 // before that callback runs is a failure, not a wait condition. The journal reserves the action
 // before it applies, so only a terminal entry ends the wait early.
 await expect.poll(async()=>await filterCommitted(page)||(await actionState(page)).journal.some(([phase])=>phase==='terminal')).toBe(true);
 expect((await actionState(page)).journal).not.toContainEqual(['terminal','succeeded']);
 expect(await filterCommitted(page)).toBe(true);
 await expect(rows(page)).toHaveCount(1);
 for(const deadline=Date.now()+1500;Date.now()<deadline;await page.waitForTimeout(100)){
  expect((await actionState(page)).journal).not.toContainEqual(['terminal','succeeded']);
 }
 await releaseFilter(page);

 const clear=list(page).getByRole('button',{name:'Clear filter',exact:true});
 await expect(clear).toBeVisible();
 await expect(rows(page)).toHaveCount(1);
 await expect(rows(page)).toHaveAttribute('data-alpha-note-id','checklist');
 await expect.poll(()=>actionState(page)).toEqual({proposals:['completed'],journal:[['terminal','succeeded']]});
 const chat=page.getByRole('button',{name:'Minimize chat',exact:true});
 if(await chat.isVisible())await chat.click();
 await clear.click();
 await expect(rows(page)).toHaveCount(2);
 await page.getByRole('button',{name:'Open Plain note',exact:true}).click();
 await expect.poll(async()=> (await activeContext(page)).selectedObject).toMatchObject({kind:'canonical-note',id:'plain'});
 await canonicalStateUnchanged(page);
 expect(foreign).toEqual([]);
 expect(errors).toEqual([]);
});

test('a queued canonical Notes filter cannot cross a new list visit at the same source revision',async({page})=>{
 const {foreign,errors}=await setup(page,{kind:'list'});
 const reviewed=await activeContext(page);
 await holdFilterUpdate(page);
 await (await requestFilter(page)).click();
 await expect.poll(()=>filterHeld(page)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
 await expect.poll(async()=> (await activeContext(page)).view).toBe('home');
 await openCanonicalNotes(page);
 await expect.poll(async()=> (await activeContext(page)).selectedObject).toEqual(source);
 expect((await activeContext(page)).revision).toBeGreaterThan(reviewed.revision);
 await releaseFilter(page);
 await expect.poll(async()=> (await actionState(page)).journal).toEqual([['terminal','failed']]);
 await expect(rows(page)).toHaveCount(2);
 await expect(list(page).getByRole('button',{name:'Clear filter',exact:true})).toHaveCount(0);
 await canonicalStateUnchanged(page);
 expect(foreign).toEqual([]);
 expect(errors).toEqual([]);
});
