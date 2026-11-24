import {openLegacyNotes} from './helpers/legacy-notes';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';
test.describe.configure({timeout:60_000});
type Stage='row'|'tombstone'|'trashed'|'recording-trashed-first'|'recording-erased-first';
const savedRecords=(page:Page)=>page.evaluate(async()=>JSON.parse(await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw()).records as any[]);
const tombstones=(page:Page)=>page.evaluate(async()=>JSON.parse(await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw()).deleted as any[]);
const trashEntries=(page:Page)=>page.evaluate(async()=>(await (await import('/src/runtime/notes-trash.ts')).readNotesTrash()).entries as any[]);
const pendingDeletions=(page:Page)=>page.evaluate(async()=>Object.values(await (await import('/src/runtime/note-audio-deletions.ts')).pendingAudioDeletions()) as any[]);
const describeAudio=(page:Page,audioId:string)=>page.evaluate(async audioId=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return registerPlugin<any>('AlphaNoteAudio').describe({audioId});},audioId);
const audioBytes=(page:Page,audioId:string)=>page.evaluate(async audioId=>(await (await import('/src/browser/note-audio-store.ts')).audioRecord(audioId,true)).blob.size,audioId);
async function openNotes(page:Page){await openLegacyNotes(page);await expect(page.getByRole('button',{name:'New note',exact:true})).toBeEnabled();}
async function restartWithRetainedSource(page:Page){
 const before={notes:await savedRecords(page),deleted:await tombstones(page),pending:await pendingDeletions(page)};
 const audio=await Promise.all(before.pending.map(row=>describeAudio(page,row.audioId)));
 await page.reload();
 await expect(page.getByRole('button',{name:'Notes',exact:true})).toBeVisible();
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 expect(await savedRecords(page)).toEqual(before.notes);expect(await tombstones(page)).toEqual(before.deleted);expect(await pendingDeletions(page)).toEqual(before.pending);
 for(let i=0;i<before.pending.length;i++)expect(await describeAudio(page,before.pending[i].audioId)).toEqual(audio[i]);
 await openNotes(page);await returnToApps(page);
}
async function start(page:Page){
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
}
async function seedVoice(page:Page,noteId:string,audioId:string,title:string,words:string){
 await page.evaluate(async({noteId,audioId,title,words})=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {retainAudio}=await import('/src/browser/note-audio-store.ts');
  const audio=await retainAudio(audioId,noteId,words,{blob:new Blob(['synthetic'],{type:'audio/wav'}),durationMs:1000});
  const store=await openBrowserNotes();
  await store.replace([...store.list,{id:noteId,kind:'voice',title,body:words,audio,dur:1,lines:[],summary:[],actions:[]}]);
 },{noteId,audioId,title,words});
}
async function interrupt(page:Page,noteId:string,stage:Stage){
 return page.evaluate(async({noteId,stage})=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');
  const deletions=await import('/src/runtime/note-audio-deletions.ts');
  const audio=await import('/src/browser/note-audio-store.ts');
  const store=await openBrowserNotes(),note=store.list.find((n:any)=>n.id===noteId) as any;
  const row={id:crypto.randomUUID(),target:await store.target(noteId),note,audioId:note.audio.audioId,permanent:true as const};
  await ((window as any).deletionLockHeld??=new Promise<void>(held=>void navigator.locks.request('alpha.notes-audio-effects.v1',()=>{held();return new Promise(()=>{});})));
  await deletions.changeAudioDeletion(row as any,true);
  if(stage==='tombstone'||stage==='trashed')await store.execute({type:'notes_delete',target:row.target} as any,row.id,new AbortController().signal,()=>{});
  if(stage!=='row'&&stage!=='tombstone')await audio.changeAudioDeleted(row.audioId,noteId,true,row.id);
  if(stage==='recording-erased-first')await audio.purgeAudio(row.audioId,noteId,row.id);
  return row.id;
 },{noteId,stage});
}
async function expectNoReview(page:Page){
 await openNotes(page);
 await expect(page.getByRole('button',{name:'Check deletion status',exact:true})).toHaveCount(0);
 await expect(page.getByText('Voice note deletion not confirmed.',{exact:false})).toHaveCount(0);
}

