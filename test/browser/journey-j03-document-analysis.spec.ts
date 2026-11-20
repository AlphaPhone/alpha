import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {openLegacyNotes} from './helpers/legacy-notes';
// J03 covers Inbox → Save to Files → Ask Alpha → explicit Send in the development renderer.
// A separately seeded retained note verifies that an older saved source still opens matching bytes.
import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {returnToApps} from './app-navigation';

test.setTimeout(300_000);

const contents='Public fact: twelve raised beds.\nPRIVATE OMIT: do not send this line.';
const excerpt='Public fact: twelve raised beds.';
const reply='The report says there are twelve raised beds.';
const failClosed='Couldn’t open the linked file.';

// READ-ONLY views of persisted state.
const notes=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw())||'{"records":[]}').records as any[]);
const files=(page:Page)=>page.evaluate(async()=>{const{registerPlugin}=await import('/src/platform-plugins.ts');return (await registerPlugin<any>('AlphaFiles').list({})).entries as any[];});
const agentMessages=(page:Page)=>page.evaluate(async()=>(await (await import('/src/browser/development-agent-document.ts')).readDevelopmentAgent((await import('/src/browser/development-identity.ts')).developmentIdentity('local'))).conversations.flatMap((c:any)=>c.messages) as any[]);
const ready=(page:Page)=>expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible({timeout:90_000});

async function openLinkedSource(page:Page){
 await returnToApps(page);
 await openLegacyNotes(page);
 const row=page.getByRole('button',{name:'Open Garden summary',exact:true});
 const attachment=page.getByRole('button',{name:'Attachment',exact:true});
 await expect(row.or(attachment).first()).toBeVisible();
 if(!await attachment.isVisible())await row.click();
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Garden summary');
 await attachment.click();
}

