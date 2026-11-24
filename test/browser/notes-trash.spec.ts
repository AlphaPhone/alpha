import {toastObservation,finishUndoWindow} from './helpers/undo-feedback';
import {openLegacyNotes} from './helpers/legacy-notes';
import { returnToApps } from './app-navigation';
import {test,expect,type Page} from '@playwright/test';
const DAY=24*60*60*1000;
const savedRecords=(page:Page)=>page.evaluate(async()=>JSON.parse(await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw()).records);
const trashEntries=(page:Page)=>page.evaluate(async()=>(await (await import('/src/runtime/notes-trash.ts')).readNotesTrash()).entries);
const openNotes=openLegacyNotes;
async function createNote(page:Page,title:string,body:string){
 await page.getByRole('button',{name:'New note',exact:true}).click();
 await page.getByRole('textbox',{name:'Title',exact:true}).fill(title);
 await page.getByRole('textbox',{name:'Note',exact:true}).fill(body);
 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await expect(page.getByRole('button',{name:`Open ${title}`,exact:true})).toBeVisible();
}
async function deleteOpenNote(page:Page){
 await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
}
async function openDeleted(page:Page){await page.getByRole('button',{name:'Recently deleted',exact:true}).click();}
async function recover(page:Page,title:string,left:string){
 await page.getByRole('button',{name:`${title}, ${left}`,exact:true}).click();
 await page.getByRole('dialog',{name:title}).getByRole('button',{name:'Recover',exact:true}).click();
}
async function deleteNote(page:Page,title:string){
 await page.getByRole('button',{name:`Open ${title}`,exact:true}).click();
 await deleteOpenNote(page);
 await expect(page.getByText('Deleted',{exact:true}).last()).toBeVisible();
 await expect(page.getByRole('button',{name:`Open ${title}`,exact:true})).toHaveCount(0);
}

test('deleted notes survive a restart in Recently deleted, restore with the same identity, and Undo still works',async({page})=>{
 await page.goto('/');await openNotes(page);
 await createNote(page,'Trash audit','Keep this exact text.\nSecond line.');
 await createNote(page,'Second note','Unrelated');
 const before=(await savedRecords(page)).find((n:any)=>n.title==='Trash audit');
 const revision=await page.evaluate(async id=>{const m=await import('/src/runtime/browser-notes-document.ts');return (await (await m.openBrowserNotes()).target(id)).revision;},before.id);

 await deleteNote(page,'Second note');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open Second note',exact:true})).toBeVisible();
 await expect.poll(()=>trashEntries(page).then(e=>e.length)).toBe(0);

 await deleteNote(page,'Trash audit');
 expect((await savedRecords(page)).some((n:any)=>n.id===before.id)).toBe(false);
 await page.reload();await openNotes(page);
 await expect(page.getByRole('button',{name:'Open Trash audit',exact:true})).toHaveCount(0);
 await openDeleted(page);
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByRole('heading',{name:'Recently deleted',exact:true})).toBeVisible();
 await expect(trash.getByText('Trash audit',{exact:true})).toBeVisible();
 await expect(trash.getByText('30d',{exact:true})).toBeVisible();
 await expect(trash.getByText(/Deleted notes stay here/)).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('notes-trash.png')});
 await recover(page,'Trash audit','30 days left');
 await expect(page.getByText('Trash audit restored',{exact:true})).toBeVisible();
 await expect(trash).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Recently deleted',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Open Trash audit',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Note',exact:true})).toHaveValue('Keep this exact text.\nSecond line.');
 expect((await savedRecords(page)).find((n:any)=>n.id===before.id)).toEqual(before);
 expect(await page.evaluate(async id=>{const m=await import('/src/runtime/browser-notes-document.ts');return (await (await m.openBrowserNotes()).target(id)).revision;},before.id)).toBe(revision);
 expect(await trashEntries(page)).toEqual([]);
});