test('death after the tombstone commit, before the recording moved: explicit source activation finishes the erase for that recording only',async({page})=>{
 await start(page);
 await seedVoice(page,'cut-voice','cut-audio','Cut memo','Interrupted words');
 await seedVoice(page,'other-voice','other-audio','Other memo','Words to keep');
 const other=(await savedRecords(page)).find(n=>n.id==='other-voice');
 const operation=await interrupt(page,'cut-voice','tombstone');
 expect((await savedRecords(page)).map(n=>n.id)).toEqual(['other-voice']);
 expect((await tombstones(page)).map(d=>[d.id,d.operationId])).toEqual([['cut-voice',operation]]);
 expect((await pendingDeletions(page)).map(row=>[row.id,row.note.id,row.audioId,row.permanent])).toEqual([[operation,'cut-voice','cut-audio',true]]);
 const live=await describeAudio(page,'cut-audio');
 expect(live.transcript).toBe('Interrupted words');expect(live.deletedAt).toBeUndefined();expect(live.deletionOperations).toBeUndefined();

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 const erased=await describeAudio(page,'cut-audio');
 expect(erased.noteId).toBe('cut-voice');expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);
 expect(erased.deletionOperations).toEqual({[operation]:'purged'});expect(erased.activeDeletionOperation).toBe(operation);
 expect(await audioBytes(page,'cut-audio')).toBe(0);
 expect(await savedRecords(page)).toEqual([other]);
 const kept=await describeAudio(page,'other-audio');
 expect(kept.transcript).toBe('Words to keep');expect(kept.deletedAt).toBeUndefined();expect(kept.deletionOperations).toBeUndefined();
 expect(await audioBytes(page,'other-audio')).toBeGreaterThan(0);
 expect(await trashEntries(page)).toEqual([]);
 await expectNoReview(page);
 await expect(page.getByRole('button',{name:'Open Other memo',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open Cut memo',exact:true})).toHaveCount(0);
 await restartWithRetainedSource(page);
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 expect((await describeAudio(page,'cut-audio')).deletionOperations).toEqual({[operation]:'purged'});
 expect(await savedRecords(page)).toEqual([other]);
});

test('death after the recording reached the audio trash, before its erase: explicit source activation erases it',async({page})=>{
 await start(page);
 await seedVoice(page,'held-voice','held-audio','Held memo','Held words');
 const operation=await interrupt(page,'held-voice','trashed');
 const held=await describeAudio(page,'held-audio');
 expect(held.transcript).toBe('Held words');expect(held.deletionOperations).toEqual({[operation]:'removed'});
 expect((await pendingDeletions(page)).map(row=>row.id)).toEqual([operation]);

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 const erased=await describeAudio(page,'held-audio');
 expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);expect(erased.deletionOperations).toEqual({[operation]:'purged'});
 expect(await savedRecords(page)).toEqual([]);
 await expectNoReview(page);
});

test('death before the tombstone commit: explicit source activation rolls back with the note and recording unchanged',async({page})=>{
 await start(page);
 await seedVoice(page,'kept-voice','kept-audio','Kept memo','Never deleted');
 const before=await savedRecords(page),audioBefore=await describeAudio(page,'kept-audio');
 await interrupt(page,'kept-voice','row');
 expect((await pendingDeletions(page)).map(row=>[row.note.id,row.permanent])).toEqual([['kept-voice',true]]);

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 expect(await savedRecords(page)).toEqual(before);
 expect(await tombstones(page)).toEqual([]);
 expect(await describeAudio(page,'kept-audio')).toEqual(audioBefore);
 expect(await audioBytes(page,'kept-audio')).toBeGreaterThan(0);
 await expectNoReview(page);
 await expect(page.getByRole('button',{name:'Open Kept memo',exact:true})).toBeVisible();
});

test('the other order: a recording moved or erased before its note was deleted is rolled back or finished for that exact note',async({page})=>{
 await start(page);
 await seedVoice(page,'moved-voice','moved-audio','Moved memo','Moved words');
 await seedVoice(page,'erased-voice','erased-audio','Erased memo','Erased words');
 await seedVoice(page,'bystander-voice','bystander-audio','Bystander memo','Bystander words');
 const before=await savedRecords(page);
 const moved=await interrupt(page,'moved-voice','recording-trashed-first');
 const erasedOperation=await interrupt(page,'erased-voice','recording-erased-first');
 expect((await savedRecords(page)).length).toBe(3);
 expect((await pendingDeletions(page)).map(row=>row.id).sort()).toEqual([moved,erasedOperation].sort());
 expect((await describeAudio(page,'moved-audio')).deletionOperations).toEqual({[moved]:'removed'});
 expect((await describeAudio(page,'erased-audio')).deletionOperations).toEqual({[erasedOperation]:'purged'});

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 const restored=await describeAudio(page,'moved-audio');
 expect(restored.deletedAt).toBeUndefined();expect(restored.activeDeletionOperation).toBeUndefined();
 expect(restored.transcript).toBe('Moved words');expect(restored.deletionOperations).toEqual({[moved]:'restored'});
 expect(await audioBytes(page,'moved-audio')).toBeGreaterThan(0);
 expect((await savedRecords(page))).toEqual(before.filter(n=>n.id!=='erased-voice'));
 expect((await tombstones(page)).map(d=>[d.id,d.operationId])).toEqual([['erased-voice',erasedOperation]]);
 expect((await describeAudio(page,'erased-audio')).deletionOperations).toEqual({[erasedOperation]:'purged'});
 const bystander=await describeAudio(page,'bystander-audio');
 expect(bystander.transcript).toBe('Bystander words');expect(bystander.deletionOperations).toBeUndefined();
 await expectNoReview(page);
 await expect(page.getByRole('button',{name:'Open Moved memo',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open Erased memo',exact:true})).toHaveCount(0);
});

test('source activation never erases a recording that a different or a restored note owns; those deletions stay under review',async({page})=>{
 await start(page);
 await seedVoice(page,'shared-voice','shared-audio','Shared memo','Shared words');
 await seedVoice(page,'edited-voice','edited-audio','Edited memo','First words');
 await seedVoice(page,'changed-voice','changed-audio','Changed memo','Before the edit');
 await seedVoice(page,'undone-voice','undone-audio','Undone memo','Restored words');
 const shared=await interrupt(page,'shared-voice','tombstone');
 const edited=await interrupt(page,'edited-voice','tombstone');
 const changed=await interrupt(page,'changed-voice','recording-erased-first');
 const undone=await interrupt(page,'undone-voice','trashed');
 const undoneNote=(await pendingDeletions(page)).find(row=>row.id===undone).note;
 await page.evaluate(async({undone})=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const audio=await import('/src/browser/note-audio-store.ts');
  const store=await openBrowserNotes();
  await store.replace([
   ...store.list.map((n:any)=>n.id==='changed-voice'?{...n,body:'After the edit'}:n),
   {id:'adopter',kind:'voice',title:'Adopter memo',body:'Adopted',audio:{audioId:'shared-audio',noteId:'adopter',durationMs:1000,transcript:'Shared words'},dur:1,lines:[],summary:[],actions:[]},
   {id:'edited-voice',kind:'voice',title:'Edited memo',body:'Second words',audio:{audioId:'edited-audio',noteId:'edited-voice',durationMs:1000,transcript:'First words'},dur:1,lines:[],summary:[],actions:[]},
  ]);
  await audio.changeAudioDeleted('undone-audio','undone-voice',false,undone);
 },{undone});
 const before=await savedRecords(page);

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await openNotes(page);
 await expect(page.getByRole('button',{name:'Check deletion status',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Check deletion status',exact:true}).click();
 await expect.poll(async()=>(await pendingDeletions(page)).map(row=>row.id).sort()).toEqual([shared,edited,changed,undone].sort());
 expect(await savedRecords(page)).toEqual(before);
 for(const [audioId,words] of [['shared-audio','Shared words'],['edited-audio','First words'],['undone-audio','Restored words']]){
  const audio=await describeAudio(page,audioId);
  expect(audio.transcript).toBe(words);expect(audio.deletedAt).toBeUndefined();expect(audio.expired).toBeUndefined();
  expect(await audioBytes(page,audioId)).toBeGreaterThan(0);
 }
 expect((await describeAudio(page,'shared-audio')).deletionOperations).toBeUndefined();
 expect((await describeAudio(page,'edited-audio')).deletionOperations).toBeUndefined();
 expect((await describeAudio(page,'undone-audio')).deletionOperations).toEqual({[undone]:'restored'});
 expect((await savedRecords(page)).find(n=>n.id==='changed-voice').body).toBe('After the edit');
 expect((await tombstones(page)).some(d=>d.id==='changed-voice')).toBe(false);

 const review=page.getByRole('status').filter({hasText:'Voice note deletion not confirmed.'});
 await review.locator('div',{hasText:'Undone memo'}).getByRole('button',{name:'Restore note and recording',exact:true}).click();
 await expect(page.getByText('Voice note restored.',{exact:true})).toBeVisible();
 await expect.poll(async()=>(await pendingDeletions(page)).map(row=>row.id).sort()).toEqual([shared,edited,changed].sort());
 expect((await savedRecords(page)).find(n=>n.id==='undone-voice')).toEqual(undoneNote);
 const back=await describeAudio(page,'undone-audio');
 expect(back.transcript).toBe('Restored words');expect(back.deletedAt).toBeUndefined();
});

async function lowerEntryLimit(page:Page,limit:number){
 await page.route(/\/src\/runtime\/notes-trash-policy\.ts(\?.*)?$/,async route=>{
  const response=await route.fetch(),source=await response.text();
  const body=source.replace(/(NOTES_TRASH_MAX_ENTRIES\s*=\s*)[^;]+;/,`$1${limit};`);
  if(body===source)throw Error('Notes Trash entry limit was not found in the served module');
  await route.fulfill({response,body});
 });
}
const lockIdle=(page:Page)=>expect.poll(()=>page.evaluate(async()=>{const locks=await navigator.locks.query();return [...(locks.held||[]),...(locks.pending||[])].filter(lock=>lock.name==='alpha.notes-audio-effects.v1').length;})).toBe(0);
async function afterPass(page:Page,trigger:()=>Promise<unknown>){
 await lockIdle(page);
 const seen=await page.evaluate(()=>(window as any).recordingReads as number);
 await trigger();
 await expect.poll(()=>page.evaluate(()=>(window as any).recordingReads as number)).toBeGreaterThan(seen);
 await lockIdle(page);
}

test('a permanent deletion that fails inside the process that started it is never settled by that process: a tombstone that lands late keeps its recovery row, and the next start finishes the erase',async({page})=>{
 await lowerEntryLimit(page,1);
 await start(page);
 await seedVoice(page,'late-voice','late-audio','Late memo','Late words');
 await seedVoice(page,'bystander-voice','bystander-audio','Bystander memo','Bystander words');
 await restartWithRetainedSource(page);await openNotes(page);
 await page.getByRole('button',{name:'New note',exact:true}).click();
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Filler');
 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await page.getByRole('button',{name:'Open Filler',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open Late memo',exact:true}).click();
 await page.evaluate(async()=>{
  const {DocumentNotesStore}=await import('/src/runtime/browser-notes-document.ts');const {BrowserVoice}=await import('/src/browser/voice.ts');
  const execute=DocumentNotesStore.prototype.execute,describe=BrowserVoice.prototype.describe;
  (window as any).recordingReads=0;
  BrowserVoice.prototype.describe=async function(input:any){(window as any).recordingReads++;return describe.call(this,input);};
  DocumentNotesStore.prototype.execute=async function(...args:any[]){
   if(args[0]?.type!=='notes_delete'||(window as any).landTombstone)return execute.apply(this,args as any);
   const store=this;(window as any).landTombstone=()=>execute.call(store,args[0],args[1],new AbortController().signal,()=>{});
   throw Error('Notes reply lost');
  };
 });
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await page.getByRole('dialog',{name:'Full'}).getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:"Voice note deletion not confirmed. Check Notes. It won't be repeated."}).first()).toBeVisible();
 const before=await pendingDeletions(page);
 expect(before.map(row=>[row.note.id,row.audioId,row.permanent,row.audioRequested])).toEqual([['late-voice','late-audio',true,undefined]]);
 const operation=before[0].id as string;
 expect((await savedRecords(page)).some(n=>n.id==='late-voice')).toBe(true);
 expect(await tombstones(page)).toEqual([]);

 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await expect(page.getByRole('button',{name:'Check deletion status',exact:true})).toBeVisible();
 await afterPass(page,()=>page.getByRole('button',{name:'Check deletion status',exact:true}).click());
 expect(await pendingDeletions(page)).toEqual(before);
 await afterPass(page,()=>page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));}));
 expect(await pendingDeletions(page)).toEqual(before);
 const untouched=await describeAudio(page,'late-audio');
 expect(untouched.transcript).toBe('Late words');expect(untouched.deletedAt).toBeUndefined();expect(untouched.deletionOperations).toBeUndefined();

 await page.evaluate(()=>(window as any).landTombstone());
 expect((await tombstones(page)).map(d=>[d.id,d.operationId])).toEqual([['late-voice',operation]]);
 expect((await savedRecords(page)).map(n=>n.id)).toEqual(['bystander-voice']);
 await afterPass(page,()=>page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));}));
 const during=await describeAudio(page,'late-audio');
 if(during.deletionOperations?.[operation]!=='purged')expect((await pendingDeletions(page)).map(row=>[row.id,row.note.id,row.audioId])).toEqual([[operation,'late-voice','late-audio']]);

 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 const erased=await describeAudio(page,'late-audio');
 expect(erased.noteId).toBe('late-voice');expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);
 expect(erased.deletionOperations).toEqual({[operation]:'purged'});
 expect(await audioBytes(page,'late-audio')).toBe(0);
 const kept=await describeAudio(page,'bystander-audio');
 expect(kept.transcript).toBe('Bystander words');expect(kept.deletedAt).toBeUndefined();expect(kept.deletionOperations).toBeUndefined();
 expect((await savedRecords(page)).map(n=>n.id)).toEqual(['bystander-voice']);
 expect((await trashEntries(page)).map(entry=>entry.note.title)).toEqual(['Filler']);
 await expectNoReview(page);
});

