import {localDraftRow,savedInboxAttachments,savedInboxDrafts} from './inbox-draft-navigation';
import {test,expect,type Page} from '@playwright/test';
const dialog=(page:Page)=>page.getByRole('dialog',{name:'Attach to email',exact:true});
const owner:[string,string,string,string]=['production','file-owner','','file-grant'];
/** `mail` lists one synthetic message the owner can reply to. */
async function setup(page:Page,openFile=true,openInbox=true,holdRead=false,mail=false){
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await page.evaluate(async mail=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {Component}=await import('/src/prototype/model.js');
  // Synthetic restartable native-slot stand-in; browser production intentionally has no Inbox secret slots.
  const {inboxLocalStore:s}=await import('/src/runtime/inbox-local-store.ts');
  s.read=async(key:string)=>structuredClone(JSON.parse(sessionStorage.getItem('file-email-slots')||'{}')[key]??null) as any;
  s.compareExchange=async(key:string,prior:unknown,next:unknown)=>{const slots=JSON.parse(sessionStorage.getItem('file-email-slots')||'{}');if(JSON.stringify(slots[key]??null)!==JSON.stringify(prior))return {status:'conflict'} as any;slots[key]=next;sessionStorage.setItem('file-email-slots',JSON.stringify(slots));return {status:'saved'} as any;};
  const {registerPlugin}=await import('/src/platform-plugins.ts');
  const f=(window as any).fileEmail={writes:0,shell:null as any};
  const write=async()=>{f.writes++;throw Error('No provider writes allowed');};
  const message={id:'m1',threadId:'t-m1',from:'Alice Example',fromEmail:'alice@example.invalid',to:['owner@example.invalid'],subject:'Lunch plans',snippet:'Synthetic',receivedAt:'2026-10-01T12:00:00Z',unread:false};
  const client={gmailAccounts:async()=>[{connectionId:'file-grant',label:'owner@example.invalid',connected:true,grantedCapabilities:['google.gmail.triage']}],gmailInboxCapabilities:async()=>({send:false,providerDrafts:false,mailboxMutations:false}),gmailSearch:async()=>({messages:mail?[message]:[],syncedAt:'1'}),gmailRead:async()=>({message,bodyText:'Synthetic body',historyId:'mail-r1',links:[]}),gmailPrepareOperation:write,gmailDispatchOperation:write};
  c.getCloudClient=()=>({client,sessionId:'file-session'} as any);
  const snapshot={...c.getSnapshot(),cloudAccount:{environment:'production',userId:'file-owner',sessionId:'file-session',credentialId:'fixture'}} as any;c.getSnapshot=()=>snapshot;
  const original=Component.prototype.renderVals;Component.prototype.renderVals=function(){f.shell=this;return original.call(this);};
  const files=registerPlugin<any>('AlphaFiles');if(!(await files.list({})).entries.length)await files.importFile(new File(['Café\nExact bytes'],'selected.txt',{type:'text/plain'}));
 },mail);
 if(!openInbox)return;
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:'Compose',exact:true})).toBeEnabled();
 if(!openFile)return;
 await expect.poll(()=>page.evaluate(async()=>{const {VIEWS}=await import('/src/prototype/model.js');return VIEWS.inbox.fileEmailTarget().ready;})).toBe(true);
 await openSelectedFile(page);
 if(holdRead) await page.evaluate(async()=>{
  const {BrowserMailAttachments}=await import('/src/browser/mail-attachments.ts');
  const original=BrowserMailAttachments.prototype.readSelected, fixture=(window as any).fileEmail;
  BrowserMailAttachments.prototype.readSelected=async function(input){
   const result=await original.call(this,input);
   if(!fixture.releaseAttachment)await new Promise<void>(resolve=>fixture.releaseAttachment=resolve);
   return result;
  };
 });
 await chooseEmail(page);
 if(holdRead)await expect.poll(()=>page.evaluate(()=>typeof(window as any).fileEmail.releaseAttachment)).toBe('function');
}
/** Leaves Inbox for Files, first visit, and opens the selected file there. */
async function openSelectedFile(page:Page){
 await page.evaluate(()=>(window as any).fileEmail.shell.openView('files',{}));
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open selected.txt',exact:true}).click();
}
async function chooseEmail(page:Page){
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 await page.getByRole('button',{name:'Use in email',exact:true}).click();
}
test('choosing Email in Files stages the exact attachment directly in a new local draft',async({page},info)=>{
 await setup(page);
 await expect(dialog(page)).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('file-email-draft.png')});
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
 const saved=()=>savedInboxAttachments(page,owner);
 expect(await saved()).toEqual([{name:'selected.txt',mimeType:'text/plain',dataBase64:Buffer.from('Café\nExact bytes').toString('base64')}]);
 await setup(page,false);await (await localDraftRow(page)).click();
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 expect((await saved())[0].dataBase64).toBe(Buffer.from('Café\nExact bytes').toString('base64'));
 await page.getByRole('button',{name:'Remove selected.txt',exact:true}).click();await expect(page.getByRole('list',{name:'Attachments',exact:true})).toHaveCount(0);
});
for(const change of ['account','bytes','revoke'])test(`direct file attachment refuses changed ${change}`,async({page})=>{
 await setup(page,true,true,true);
 await page.evaluate(async change=>{
  if(change==='account'){const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');const old=c.getCloudClient()!;c.getCloudClient=()=>({...old,sessionId:'another-owner'});return;}
  const {registerPlugin}=await import('/src/platform-plugins.ts'),files=registerPlugin<any>('AlphaFiles');
  const row=(await files.list({})).entries.find((item:any)=>item.name==='selected.txt');
  if(change==='bytes'){
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('alpha.browser.files.v1');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   const tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries'),request=store.get(row.id);request.onsuccess=()=>{const changed=new TextEncoder().encode('changed');store.put({...request.result,bytes:changed.buffer,size:changed.length});};await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  }else await files.delete({id:row.id,expectedRevision:row.revision,confirmPermanent:true});
 },change);
 await page.evaluate(()=>(window as any).fileEmail.releaseAttachment());
 await expect(page.getByText(/changed|no longer available/).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});
test('sharing the same file again while its email is unfinished adds nothing',async({page})=>{
 await setup(page);
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 // Files reopens in the folder it was showing; leaving Inbox keeps the shared email unfinished.
 await page.evaluate(()=>(window as any).fileEmail.shell.openView('files',{}));
 await page.getByRole('button',{name:'Open selected.txt',exact:true}).click();
 await chooseEmail(page);
 await expect(page.getByText('This file is already attached to your unfinished email in Inbox. Nothing was added.',{exact:true}).first()).toBeVisible();
 // The duplicate refusal sets nothing aside and starts no second email: the one email holds the file once.
 expect(await savedInboxDrafts(page,owner)).toEqual([]);
 await page.evaluate(()=>(window as any).fileEmail.shell.openView('inbox',{}));
 await expect(page.getByRole('button',{name:'Compose',exact:true})).toBeEnabled();
 // Drafts lists the unfinished email (Continue draft) and nothing set aside.
 await (await localDraftRow(page)).click();
 await expect(page.getByRole('list',{name:'Attachments',exact:true}).getByRole('listitem')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toHaveCount(1);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});
test('a shared file never lands in an unfinished reply: a new composer opens with only that file',async({page},info)=>{
 await setup(page,false,true,false,true);
 await page.getByText('Lunch plans',{exact:true}).click();
 await page.getByLabel('Message actions',{exact:true}).click();
 await page.getByRole('button',{name:'Reply',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Re: Lunch plans');
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Reply the owner typed');
 // Leaving Inbox closes the composer and keeps the unfinished reply.
 await openSelectedFile(page);
 await chooseEmail(page);
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 await expect(page.getByRole('list',{name:'Attachments',exact:true}).getByRole('listitem')).toHaveCount(1);
 await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('');
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('');
 await page.screenshot({path:info.outputPath('file-email-new-draft-beside-reply.png')});
 const shape=(drafts:Awaited<ReturnType<typeof savedInboxDrafts>>)=>drafts.map(draft=>[draft.mode,draft.subject,draft.body,(draft.attachments??[]).map(file=>file.name)]);
 // The reply was set aside as it was: its text, no attachment.
 expect(shape(await savedInboxDrafts(page,owner))).toEqual([['reply','Re: Lunch plans','Reply the owner typed',[]]]);
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 expect(shape(await savedInboxDrafts(page,owner))).toEqual([['reply','Re: Lunch plans','Reply the owner typed',[]],['compose','','',['selected.txt']]]);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});
test('Files before Inbox asks to open Inbox once when a Gmail account was chosen',async({page})=>{
 await setup(page,false,false);
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {saveGmailAccountChoice}=await import('/src/runtime/gmail-account-selection.ts');
  saveGmailAccountChoice(c.getSnapshot().cloudAccount,'file-grant');
 });
 await page.getByRole('button',{name:'Files',exact:true}).click();
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open selected.txt',exact:true}).click();
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 await page.getByRole('button',{name:'Use in email',exact:true}).click();
 await expect(page.getByText('Open Inbox first',{exact:true})).toBeVisible();
 await expect(dialog(page)).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});

test('a concurrent text preview read does not disturb the stashed attachment',async({page})=>{
 await setup(page,false);
 await expect.poll(()=>page.evaluate(async()=>{const {VIEWS}=await import('/src/prototype/model.js');return VIEWS.inbox.fileEmailTarget().ready;})).toBe(true);
 await page.evaluate(async()=>{
  const {BrowserDaily}=await import('/src/browser/daily.ts');
  const read=BrowserDaily.prototype.readSelected,fixture=(window as any).fileEmail;
  BrowserDaily.prototype.readSelected=async function(input){
   const result=await read.call(this,input);
   await new Promise<void>(resolve=>fixture.releaseRead=resolve);
   fixture.readFinished=true;
   return result;
  };
  fixture.shell.openView('files',{});
 });
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open selected.txt',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof(window as any).fileEmail.releaseRead)).toBe('function');
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 await page.getByRole('button',{name:'Use in email',exact:true}).click();
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as any).fileEmail.releaseRead());
 await expect.poll(()=>page.evaluate(()=>(window as any).fileEmail.readFinished)).toBe(true);
 await expect(page.getByRole('button',{name:'Remove selected.txt',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});