test('Delete now and Empty ask first, and checklists use the same Recently deleted',async({page})=>{
 await page.clock.install();
 await page.goto('/');await openNotes(page);
 await createNote(page,'First','One');await createNote(page,'Second','Two');
 await page.getByRole('button',{name:'Open Second',exact:true}).click();
 await page.getByRole('button',{name:'Turn into checklist',exact:true}).click();
 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await createNote(page,'Third','Three');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 for(const title of ['First','Second','Third'])await deleteNote(page,title);
 await openDeleted(page);
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByText('☐ Two',{exact:true})).toBeVisible();
 const askDelete=async()=>{await trash.getByRole('button',{name:'First, 30 days left',exact:true}).click();await page.getByRole('dialog',{name:'First'}).getByRole('button',{name:'Delete now',exact:true}).click();};
 await askDelete();
 const confirm=page.getByRole('dialog',{name:'Delete “First”?'});
 await expect(confirm).toContainText('This can’t be undone.');
 await confirm.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(trash.getByText('First',{exact:true})).toBeVisible();
 await askDelete();
 await page.getByRole('dialog',{name:'Delete “First”?'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect.poll(async()=>{const state=await toastObservation(page);return state.queued.some(notice=>!notice.undo&&notice.text==='Deleted');}).toBe(true);
 expect((await trashEntries(page)).map((entry:any)=>entry.note.title).sort()).toEqual(['Second','Third']);
 expect(await savedRecords(page)).toEqual([]);
 await expect.poll(async()=>{const state=await toastObservation(page);return Number(state.undo)+state.queued.filter(notice=>notice.undo).length;}).toBe(3);
 for(let offer=0;offer<3;offer++)await finishUndoWindow(page);
 await expect(page.getByRole('button',{name:'Undo',exact:true})).toHaveCount(0,{timeout:10000});await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await expect(trash.getByText('First',{exact:true})).toHaveCount(0);
 expect((await trashEntries(page)).map((e:any)=>e.note.title).sort()).toEqual(['Second','Third']);
 await trash.getByRole('button',{name:'Empty Recently deleted',exact:true}).click();
 await page.getByRole('dialog',{name:'Delete all?'}).getByRole('button',{name:'Delete all',exact:true}).click();
 await expect(page.getByText('Recently deleted emptied',{exact:true})).toBeVisible();
 await expect(trash).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Recently deleted',exact:true})).toHaveCount(0);
 expect(await trashEntries(page)).toEqual([]);
 expect(await page.evaluate(async()=>JSON.stringify((await (await import('/src/browser/documents.ts')).browserDocuments.read('alpha.browser.notes-trash.v1'))??null).includes('Three'))).toBe(false);
});

test('canonical startup preserves unselected legacy Trash; Older notes purges exactly at 30 days',async({page})=>{
 const t0=Date.UTC(2026,9,7,12);
 await page.clock.install({time:t0});
 await page.goto('/');await openNotes(page);
 await createNote(page,'Expiring','Gone after thirty days');await createNote(page,'Later','Deleted a day later');
 await deleteNote(page,'Expiring');
 const deletedAt=(await trashEntries(page))[0].deletedAt;
 await page.clock.setSystemTime(deletedAt+DAY);
 await deleteNote(page,'Later');
 await expect.poll(async()=>({
  trash:(await trashEntries(page)).map(entry=>entry.note.title).sort(),
  saved:(await savedRecords(page)).map((note:{title:string})=>note.title),
 })).toEqual({trash:['Expiring','Later'],saved:[]});

 await page.clock.setSystemTime(deletedAt+30*DAY-60_000);
 await page.reload();await openNotes(page);
 await openDeleted(page);
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByRole('button',{name:'Expiring, 1 day left',exact:true})).toBeVisible();
 await expect(trash.getByRole('button',{name:'Later, 2 days left',exact:true})).toBeVisible();

 await page.clock.setSystemTime(deletedAt+30*DAY+60_000);
 await returnToApps(page);
 await openNotes(page);
 await expect.poll(()=>trashEntries(page).then(e=>e.map((x:any)=>x.note.title))).toEqual(['Later']);
 await openDeleted(page);
 await expect(trash.getByText('Expiring',{exact:true})).toHaveCount(0);
 await expect(trash.getByText('Later',{exact:true})).toBeVisible();
 expect(await page.evaluate(async()=>JSON.stringify((await (await import('/src/browser/documents.ts')).browserDocuments.read('alpha.browser.notes-trash.v1'))??null).includes('Gone after thirty days'))).toBe(false);

 const retained=await page.evaluate(async()=>({
  notes:await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw(),
  trash:await(await import('/src/browser/documents.ts')).browserDocuments.read('alpha.browser.notes-trash.v1'),
 }));
 expect((await trashEntries(page)).map((entry:any)=>entry.note.title)).toEqual(['Later']);
 await page.clock.setSystemTime(deletedAt+31*DAY+60_000);
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 expect(await page.evaluate(async()=>({
  notes:await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw(),
  trash:await(await import('/src/browser/documents.ts')).browserDocuments.read('alpha.browser.notes-trash.v1'),
 }))).toEqual(retained);
 expect((await trashEntries(page)).map((entry:any)=>entry.note.title)).toEqual(['Later']);
 await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 await page.reload();await openNotes(page);
 expect(await trashEntries(page)).toEqual([]);
 expect((await savedRecords(page)).map((n:any)=>n.title)).toEqual([]);
});

