import {test,expect} from '@playwright/test';
const key='alpha.photos.pending-copy.v1';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/');});
test('empty read leaves the browser document uninitialized',async({page})=>{
 expect(await page.evaluate(async key=>{const m=await import('/src/runtime/media-copy-intent.ts'),{browserDocuments}=await import('/src/browser/documents.ts');return {intent:await m.readMediaCopyIntent(),stored:!!await browserDocuments.read(key)};},key)).toEqual({intent:null,stored:false});
});
test('two tabs cannot overwrite another pending copy',async({page,context})=>{
 const other=await context.newPage();await other.goto('/');
 const results=await Promise.all([page,other].map((tab,index)=>tab.evaluate(async index=>{const m=await import('/src/runtime/media-copy-intent.ts');try{return {saved:true,intent:await m.admitMediaCopyIntent('copy-'+index)};}catch{return {saved:false};}},index)));
 expect(results.filter(r=>r.saved)).toHaveLength(1);const saved=results.find(r=>r.saved)!.intent;
 expect(await page.evaluate(async()=>(await import('/src/runtime/media-copy-intent.ts')).readMediaCopyIntent())).toEqual(saved);
 expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBeNull();
});
test('old completion cannot clear a replacement with the same operation token',async({page})=>{
 expect(await page.evaluate(async()=>{const m=await import('/src/runtime/media-copy-intent.ts'),first=await m.admitMediaCopyIntent('copy');await m.acknowledgeMediaCopyIntent(first);const next=await m.admitMediaCopyIntent('copy');let conflict=false;try{await m.acknowledgeMediaCopyIntent(first);}catch{conflict=true;}return {conflict,distinct:first.revision!==next.revision,retained:JSON.stringify(await m.readMediaCopyIntent())===JSON.stringify(next)};})).toEqual({conflict:true,distinct:true,retained:true});
});
test('failed acknowledgement retains the exact pending request',async({page})=>{
 expect(await page.evaluate(async key=>{const m=await import('/src/runtime/media-copy-intent.ts'),intent=await m.admitMediaCopyIntent('copy'),put=IDBObjectStore.prototype.put;let failed=false;IDBObjectStore.prototype.put=function(v,k){if(k===key)throw Error('Synthetic storage full');return put.call(this,v,k);};try{await m.acknowledgeMediaCopyIntent(intent);}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}return {failed,retained:JSON.stringify(await m.readMediaCopyIntent())===JSON.stringify(intent)};},key)).toEqual({failed:true,retained:true});
});
test('stale reset cannot erase a later admitted copy',async({page})=>{
 expect(await page.evaluate(async()=>{const m=await import('/src/runtime/media-copy-intent.ts'),domain=await m.mediaCopyIntentDocument(),snapshot=await domain.capture(),intent=await m.admitMediaCopyIntent('copy');let refused=false;try{await domain.reset(snapshot);}catch{refused=true;}return {refused,retained:JSON.stringify(await m.readMediaCopyIntent())===JSON.stringify(intent)};})).toEqual({refused:true,retained:true});
});
