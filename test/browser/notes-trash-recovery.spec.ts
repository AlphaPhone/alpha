import {expectPendingToast,finishUndoWindow} from './helpers/undo-feedback';
import {openLegacyNotes} from './helpers/legacy-notes';
import { returnToApps } from './app-navigation';
import {test,expect,type Page} from '@playwright/test';
async function rowAction(page:Page,title:string,action:'Recover'|'Delete now'){
 await page.locator('[data-alpha-subview="notes-trash"]').getByRole('button',{name:new RegExp(`^${title}, `)}).click();
 await page.getByRole('dialog',{name:`Recover or delete “${title}”?`,exact:true}).getByRole('button',{name:action,exact:true}).click();
}
async function deleteNow(page:Page,title:string){
 await rowAction(page,title,'Delete now');
 await page.getByRole('dialog',{name:`Delete “${title}”?`}).getByRole('button',{name:'Delete',exact:true}).click();
}
const DAY=24*60*60*1000;
const savedRecords=(page:Page)=>page.evaluate(async()=>JSON.parse(await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw()).records);
const trashEntries=(page:Page)=>page.evaluate(async()=>(await (await import('/src/runtime/notes-trash.ts')).readNotesTrash()).entries);
const pendingDeletions=(page:Page)=>page.evaluate(async()=>Object.values(await (await import('/src/runtime/note-audio-deletions.ts')).pendingAudioDeletions()));
const describeAudio=(page:Page,audioId:string)=>page.evaluate(async audioId=>{const {registerPlugin}=await import('/src/platform-plugins.ts');return registerPlugin<any>('AlphaNoteAudio').describe({audioId});},audioId);
async function openNotes(page:Page){await openLegacyNotes(page);await expect(page.getByRole('button',{name:'New note',exact:true})).toBeEnabled();}
async function createNote(page:Page,title:string,body:string){
 await page.getByRole('button',{name:'New note',exact:true}).click();
 await page.getByRole('textbox',{name:'Title',exact:true}).fill(title);
 await page.getByRole('textbox',{name:'Note',exact:true}).fill(body);
 await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await expect(page.getByRole('button',{name:`Open ${title}`,exact:true})).toBeVisible();
}
async function deleteNote(page:Page,title:string){
 await page.getByRole('button',{name:`Open ${title}`,exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:`Open ${title}`,exact:true})).toHaveCount(0);
 await expect.poll(async()=>(await trashEntries(page)).some((entry:{note:{title:string}})=>entry.note.title===title)).toBe(true);
}
async function lowerEntryLimit(page:Page,limit:number){
 let rewritten=0;
 await page.route(/\/src\/runtime\/notes-trash-policy\.ts(\?.*)?$/,async route=>{
  const response=await route.fetch(),source=await response.text();
  const body=source.replace(/(NOTES_TRASH_MAX_ENTRIES\s*=\s*)[^;]+;/,`$1${limit};`);
  if(body===source)throw Error('Notes Trash entry limit was not found in the served module');
  rewritten++;await route.fulfill({response,body});
 });
 return ()=>rewritten;
}
async function seedVoice(page:Page,noteId:string,audioId:string,title:string,words:string){
 await page.evaluate(async({noteId,audioId,title,words})=>{
  const {openBrowserNotes}=await import('/src/runtime/browser-notes-document.ts');const {retainAudio}=await import('/src/browser/note-audio-store.ts');
  const audio=await retainAudio(audioId,noteId,words,{blob:new Blob(['synthetic'],{type:'audio/wav'}),durationMs:1000});
  const store=await openBrowserNotes();
  await store.replace([...store.list,{id:noteId,kind:'voice',title,body:words,audio,dur:1,lines:[],summary:[],actions:[]}]);
 },{noteId,audioId,title,words});
}