test('voice notes share Recently deleted: the recording restores with its note and is erased at 30 days',async({page})=>{
 const t0=Date.UTC(2026,9,7,12);
 await page.clock.install({time:t0});
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {retainAudio}=await import('/src/browser/note-audio-store.ts');
  const audio=await retainAudio('trash-audio','trash-voice','Spoken words',{blob:new Blob(['synthetic'],{type:'audio/wav'}),durationMs:1000});
  await (await openBrowserNotes()).replace([{id:'trash-voice',kind:'voice',title:'Voice memo',body:'Spoken words',audio,dur:1,lines:[],summary:[],actions:[]}]);
 });
 const describe=()=>page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return registerPlugin<any>('AlphaNoteAudio').describe({audioId:'trash-audio'});});
 await page.reload();await openNotes(page);
 const original=(await savedRecords(page)).find((n:any)=>n.id==='trash-voice');
 const revision=()=>page.evaluate(async()=>{const m=await import('/src/runtime/browser-notes-document.ts');return (await (await m.openBrowserNotes()).target('trash-voice')).revision;});
 const originalRevision=await revision();
 const remove=async()=>{
  await page.getByRole('button',{name:'Open Voice memo',exact:true}).click();
  await deleteOpenNote(page);
  await expect(page.getByText('Deleted',{exact:true}).last()).toBeVisible();
  await expect.poll(async()=>(await describe()).deletedAt).toBeGreaterThan(0);
 };
 await remove();
 await page.reload();await openNotes(page);
 await openDeleted(page);
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByText('30d',{exact:true})).toBeVisible();
 await recover(page,'Voice memo','30 days left');
 await expect(page.getByText('Voice note restored.',{exact:true})).toBeVisible();
 await expect(trash).toHaveCount(0);
 expect((await describe()).deletedAt).toBeUndefined();
 expect((await savedRecords(page)).find((n:any)=>n.id==='trash-voice')).toEqual(original);
 expect(await revision()).toBe(originalRevision);

 await remove();
 const deletedAt=(await trashEntries(page))[0].deletedAt;
 await page.clock.setSystemTime(deletedAt+30*DAY+60_000);
 await returnToApps(page);await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 const erased=await describe();
 expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);
 expect(Object.values(erased.deletionOperations)).toContain('purged');
 const op=Object.entries(erased.deletionOperations).find(([,v])=>v==='purged')![0];
 expect(await page.evaluate(async op=>{const {registerPlugin}=await import('/src/platform-plugins.ts');try{await registerPlugin<any>('AlphaNoteAudio').restore({audioId:'trash-audio',noteId:'trash-voice',operationId:op});return 'restored';}catch{return 'refused';}},op)).toBe('refused');
});

test('an expired voice entry never erases a recording that a saved note still references',async({page})=>{
 const t0=Date.UTC(2026,9,7,12);
 await page.clock.install({time:t0});
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {retainAudio}=await import('/src/browser/note-audio-store.ts');
  const audio=await retainAudio('shared-audio','shared-voice','Shared words',{blob:new Blob(['synthetic'],{type:'audio/wav'}),durationMs:1000});
  await (await openBrowserNotes()).replace([{id:'shared-voice',kind:'voice',title:'Shared memo',body:'Shared words',audio,dur:1,lines:[],summary:[],actions:[]}]);
 });
 const describe=()=>page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return registerPlugin<any>('AlphaNoteAudio').describe({audioId:'shared-audio'});});
 await page.reload();await openNotes(page);
 await page.getByRole('button',{name:'Open Shared memo',exact:true}).click();
 await deleteOpenNote(page);
 await expect(page.getByText('Deleted',{exact:true}).last()).toBeVisible();
 await expect.poll(async()=>(await describe()).deletedAt).toBeGreaterThan(0);
 const entry=(await trashEntries(page))[0];
 await page.evaluate(async audio=>{const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const store=await openBrowserNotes();await store.replace([...store.list,{id:'other-voice',kind:'voice',title:'Other',body:'',audio,dur:1,lines:[],summary:[],actions:[]}]);},entry.note.audio);
 await page.clock.setSystemTime(entry.deletedAt+30*DAY+60_000);
 await page.reload();await openNotes(page);
 await openDeleted(page);
 await expect(page.locator('[data-alpha-subview="notes-trash"]').getByRole('button',{name:'Shared memo, Deleting permanently',exact:true})).toBeVisible();
 expect((await trashEntries(page)).map((e:any)=>e.id)).toEqual([entry.id]);
 const kept=await describe();
 expect(kept.transcript).toBe('Shared words');expect(kept.expired).toBeUndefined();
 expect(Object.values(kept.deletionOperations)).not.toContain('purged');
});