test('a recording that another finisher erased under the same operation while this pass was moving it is confirmed and the row retired, not left under review',async({page})=>{
 await start(page);
 await seedVoice(page,'raced-voice','raced-audio','Raced memo','Raced words');
 await seedVoice(page,'bystander-voice','bystander-audio','Bystander memo','Bystander words');
 const operation=await interrupt(page,'raced-voice','tombstone');
 let rewritten=0;
 await page.route(/\/src\/browser\/voice\.ts(\?.*)?$/,async route=>{
  const response=await route.fetch(),source=await response.text();
  const body=source.replace(/(await changeAudioDeleted\(input\.audioId,\s*input\.noteId,\s*true,\s*input\.operationId\);)/,'$1await purgeAudio(input.audioId,input.noteId,input.operationId);');
  if(body===source)throw Error('The recording move was not found in the served module');
  rewritten++;await route.fulfill({response,body});
 });
 await restartWithRetainedSource(page);
 await expect(page.locator('html')).not.toHaveAttribute('data-active-view','notes');
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 expect(rewritten).toBeGreaterThan(0);
 const erased=await describeAudio(page,'raced-audio');
 expect(erased.noteId).toBe('raced-voice');expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);
 expect(erased.deletionOperations).toEqual({[operation]:'purged'});expect(erased.activeDeletionOperation).toBe(operation);
 expect(await audioBytes(page,'raced-audio')).toBe(0);
 expect((await savedRecords(page)).map(n=>n.id)).toEqual(['bystander-voice']);
 const kept=await describeAudio(page,'bystander-audio');
 expect(kept.transcript).toBe('Bystander words');expect(kept.deletedAt).toBeUndefined();expect(kept.deletionOperations).toBeUndefined();
 await expectNoReview(page);
});