test('Trash written under a larger limit stays readable, restorable and purgeable; a full Trash refuses without losing a note and offers a confirmed permanent delete',async({page})=>{
 test.setTimeout(90_000);
 await page.clock.install({time:Date.UTC(2026,9,7,12)});
 await page.goto('/');await openNotes(page);
 for(const title of ['Alpha','Bravo','Charlie','Delta','Echo'])await createNote(page,title,`${title} body, exact.`);
 const original=await savedRecords(page);
 for(const title of ['Alpha','Bravo','Charlie'])await deleteNote(page,title);
 const stored=await trashEntries(page);
 expect(stored.length).toBe(3);

 const rewritten=await lowerEntryLimit(page,2);
 await page.reload();await openNotes(page);
 expect(rewritten()).toBeGreaterThan(0);
 expect(await page.evaluate(async()=>(await import('/src/runtime/notes-trash-policy.ts')).NOTES_TRASH_MAX_ENTRIES)).toBe(2);
 expect(await trashEntries(page)).toEqual(stored);
 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 for(const title of ['Alpha','Bravo','Charlie'])await expect(trash.getByText(title,{exact:true})).toBeVisible();
 await expect(trash.getByText('Trash could not be read',{exact:false})).toHaveCount(0);
 await trash.getByRole('button',{name:'Back to notes',exact:true}).click();

 await page.getByRole('button',{name:'Open Delta',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 const full=page.getByRole('dialog',{name:'Full'});
 await expect(full.getByRole('button',{name:'Delete permanently',exact:true})).toBeVisible();await expect(full).not.toContainText('was not deleted');
 const editor=page.locator('[data-alpha-subview="notes-editor"]');
 expect(await editor.evaluate((element:HTMLElement)=>element.inert)).toBe(true);
 await expect(editor).toHaveAttribute('aria-hidden','true');
 expect(await full.evaluate((element:HTMLElement)=>!!element.closest('[inert]'))).toBe(false);
 expect((await savedRecords(page)).map((n:any)=>n.title).sort()).toEqual(['Delta','Echo']);
 expect(await trashEntries(page)).toEqual(stored);
 await page.screenshot({path:test.info().outputPath('notes-trash-full.png')});
 await full.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(full).toHaveCount(0);
 expect(await editor.evaluate((element:HTMLElement)=>element.inert)).toBe(false);
 await expect(page.getByRole('button',{name:'More',exact:true})).toBeFocused();
 await expect(page.getByRole('textbox',{name:'Note',exact:true})).toHaveValue('Delta body, exact.');
 expect((await savedRecords(page)).map((n:any)=>n.title).sort()).toEqual(['Delta','Echo']);

 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expect(page.getByText('Delta deleted forever',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Undo',exact:true})).toHaveCount(0);
 expect(await savedRecords(page)).toEqual(original.filter((n:any)=>n.title==='Echo'));
 expect(await trashEntries(page)).toEqual(stored);
 expect(await page.evaluate(async()=>JSON.stringify((await (await import('/src/browser/documents.ts')).browserDocuments.read('alpha.browser.notes-trash.v1'))??null).includes('Delta body'))).toBe(false);

 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 await rowAction(page,'Alpha','Recover');
 await expect(page.getByText('Alpha restored',{exact:true})).toBeVisible();
 expect((await savedRecords(page)).find((n:any)=>n.title==='Alpha')).toEqual(original.find((n:any)=>n.title==='Alpha'));
 expect((await trashEntries(page)).map((e:any)=>e.note.title).sort()).toEqual(['Bravo','Charlie']);
 await trash.getByRole('button',{name:'Back to notes',exact:true}).click();

 await page.getByRole('button',{name:'Open Echo',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await full.getByRole('button',{name:'Open Recently deleted',exact:true}).click();
 await expect(full).toHaveCount(0);
 await expect(trash.getByRole('heading',{name:'Recently deleted',exact:true})).toBeVisible();
 expect((await savedRecords(page)).map((n:any)=>n.title).sort()).toEqual(['Alpha','Echo']);
 await deleteNow(page,'Bravo');
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 expect((await trashEntries(page)).map((e:any)=>e.note.title)).toEqual(['Charlie']);
 await trash.getByRole('button',{name:'Back to notes',exact:true}).click();
 await deleteNote(page,'Echo');
 expect((await trashEntries(page)).map((e:any)=>e.note.title).sort()).toEqual(['Charlie','Echo']);

 const last=Math.max(...(await trashEntries(page)).map((e:any)=>e.deletedAt));
 await page.clock.setSystemTime(last+30*DAY+60_000);
 await returnToApps(page);await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 expect((await savedRecords(page)).map((n:any)=>n.title)).toEqual(['Alpha']);
});

test('a note edited after a full Trash refused it is not deleted by the earlier confirmation',async({page})=>{
 await page.clock.install();
 await lowerEntryLimit(page,1);
 await page.goto('/');await openNotes(page);
 await createNote(page,'Filler','Occupies Trash');await createNote(page,'Changing','First text');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await deleteNote(page,'Filler');
 await page.getByRole('button',{name:'Open Changing',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 const full=page.getByRole('dialog',{name:'Full'});
 await expect(full).toBeVisible();
 await page.evaluate(async()=>{const store=await (await import('/src/runtime/browser-notes-document.ts')).openBrowserNotes();await store.replace(store.list.map((n:any)=>n.title==='Changing'?{...n,body:'Newer text'}:n));});
 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expectPendingToast(page,'Note changed');
 expect((await savedRecords(page)).map((note:any)=>[note.title,note.body])).toEqual([['Changing','Newer text']]);
 expect((await trashEntries(page)).map((entry:any)=>entry.note.title)).toEqual(['Filler']);
 await finishUndoWindow(page);
 await expect(page.getByText('Note changed',{exact:true})).toBeVisible();
 await expect(full).toHaveCount(0);
 const saved=await savedRecords(page);
 expect(saved.map((n:any)=>[n.title,n.body])).toEqual([['Changing','Newer text']]);
 expect((await trashEntries(page)).map((e:any)=>e.note.title)).toEqual(['Filler']);
});

test('a permanent-delete confirmation in a stale view never drops the Trash copy another view wrote for that note',async({page})=>{
 await page.clock.install();
 await lowerEntryLimit(page,1);
 await page.goto('/');await openNotes(page);
 await createNote(page,'Filler','Occupies Trash');await createNote(page,'Moved','First text');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await deleteNote(page,'Filler');
 await page.getByRole('button',{name:'Open Moved',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 const full=page.getByRole('dialog',{name:'Full'});
 await expect(full).toBeVisible();
 const row=await page.evaluate(async()=>{
  const trash=await import('/src/runtime/notes-trash.ts');const store=await (await import('/src/runtime/browser-notes-document.ts')).openBrowserNotes();
  await store.replace(store.list.map((n:any)=>n.title==='Moved'?{...n,body:'Newer text, only in Trash'}:n));
  const index=store.list.findIndex((n:any)=>n.title==='Moved'),note=store.list[index];
  const entry={id:crypto.randomUUID(),note,target:await store.target(note.id),index,deletedAt:Date.now()};
  await trash.withNotesDeletionLock(async()=>{
   await trash.editNotesTrash(doc=>({version:1,entries:[entry,...doc.entries]} as any));
   await store.replace(store.list.filter((n:any)=>n.id!==note.id));
  });
  return entry;
 });
 expect((await savedRecords(page)).map((n:any)=>n.title)).toEqual([]);
 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expectPendingToast(page,'Note changed');
 expect((await trashEntries(page)).find((entry:any)=>entry.id===row.id)).toEqual(row);
 expect(await savedRecords(page)).toEqual([]);
 await finishUndoWindow(page);
 await expect(page.getByText('Note changed',{exact:true})).toBeVisible();
 const entries=await trashEntries(page);
 expect(entries.map((e:any)=>e.note.title).sort()).toEqual(['Filler','Moved']);
 expect(entries.find((e:any)=>e.id===row.id)).toEqual(row);
 expect(entries.find((e:any)=>e.id===row.id).note.body).toBe('Newer text, only in Trash');
});

test('a voice note refused by a full Trash is erased with its own recording only after separate confirmation',async({page})=>{
 await page.clock.install();
 await lowerEntryLimit(page,1);
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await seedVoice(page,'full-voice','full-audio','Full memo','Words to erase');
 await seedVoice(page,'other-voice','other-audio','Other memo','Words to keep');
 await page.reload();await openNotes(page);
 await createNote(page,'Filler','Occupies Trash');await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await deleteNote(page,'Filler');
 const filler=await trashEntries(page);

 await page.getByRole('button',{name:'Open Full memo',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 const full=page.getByRole('dialog',{name:'Full'});
 await expect(full.getByRole('button',{name:'Delete permanently',exact:true})).toBeVisible();await expect(full).not.toContainText('was not deleted');
 expect((await savedRecords(page)).some((n:any)=>n.id==='full-voice')).toBe(true);
 const untouched=await describeAudio(page,'full-audio');
 expect(untouched.deletedAt).toBeUndefined();expect(untouched.transcript).toBe('Words to erase');
 expect(await pendingDeletions(page)).toEqual([]);
 expect(await trashEntries(page)).toEqual(filler);

 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expectPendingToast(page,'Full memo and its recording deleted forever');
 expect((await savedRecords(page)).map((note:any)=>note.id)).toEqual(['other-voice']);
 expect((await describeAudio(page,'full-audio')).transcript).toBe('');
 expect(await pendingDeletions(page)).toEqual([]);expect(await trashEntries(page)).toEqual(filler);
 await finishUndoWindow(page);
 await expect(page.getByText('Full memo and its recording deleted forever',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Undo',exact:true})).toHaveCount(0);
 expect((await savedRecords(page)).map((n:any)=>n.id)).toEqual(['other-voice']);
 const erased=await describeAudio(page,'full-audio');
 expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);expect(erased.noteId).toBe('full-voice');
 expect(Object.values(erased.deletionOperations)).toEqual(['purged']);
 expect(await pendingDeletions(page)).toEqual([]);
 expect(await trashEntries(page)).toEqual(filler);
 const other=await describeAudio(page,'other-audio');
 expect(other.transcript).toBe('Words to keep');expect(other.deletedAt).toBeUndefined();expect(other.expired).toBeUndefined();
 await expect(page.getByRole('button',{name:'Check deletion status',exact:true})).toHaveCount(0);
});

test('a stale Trash row of a note that is then deleted permanently is dropped, so the note cannot be restored from Trash afterwards',async({page})=>{
 test.setTimeout(60_000);
 await page.clock.install();
 await lowerEntryLimit(page,1);
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await seedVoice(page,'stale-voice','stale-audio','Stale memo','Spoken, then erased');
 await page.reload();await openNotes(page);
 await createNote(page,'Filler','Occupies Trash');await createNote(page,'Stale text','Typed, then erased');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await deleteNote(page,'Filler');
 const filler=await trashEntries(page);
 await page.evaluate(async()=>{
  const trash=await import('/src/runtime/notes-trash.ts');const store=await (await import('/src/runtime/browser-notes-document.ts')).openBrowserNotes();
  const rows=await Promise.all(store.list.filter((n:any)=>n.title!=='Filler').map(async(note:any,index:number)=>({id:crypto.randomUUID(),note,target:await store.target(note.id),index,deletedAt:Date.now(),...(note.audio?{audio:{audioId:note.audio.audioId}}:{})})));
  await trash.withNotesDeletionLock(()=>trash.editNotesTrash(doc=>({version:1,entries:[...rows,...doc.entries]} as any)));
 });
 expect((await trashEntries(page)).map((e:any)=>e.note.title).sort()).toEqual(['Filler','Stale memo','Stale text']);
 const full=page.getByRole('dialog',{name:'Full'});

 await page.getByRole('button',{name:'Open Stale text',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expectPendingToast(page,'Stale text deleted forever');
 expect((await trashEntries(page)).map((entry:any)=>entry.note.title).sort()).toEqual(['Filler','Stale memo']);
 expect((await savedRecords(page)).some((note:any)=>note.title==='Stale text')).toBe(false);
 await finishUndoWindow(page);
 await expect(page.getByText('Stale text deleted forever',{exact:true})).toBeVisible();
 expect((await trashEntries(page)).map((e:any)=>e.note.title).sort()).toEqual(['Filler','Stale memo']);
 await page.clock.resume();

 await page.getByRole('button',{name:'Open Stale memo',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(full.getByRole('button',{name:'Delete permanently',exact:true})).toBeVisible();await expect(full).not.toContainText('was not deleted');
 await full.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expect(page.getByText('Stale memo and its recording deleted forever',{exact:true})).toBeVisible();
 expect(await trashEntries(page)).toEqual(filler);
 expect(await savedRecords(page)).toEqual([]);
 expect(await pendingDeletions(page)).toEqual([]);
 const erased=await describeAudio(page,'stale-audio');
 expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);
 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByText('Filler',{exact:true})).toBeVisible();
 await expect(trash.getByText('Stale memo',{exact:true})).toHaveCount(0);
 await expect(trash.getByText('Stale text',{exact:true})).toHaveCount(0);
});

test('an interrupted permanent voice deletion keeps a recovery row and finishes the erase after a restart',async({page})=>{
 await lowerEntryLimit(page,1);
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await seedVoice(page,'cut-voice','cut-audio','Cut memo','Interrupted words');
 await page.reload();await openNotes(page);
 await createNote(page,'Filler','Occupies Trash');await deleteNote(page,'Filler');
 await page.getByRole('button',{name:'Open Cut memo',exact:true}).click();
 await page.evaluate(async()=>{const {BrowserVoice}=await import('/src/browser/voice.ts');(window as any).purgeCalls=0;BrowserVoice.prototype.purge=async function(){(window as any).purgeCalls++;throw Error('Process stopped before the erase');};});
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await page.getByRole('dialog',{name:'Full'}).getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:"Voice note deletion not confirmed. Check Notes. It won't be repeated."}).first()).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).purgeCalls)).toBeGreaterThan(0);
 const pending:any[]=await pendingDeletions(page);
 expect(pending.map(row=>[row.note.id,row.audioId,row.permanent,row.audioRequested])).toEqual([['cut-voice','cut-audio',true,true]]);
 expect(pending[0].note.body).toBe('Interrupted words');
 expect((await savedRecords(page)).some((n:any)=>n.id==='cut-voice')).toBe(false);
 const held=await describeAudio(page,'cut-audio');
 expect(held.transcript).toBe('Interrupted words');expect(held.activeDeletionOperation).toBe(pending[0].id);expect(held.deletionOperations[pending[0].id]).toBe('removed');
 expect((await trashEntries(page)).map((e:any)=>e.note.title)).toEqual(['Filler']);

 await page.reload();await openNotes(page);
 await expect.poll(()=>pendingDeletions(page)).toEqual([]);
 const erased=await describeAudio(page,'cut-audio');
 expect(erased.transcript).toBe('');expect(erased.expired).toBe(true);expect(erased.deletionOperations[pending[0].id]).toBe('purged');
 expect((await savedRecords(page)).some((n:any)=>n.id==='cut-voice')).toBe(false);
 await expect(page.getByRole('button',{name:'Check deletion status',exact:true})).toHaveCount(0);
 await page.reload();await openNotes(page);
 expect(await pendingDeletions(page)).toEqual([]);
 expect((await describeAudio(page,'cut-audio')).deletionOperations[pending[0].id]).toBe('purged');
});

test('a clock moved backwards never purges early or extends the label, and the purge resumes at the original deadline after restarts',async({page})=>{
 const t0=Date.UTC(2026,9,7,12);
 await page.clock.install({time:t0});
 await page.goto('/');await openNotes(page);
 await createNote(page,'Clock note','Survives a wrong clock');
 const original=(await savedRecords(page))[0];
 await deleteNote(page,'Clock note');
 const entry=(await trashEntries(page))[0];

 await page.clock.setSystemTime(entry.deletedAt-10*DAY);
 await page.reload();await openNotes(page);
 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 const trash=page.locator('[data-alpha-subview="notes-trash"]');
 await expect(trash.getByRole('button',{name:'Clock note, 30 days left',exact:true})).toBeVisible();
 expect(await trashEntries(page)).toEqual([entry]);

 await page.clock.setSystemTime(entry.deletedAt+30*DAY-5*60_000);
 await page.reload();await openNotes(page);
 expect(await trashEntries(page)).toEqual([entry]);
 await page.getByRole('button',{name:'Recently deleted',exact:true}).click();
 await expect(trash.getByRole('button',{name:'Clock note, 1 day left',exact:true})).toBeVisible();

 await page.clock.setSystemTime(entry.deletedAt-DAY);
 await rowAction(page,'Clock note','Recover');
 await expect(page.getByText('Clock note restored',{exact:true})).toBeVisible();
 expect(await savedRecords(page)).toEqual([original]);
 await expect(trash).toHaveCount(0);

 await page.clock.setSystemTime(entry.deletedAt+DAY);
 await deleteNote(page,'Clock note');
 const second=(await trashEntries(page))[0];
 expect(second.id).not.toBe(entry.id);
 await page.clock.setSystemTime(second.deletedAt+30*DAY);
 await page.reload();
 await expect(page.getByRole('button',{name:'Notes',exact:true})).toBeVisible();
 expect(await trashEntries(page)).toEqual([second]);
 expect(await savedRecords(page)).toEqual([]);
 await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 expect(await savedRecords(page)).toEqual([]);
});

test('process death between the write-ahead Trash row and the deletion commit keeps the note; death after a recording erase but before the row is dropped converges',async({page})=>{
 const t0=Date.UTC(2026,9,7,12);
 await page.clock.install({time:t0});
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await seedVoice(page,'dead-voice','dead-audio','Dead memo','Spoken once');
 await page.reload();await openNotes(page);
 await createNote(page,'Uncommitted','Still saved');
 const live=(await savedRecords(page)).find((n:any)=>n.title==='Uncommitted');

 await page.evaluate(async note=>{
  const trash=await import('/src/runtime/notes-trash.ts');const store=await (await import('/src/runtime/browser-notes-document.ts')).openBrowserNotes();
  await trash.withNotesDeletionLock(async()=>trash.editNotesTrash(doc=>trash.addNotesTrashEntry(doc,{id:crypto.randomUUID(),note,target:undefined,index:0,deletedAt:Date.now()} as any)));
  void store;
 },live);
 expect((await trashEntries(page)).map((e:any)=>e.note.id)).toEqual([live.id]);
 const uncommittedTrash=await trashEntries(page);
 await page.clock.setSystemTime(t0+5*DAY);
 await page.reload();
 await expect(page.getByRole('button',{name:'Notes',exact:true})).toBeVisible();
 expect(await trashEntries(page)).toEqual(uncommittedTrash);
 expect((await savedRecords(page)).find((n:any)=>n.id===live.id)).toEqual(live);
 await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 expect((await savedRecords(page)).find((n:any)=>n.id===live.id)).toEqual(live);

 await page.getByRole('button',{name:'Open Dead memo',exact:true}).click();
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.getByText('Deleted',{exact:true})).toBeVisible();
 const entry=(await trashEntries(page))[0];
 expect(entry.audio).toEqual({audioId:'dead-audio'});
 await page.evaluate(async id=>{const {purgeAudio}=await import('/src/browser/note-audio-store.ts');await purgeAudio('dead-audio','dead-voice',id);},entry.id);
 expect((await trashEntries(page)).map((e:any)=>e.id)).toEqual([entry.id]);
 await page.clock.setSystemTime(entry.deletedAt+30*DAY+1000);
 await page.reload();
 await expect(page.getByRole('button',{name:'Notes',exact:true})).toBeVisible();
 expect(await trashEntries(page)).toEqual([entry]);
 await openNotes(page);
 await expect.poll(()=>trashEntries(page)).toEqual([]);
 const erased=await describeAudio(page,'dead-audio');
 expect(erased.expired).toBe(true);expect(erased.transcript).toBe('');expect(erased.deletionOperations[entry.id]).toBe('purged');
 expect((await savedRecords(page)).some((n:any)=>n.id==='dead-voice')).toBe(false);
 expect((await savedRecords(page)).find((n:any)=>n.id===live.id)).toEqual(live);
});

test('two views: a move to Trash from a stale view keeps the newer Trash row the other view wrote',async({browser})=>{
 const context=await browser.newContext();
 try{
  const first=await context.newPage(),second=await context.newPage();
  await first.goto('/');await openNotes(first);
  await createNote(first,'Kilo','Older text');
  await second.goto('/');await openNotes(second);
  await expect(second.getByRole('button',{name:'Open Kilo',exact:true})).toBeVisible();
  await first.getByRole('button',{name:'Open Kilo',exact:true}).click();
  await first.getByRole('textbox',{name:'Note',exact:true}).fill('Newer text, only in Trash');
  await first.getByRole('button',{name:'Back to notes',exact:true}).click();
  await expect.poll(async()=>(await savedRecords(first)).find((n:any)=>n.title==='Kilo')?.body).toBe('Newer text, only in Trash');
  await deleteNote(first,'Kilo');
  const newer=await trashEntries(first);
  expect(newer.map((e:any)=>e.note.body)).toEqual(['Newer text, only in Trash']);
  await second.getByRole('button',{name:'Open Kilo',exact:true}).click();
  await second.getByRole('button',{name:'More',exact:true}).click();await second.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
  await expect(second.getByText('Note changed',{exact:true})).toBeVisible();
  expect(await trashEntries(second)).toEqual(newer);
  expect((await savedRecords(second)).some((n:any)=>n.title==='Kilo')).toBe(false);
 }finally{await context.close();}
});

test('two views: a second tab never settles a permanent deletion the first open tab still shows under review',async({browser})=>{
 test.setTimeout(60_000);
 const context=await browser.newContext();
 try{
  await context.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
  const first=await context.newPage();
  await lowerEntryLimit(first,1);
  await first.goto('/');
  await seedVoice(first,'held-voice','held-audio','Held memo','Held words');
  await first.reload();await openNotes(first);
  await createNote(first,'Filler','Occupies Trash');await deleteNote(first,'Filler');
  await first.evaluate(async()=>{
   const {DocumentNotesStore}=await import('/src/runtime/browser-notes-document.ts');
   const execute=DocumentNotesStore.prototype.execute;
   DocumentNotesStore.prototype.execute=async function(...args:any[]){if(args[0]?.type==='notes_delete')throw Error('Notes reply lost');return execute.apply(this,args as any);};
  });
  await first.getByRole('button',{name:'Open Held memo',exact:true}).click();
  await first.getByRole('button',{name:'More',exact:true}).click();await first.getByRole('dialog',{name:'Note actions'}).getByRole('button',{name:'Delete',exact:true}).click();
  await first.getByRole('dialog',{name:'Full'}).getByRole('button',{name:'Delete permanently',exact:true}).click();
  await expect(first.getByRole('status').filter({hasText:"Voice note deletion not confirmed. Check Notes. It won't be repeated."}).first()).toBeVisible();
  const held=await pendingDeletions(first);
  expect(held.map((row:any)=>[row.note.id,row.permanent])).toEqual([['held-voice',true]]);
  expect(held[0].lease.until).toBeGreaterThan(Date.now());
  await first.getByRole('button',{name:'Back to notes',exact:true}).click();
  await expect(first.getByRole('button',{name:'Check deletion status',exact:true})).toBeVisible();

  const second=await context.newPage();
  await second.goto('/');await openNotes(second);
  await second.getByRole('button',{name:'Check deletion status',exact:true}).click();
  await expect.poll(()=>second.evaluate(async()=>{const locks=await navigator.locks.query();return [...(locks.held||[]),...(locks.pending||[])].filter(lock=>lock.name==='alpha.notes-audio-effects.v1').length;})).toBe(0);
  expect((await pendingDeletions(second)).map((row:any)=>row.id)).toEqual(held.map((row:any)=>row.id));
  const untouched=await describeAudio(second,'held-audio');
  expect(untouched.transcript).toBe('Held words');expect(untouched.deletedAt).toBeUndefined();
  expect((await savedRecords(second)).some((n:any)=>n.id==='held-voice')).toBe(true);
  await expect(first.getByRole('button',{name:'Check deletion status',exact:true})).toBeVisible();

  await first.close();
  await expect.poll(()=>second.evaluate(async()=>{const locks=await navigator.locks.query();return [...(locks.held||[]),...(locks.pending||[])].some(lock=>lock.name?.startsWith('alpha.notes-deletion-claim.v1:'));})).toBe(false);
  await second.getByRole('button',{name:'Check deletion status',exact:true}).click();
  await expect.poll(()=>pendingDeletions(second)).toEqual([]);
  expect((await savedRecords(second)).some((n:any)=>n.id==='held-voice')).toBe(true);
  expect((await describeAudio(second,'held-audio')).deletedAt).toBeUndefined();
 }finally{await context.close();}
});