test('an approved agent deletion of a voice note moves its recording to Recently deleted with it',async({page})=>{
 await page.route(/\/src\/runtime\/connection-ui\.tsx(\?.*)?$/,async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text())+'\nwindow.__notesTrashTestExecutor=(...args)=>deviceExecutor(...args);\n'});
 });
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {retainAudio}=await import('/src/browser/note-audio-store.ts');
  const audio=await retainAudio('agent-audio','agent-voice','Agent words',{blob:new Blob(['synthetic'],{type:'audio/wav'}),durationMs:1000});
  await (await openBrowserNotes()).replace([{id:'agent-voice',kind:'voice',title:'Agent memo',body:'Agent words',audio,dur:1,lines:[],summary:[],actions:[]}]);
 });
 const describe=()=>page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return registerPlugin<any>('AlphaNoteAudio').describe({audioId:'agent-audio'});});
 await page.reload();await openNotes(page);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).__notesTrashTestExecutor)).toBe('function');
 const original=(await savedRecords(page)).find((n:any)=>n.id==='agent-voice');
 const operationId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
 const result=await page.evaluate(async operationId=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {alphaClient}=await import('/src/runtime/alpha-client.ts');
  const target=await (await openBrowserNotes()).target('agent-voice');
  return (window as any).__notesTrashTestExecutor({type:'notes_delete',target},operationId,structuredClone(alphaClient.getState().context),new AbortController().signal);
 },operationId);
 expect(result.status).toBe('succeeded');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('alpha:notes-committed')));
 await expect(page.getByRole('button',{name:'Open Agent memo',exact:true})).toHaveCount(0);
 expect((await savedRecords(page)).some((n:any)=>n.id==='agent-voice')).toBe(false);
 const trashed=await describe();
 expect(trashed.deletedAt).toBeGreaterThan(0);
 expect(trashed.activeDeletionOperation).toBe(operationId);
 expect(trashed.deletionOperations[operationId]).toBe('removed');
 const entries=await trashEntries(page);
 expect(entries.map((e:any)=>[e.id,e.audio?.audioId])).toEqual([[operationId,'agent-audio']]);
 expect(await page.evaluate(async()=>Object.keys(await (await import('/src/runtime/note-audio-deletions.ts')).pendingAudioDeletions()))).toEqual([]);

 await openDeleted(page);
 await recover(page,'Agent memo','30 days left');
 await expect(page.getByText('Voice note restored.',{exact:true})).toBeVisible();
 expect((await describe()).deletedAt).toBeUndefined();
 expect((await savedRecords(page)).find((n:any)=>n.id==='agent-voice')).toEqual(original);
 expect(await trashEntries(page)).toEqual([]);
});


test('an already open Recently deleted cannot restore a note after the retention deadline',async({page})=>{
 await page.clock.install({time:Date.UTC(2026,9,7,12)});
 await page.goto('/');await openNotes(page);
 await createNote(page,'Deadline','Must not return after expiry');await deleteNote(page,'Deadline');
 const entry=(await trashEntries(page))[0];
 await openDeleted(page);
 await page.getByRole('button',{name:'Deadline, 30 days left',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Deadline'}).getByRole('button',{name:'Recover',exact:true})).toBeVisible();
 await page.clock.setSystemTime(entry.deletedAt+30*DAY);
 await page.getByRole('dialog',{name:'Deadline'}).getByRole('button',{name:'Recover',exact:true}).click();
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 expect((await savedRecords(page)).some((note:any)=>note.id===entry.note.id)).toBe(false);
});