test('J03: a saved Inbox attachment reaches Alpha only on Send and a retained source link still opens exact bytes',async({page})=>{
 await page.goto('/?mode=dev&tools=1');await ready(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('textbox',{name:'Scripted reply'}).fill(reply);
 await page.getByRole('button',{name:'Save development reply'}).click();
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await returnToApps(page);await openLegacyNotes(page);await returnToApps(page);

 // ---- 1. Incoming email attachment -> Inbox review -> Save to Files ----
 await page.getByRole('button',{name:'Device controls',exact:true}).click();
 await page.getByRole('button',{name:'Incoming email',exact:true}).click();
 const incoming=page.getByRole('dialog',{name:'Incoming email',exact:true});
 await incoming.getByLabel('Subject',{exact:true}).fill('Garden report');
 await incoming.getByLabel('Email body',{exact:true}).fill('Report attached.');
 await incoming.getByLabel('Attachments',{exact:true}).setInputFiles({name:'garden-report.txt',mimeType:'text/plain',buffer:Buffer.from(contents)});
 await expect(incoming.getByRole('status')).toHaveText('1 attachment ready');
 await incoming.getByRole('button',{name:'Deliver',exact:true}).click();
 await expect(incoming).toHaveCount(0);
 await returnToApps(page);
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await page.getByRole('button',{name:/Garden report/}).click();
 await expect(page.getByRole('heading',{name:'Garden report',level:1})).toBeVisible();
 expect(await files(page)).toEqual([]);
 await page.getByRole('button',{name:'Open garden-report.txt',exact:true}).click();
 const attachment=page.getByRole('dialog',{name:'Reviewed attachment'});
 await expect(attachment).toContainText(excerpt);
 // Reviewing the attachment stores nothing.
 expect(await files(page)).toEqual([]);
 const saveToFiles=attachment.getByRole('button',{name:'Save to Files',exact:true});
 await saveToFiles.click();
 await expect(attachment.getByRole('status')).toHaveText('Saved in Files.');
 await expect(saveToFiles).toBeDisabled();
 await attachment.getByRole('button',{name:'Done',exact:true}).click();
 await expect(attachment).toHaveCount(0);
 const stored=await files(page);
 expect(stored.map(e=>[e.name,e.mimeType,e.size])).toEqual([['garden-report.txt','text/plain',Buffer.byteLength(contents)]]);

 // ---- 2. Files -> open -> reviewed question to the agent ----
 await returnToApps(page);
 await page.getByRole('button',{name:'Files',exact:true}).click();
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open garden-report.txt',exact:true}).click();
 await expect(page.getByText('PRIVATE OMIT: do not send this line.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 await page.getByRole('button',{name:'Ask Alpha',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove garden-report.txt',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 expect(await agentMessages(page)).toEqual([]);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.getByText(reply,{exact:true})).toBeVisible();
 const sent=await agentMessages(page);
 expect(sent.map(m=>m.role)).toEqual(['user','assistant']);
 expect(sent[0].text).toContain('Explain this file');
 expect(sent[1].text).toBe(reply);
 await expect(page.getByText('Review summary note',{exact:true})).toHaveCount(0);
 expect(await notes(page)).toEqual([]);

 // ---- 3. Seed a source link written by a previous version ----
 const sha256=createHash('sha256').update(contents).digest('hex');
 const reference=await page.evaluate(async sha256=>{
  const {registerPlugin}=await import('/src/platform-plugins.ts');
  const files=registerPlugin<any>('AlphaFiles'),attachments=registerPlugin<any>('AlphaMailAttachments');
  const selected=await files.storageSelect({path:'garden-report.txt'});
  return (await attachments.retainSourceReference({selectionId:selected.selectionId,sha256})).reference;
 },sha256);
 expect(reference).toMatch(/^b1:[a-f0-9-]{36}$/);
 const linked={id:'j03-retained-summary',kind:'text' as const,title:'Garden summary',body:'There are twelve raised beds.',documentSource:{version:1 as const,name:'garden-report.txt',mimeType:'text/plain',size:Buffer.byteLength(contents),sha256,reference}};
 await returnToApps(page);await openLegacyNotes(page,[linked]);
 const retained=await notes(page);
 expect(retained).toHaveLength(1);expect(retained[0]).toMatchObject(linked);

 // ---- 4. Reload: note persists once; its verified source reference opens the source ----
 await page.reload();await ready(page);
 // Rendered first: the Notes list shows the summary exactly once.
 await returnToApps(page);
 await openLegacyNotes(page);
 await expect(page.getByRole('button',{name:'Open Garden summary',exact:true})).toHaveCount(1);
 await expect(page.getByRole('region',{name:'Notes'}).getByRole('button',{name:/^Open (?!Trash$)/})).toHaveCount(1);
 // Storage agrees (secondary check).
 expect(await notes(page)).toEqual(retained);
 expect((await files(page)).map(e=>e.name)).toEqual(['garden-report.txt']);
 await openLinkedSource(page);
 const preview=page.getByRole('dialog',{name:'Reviewed attachment'});
 await expect(preview).toContainText('garden-report.txt');
 await expect(preview).toContainText('PRIVATE OMIT: do not send this line.');
 // A source opened from a note is a read-only review; it does not offer another copy.
 await expect(preview.getByRole('button',{name:'Save to Files',exact:true})).toHaveCount(0);
 await preview.getByRole('button',{name:'Done',exact:true}).click();
 await expect(preview).toHaveCount(0);

 // ---- 5. The stored source bytes change: the reference fails closed ----
 // External-change simulation (see header): no rendered control edits stored bytes in place.
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('alpha.browser.files.v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries'),all=store.getAll();all.onsuccess=()=>{const row=all.result.find((r:any)=>r.name==='garden-report.txt');row.bytes=new TextEncoder().encode('Public fact: thirteen raised beds.').buffer;row.size=row.bytes.byteLength;store.put(row);};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};}));
 await openLinkedSource(page);
 await expect(page.getByText(failClosed,{exact:true})).toBeVisible();
 await expect(preview).toHaveCount(0);
 expect(await notes(page)).toEqual(retained);

 // ---- 6. The source file is deleted in Files: the reference fails closed ----
 await returnToApps(page);
 await page.getByRole('button',{name:'Files',exact:true}).click();
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Files options',exact:true}).click();await page.getByRole('button',{name:'Select',exact:true}).click();
 await page.getByRole('button',{name:'Select garden-report.txt',exact:true}).click();
 // Delete moves to Trash; only a confirmed Empty deletes.
 await page.getByRole('toolbar',{name:'Selection actions'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open garden-report.txt',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Trash',exact:true}).click();
 await page.getByRole('button',{name:'Empty',exact:true}).click();await page.getByRole('dialog',{name:'Empty Trash?',exact:true}).getByRole('button',{name:'Empty',exact:true}).click();
 await expect(page.getByRole('button',{name:'garden-report.txt',exact:true})).toHaveCount(0);
 expect((await files(page)).filter(e=>!e.name.startsWith('.'))).toEqual([]);
 await openLinkedSource(page);
 await expect(page.getByText(failClosed,{exact:true})).toBeVisible();
 await expect(preview).toHaveCount(0);
 await page.reload();await ready(page);
 // The note and its recorded provenance survive; only the link's target is gone.
 expect(await notes(page)).toEqual(retained);
 expect((await files(page)).filter(e=>!e.name.startsWith('.'))).toEqual([]);
});
