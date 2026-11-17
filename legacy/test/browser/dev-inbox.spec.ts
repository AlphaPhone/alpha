import {chooseMailAction} from './helpers/mail-actions.ts';
import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/?mode=dev');await page.getByRole('button',{name:'Inbox',exact:true}).click();});
test('local Inbox saves and restores attachment drafts then sends and opens the same bytes after reload',async({page},testInfo)=>{
 const external:string[]=[];page.on('request',r=>{if(!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)&&/^https?:/.test(r.url()))external.push(r.url());});
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('reader@example.test');await page.getByRole('textbox',{name:'To',exact:true}).press('Enter');await expect(page.getByRole('button',{name:'Remove reader@example.test',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Local attachment journey');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Saved body');await page.getByRole('button',{name:'Cc and Bcc',exact:true}).click();await page.getByRole('textbox',{name:'Cc',exact:true}).fill('copy@example.test');
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Attach file',exact:true}).click();await (await chooser).setFiles({name:'local-letter.txt',mimeType:'text/plain',buffer:Buffer.from('Café\r\nExact local bytes')});await expect(page.getByRole('button',{name:'Remove local-letter.txt',exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('local-inbox-draft.png')});await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Restore local draft',exact:true}).click();await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Local attachment journey');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Saved body');await expect(page.getByRole('button',{name:'Remove local-letter.txt',exact:true})).toBeVisible();await page.getByRole('button',{name:'Send email',exact:true}).click();await expect(page.getByText('Sent locally',{exact:true})).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!));expect(saved.localDrafts).toEqual([]);expect(saved.sent[0]).toMatchObject({to:['reader@example.test'],cc:['copy@example.test'],subj:'Local attachment journey'});expect(Buffer.from(saved.sent[0].atts[0].dataBase64,'base64').toString()).toBe('Café\r\nExact local bytes');await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Sent',exact:true}).click();await page.getByText('Local attachment journey',{exact:true}).click();await page.getByText('local-letter.txt',{exact:true}).click();await expect(page.getByRole('dialog',{name:'Reviewed attachment'})).toContainText('Exact local bytes');expect(external).toEqual([]);
});
test('failed local send retains the composer and does not duplicate a retry',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('reader@example.test');await page.getByRole('textbox',{name:'To',exact:true}).press('Enter');await expect(page.getByRole('button',{name:'Remove reader@example.test',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Retry local send');await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).restore=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='alpha.dev.app.inbox')throw Error('Full');return original.call(this,key,value);};});await page.getByRole('button',{name:'Send email',exact:true}).click();await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Retry local send');await expect(page.getByText('Sent locally',{exact:true})).toHaveCount(0);await page.evaluate(()=>(window as any).restore());await page.getByRole('button',{name:'Send email',exact:true}).click();await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).sent.filter((m:any)=>m.subj==='Retry local send').length)).toBe(1);
});
test('draft save retains an unsubmitted address and discard requires its explicit confirmation',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('draft@example.test');await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Keep draft');await page.getByRole('button',{name:'Save draft',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts[0].to)).toEqual(['draft@example.test']);await page.getByRole('button',{name:'Discard draft',exact:true}).click();const review=page.getByRole('dialog',{name:'Discard draft?',exact:true});await review.getByRole('button',{name:'Keep draft',exact:true}).click();await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Keep draft');await page.getByRole('button',{name:'Discard draft',exact:true}).click();await review.getByRole('button',{name:'Discard draft',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts)).toEqual([]);await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveCount(0);
});

test('malformed recipient chips cannot be saved or sent locally',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();
 await page.getByRole('textbox',{name:'To',exact:true}).fill('bad,extra@example.test');
 await page.getByRole('textbox',{name:'To',exact:true}).press('Enter');
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Invalid recipient');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')||'{}').localDrafts||[])).toEqual([]);
 await page.getByRole('button',{name:'Send email',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Invalid recipient');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')||'{}').sent||[])).toEqual([]);
});

test('a selected contact remains a valid local recipient after draft reload',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();
 await page.getByRole('button',{name:/Maya Chen.*@/}).click();
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Contact recipient');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await page.getByRole('button',{name:'Restore local draft',exact:true}).click();
 await page.getByRole('button',{name:'Send email',exact:true}).click();
 await expect(page.getByText('Sent locally',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).sent[0].to)).toEqual(['maya']);
});
test('local reply, forward, archive undo and search retain mailbox state',async({page})=>{
 await page.getByText('Dinner Friday?',{exact:true}).click();await chooseMailAction(page, 'Reply');await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Re: Dinner Friday?');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Local reply');await page.getByRole('button',{name:'Send email',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).mails.find((m:any)=>m.id===4).replied)).toBe(true);await chooseMailAction(page, 'Archive');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).mails.find((m:any)=>m.id===4).arch)).toBe(true);await page.getByRole('button',{name:'Undo',exact:true}).click();await chooseMailAction(page, 'Forward');await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Fwd: Dinner Friday?');await page.getByRole('textbox',{name:'To',exact:true}).fill('forward@example.test');await page.getByRole('textbox',{name:'To',exact:true}).press('Enter');await page.getByRole('button',{name:'Send email',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Search email',exact:true}).click();await page.getByRole('searchbox',{name:'Search mail',exact:true}).fill('Dinner Friday');await expect(page.getByText('Dinner Friday?',{exact:true})).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!));expect(saved.sent).toHaveLength(2);expect(saved.sent[0].body).toContain('tacos');expect(saved.mails.find((m:any)=>m.id===4).arch).toBeFalsy();
});

