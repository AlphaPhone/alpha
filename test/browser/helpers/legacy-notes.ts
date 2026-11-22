import {expect,test,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import type {DocumentNotesStore} from '../../../apps/app/src/runtime/browser-notes-document.ts';
type RetainedNote = Parameters<DocumentNotesStore['replace']>[0][number];
/** Seed only the isolated test's retained legacy document before selecting that source.
 * Production source selection never initializes or migrates a missing legacy document. */
export async function openLegacyNotes(page:Page,records:RetainedNote[]=[]){
 if(test.info().project.name==='production')await seedRetainedNotes(page,records);
 else await page.evaluate(async records=>{
  const m=await import('/src/runtime/browser-notes-document.ts');
  const store=await m.openBrowserNotes();
  if(records.length)await store.replace(records);
 },records);
 await selectLegacyNotes(page);
 await expect(page.getByRole('heading',{name:'Previous notes',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'New note',exact:true})).toBeEnabled();
 await expect(page.getByText('Previous notes need a recovery review. Nothing was moved or changed.',{exact:true})).toHaveCount(0);
}

/** Navigate only; leave raw-store setup and recovery assertions to the caller. */
export async function selectLegacyNotes(page:Page){
 await page.getByRole('button',{name:'Notes',exact:true}).click();
 await selectLegacyNotesSource(page);
}

/** Select within an already open Notes view without hiding its current ownership state. */
export async function selectLegacyNotesSource(page:Page){
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 if(await page.getByRole('heading',{name:'Previous notes',exact:true}).isVisible())return;
 await page.getByRole('button',{name:'Notes options',exact:true}).click();
 await page.getByRole('menu',{name:'Notes options',exact:true}).getByRole('menuitem',{name:'On this phone',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Previous notes',exact:true})).toBeVisible();
}

/** Open a byte-matched fixture through the legacy note’s attachment chip. */
export async function openLegacyAttachment(page:Page){
 const file={name:'fixture.txt',mimeType:'text/plain',buffer:Buffer.from('Fixture file body.')};
 const record:RetainedNote={id:'retained-attachment',kind:'text',title:'Retained attachment',body:'Synthetic summary.',
  documentSource:{version:1,name:file.name,mimeType:file.mimeType,sha256:createHash('sha256').update(file.buffer).digest('hex'),size:file.buffer.length}};
 await openLegacyNotes(page,[record]);
 await page.getByRole('button',{name:'Open Retained attachment',exact:true}).click();
 const picker=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Attachment',exact:true}).click();
 await (await picker).setFiles(file);
 await expect(page.getByRole('dialog',{name:'Reviewed attachment',exact:true})).toBeVisible();
}

/** Seed the isolated browser context through its persisted wire format, never source imports
 * or a production-only testing hook. Existing documents are left untouched. */
async function seedRetainedNotes(page:Page,records:RetainedNote[]=[]){
 await page.evaluate(async(records)=>{
  const keys=['alphaphone:prototype:notes:v1','alphaphone:notes:v2','alphaphone:daily:v1'];
  if(keys.some(key=>localStorage.getItem(key)!==null))throw Error('Retained Notes fixture requires an empty isolated legacy store');
  await new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('alpha.browser.documents.v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('documents');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents');
    tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};
    const read=store.get('alpha.browser.notes.v1');
    read.onsuccess=()=>{if(read.result!==undefined)return;
     const currentRaw=JSON.stringify({version:2,collectionId:crypto.randomUUID(),records,deleted:[]});
     store.put({revision:crypto.randomUUID(),raw:JSON.stringify({version:1,archive:{v1:null,v2:null,daily:null},currentRaw})},'alpha.browser.notes.v1');
    };
   };
  });
 },records);
}