test('editing a saved draft replaces its saved status with an unsaved notice',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Saved subject');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Unsaved subject');
 await expect(page.getByText('Unsaved local draft',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts[0].subject)).toBe('Saved subject');
});

test('Back retains edited draft text and unfinished address across reload',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('unfinished@');await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Retained subject');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Complete retained body');await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveCount(0);expect((await page.evaluate(()=>(JSON.parse(localStorage.getItem('alpha.dev.app.inbox')||'{}').localDrafts||[]))).map((draft:any)=>({subject:draft.subject,pendingTo:draft.pendingTo}))).toEqual([{subject:'Retained subject',pendingTo:'unfinished@'}]);
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Drafts',exact:true}).click();await page.getByRole('button',{name:'Draft, Retained subject',exact:true}).click();await expect(page.getByRole('textbox',{name:'To',exact:true})).toHaveValue('unfinished@');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Complete retained body');
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Updated retained subject');await page.getByRole('button',{name:'Back from draft',exact:true}).click();expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts)).map((draft:any)=>draft.subject)).toEqual(['Updated retained subject']);
});
test('a refused Back save keeps the composer and an unrelated saved draft',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Peer draft');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Back from draft',exact:true}).click();await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Keep open on failure');
 await page.evaluate(()=>{const write=Storage.prototype.setItem;(window as any).restoreDraftStorage=()=>Storage.prototype.setItem=write;Storage.prototype.setItem=function(key,value){if(key==='alpha.dev.app.inbox')throw Error('Storage unavailable');return write.call(this,key,value);};});
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Keep open on failure');expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts)).map((draft:any)=>draft.subject)).toEqual(['Peer draft']);
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
 await page.getByRole('button',{name:'Return to Inbox draft',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Keep open on failure');
 await page.evaluate(()=>(window as any).restoreDraftStorage());await page.getByRole('button',{name:'Back from draft',exact:true}).click();expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts)).map((draft:any)=>draft.subject)).toEqual(['Peer draft','Keep open on failure']);
});


test('repeated recipient text is not added to a saved draft or restored after Save',async({page})=>{
 const to=page.getByRole('textbox',{name:'To',exact:true});
 const back=page.getByRole('button',{name:'Back from draft',exact:true});
 const restore=page.getByRole('button',{name:'Restore local draft',exact:true});
 const chip=page.getByRole('button',{name:'Remove reader@example.test',exact:true});
 await page.getByRole('button',{name:'Compose',exact:true}).click();
 await to.fill('reader@example.test');await to.press('Enter');
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Recipient retry');
 await to.fill('reader@example.test');await back.click();await restore.click();
 await expect(chip).toHaveCount(1);
 await to.fill('unfinished@');await back.click();await restore.click();
 await expect(to).toHaveValue('unfinished@');
 await to.fill('reader@example.test');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await restore.click();
 await expect(to).toHaveValue('');await expect(chip).toHaveCount(1);
 await to.fill('reader@example.test');await page.getByRole('button',{name:'Send email',exact:true}).click();
 await expect(page.getByText('Sent locally',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).sent[0].to)).toEqual(['reader@example.test']);
});

test('Back retains an intentionally emptied saved draft under its original identity',async({page})=>{
 const subject=page.getByRole('textbox',{name:'Subject',exact:true});
 await page.getByRole('button',{name:'Compose',exact:true}).click();
 await subject.fill('Remove this subject');await page.getByRole('button',{name:'Save draft',exact:true}).click();
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts[0].localDraftId);
 await subject.fill('');await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts);
 expect(saved).toHaveLength(1);expect(saved[0]).toMatchObject({localDraftId:id,subject:''});
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await page.getByRole('button',{name:'Restore local draft',exact:true}).click();
 await expect(subject).toHaveValue('');
});


test('Back from a contact email saves once and returns to the contact',async({page})=>{
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
 await page.getByRole('button',{name:'Contacts',exact:true}).click();
 await page.getByRole('button',{name:/Maya Chen/}).first().click();
 const email=page.getByRole('button',{name:'Email Maya Chen',exact:true});
 await email.click();
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Draft from Contacts');
 await page.evaluate(()=>{
  const w=window as any,write=Storage.prototype.setItem;
  w.inboxDraftWrites=0;
  Storage.prototype.setItem=function(key,value){if(key==='alpha.dev.app.inbox')w.inboxDraftWrites++;return write.call(this,key,value);};
 });
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 await expect(email).toBeVisible();
 const result=await page.evaluate(()=>({writes:(window as any).inboxDraftWrites,drafts:JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).localDrafts}));
 expect(result.writes).toBe(1);expect(result.drafts).toHaveLength(1);
 expect(result.drafts[0]).toMatchObject({to:['maya'],subject:'Draft from Contacts'});
});

test('explicit Save retires a corrected pending recipient before reload',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('unfinished@');await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Corrected draft recipient');await page.getByRole('button',{name:'Back from draft',exact:true}).click();await page.getByRole('button',{name:'Drafts',exact:true}).click();await page.getByRole('button',{name:'Draft, Corrected draft recipient',exact:true}).click();
 await page.getByRole('textbox',{name:'To',exact:true}).fill('reader@example.test');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Drafts',exact:true}).click();await page.getByRole('button',{name:'Draft, Corrected draft recipient',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'To',exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Remove reader@example.test',exact:true})).toBeVisible();await page.getByRole('button',{name:'Send email',exact:true}).click();await expect(page.getByText('Sent locally',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!).sent[0].to)).toEqual(['reader@example.test']);
});
