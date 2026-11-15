import {retainedMailDraft,openSavedMailDraft} from './helpers/retained-mail-draft';
import {chooseMailAction} from './helpers/mail-actions.ts';
import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
const bytes=Buffer.from('Forwarded original\r\nCafé');
test.beforeEach(async({page})=>{
 await page.addInitScript(({dataBase64,sha256})=>{
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  if(!localStorage.getItem('alpha.dev.app.inbox'))localStorage.setItem('alpha.dev.app.inbox',JSON.stringify({mails:[
   {id:'one',name:'Sender One',email:'one@example.test',subj:'Planning notes',body:'Meeting context',acct:'personal',unread:true,k:2,time:'Today',atts:[{name:'original.txt',mimeType:'text/plain',dataBase64,sha256,size:'26 bytes',browserAttachment:true}]},
   {id:'two',name:'Sender Two',email:'two@example.test',subj:'Travel details',body:'Train times',acct:'personal',unread:true,k:1,time:'Today'}],sent:[],localDrafts:[]}));
 },{dataBase64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')});
 await page.goto('/?mode=dev');await page.getByRole('button',{name:'Inbox',exact:true}).click();
});
async function stored(page:any){return page.evaluate(()=>JSON.parse(localStorage.getItem('alpha.dev.app.inbox')!));}
test('search, archive, undo and delete preserve their local state through reload',async({page})=>{
 await page.getByRole('button',{name:'Search email',exact:true}).click();await page.getByRole('searchbox',{name:'Search mail',exact:true}).fill('Train times');
 await expect(page.getByRole('button',{name:/Sender Two, Travel details/})).toBeVisible();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toHaveCount(0);
 await page.getByRole('button',{name:'Back to inbox',exact:true}).click();await page.getByRole('button',{name:/Sender One, Planning notes/}).click();
 await chooseMailAction(page, 'Archive');expect((await stored(page)).mails[0].arch).toBe(true);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await stored(page)).mails[0].arch).not.toBe(true);
 await chooseMailAction(page, 'Move to Trash');expect((await stored(page)).mails[0].del).toBe(true);
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toHaveCount(0);await expect(page.getByRole('button',{name:/Sender Two, Travel details/})).toBeVisible();
});
test('reply saves its source identity and sending marks only that source as replied',async({page})=>{
 await page.getByRole('button',{name:/Sender One, Planning notes/}).click();await chooseMailAction(page, 'Reply');await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Re: Planning notes');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Local reply');await retainedMailDraft(page,'save');
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await openSavedMailDraft(page);await page.getByRole('button',{name:'Send email',exact:true}).click();
 const data=await stored(page);expect(data.sent[0]).toMatchObject({to:['one@example.test'],subj:'Re: Planning notes',body:'Local reply'});expect(data.mails[0]).toMatchObject({unread:false,replied:true});expect(data.mails[1].replied).toBeUndefined();
});
test('forward retains reviewed attachment bytes and requires a chosen recipient',async({page})=>{
 await page.getByRole('button',{name:/Sender One, Planning notes/}).click();await chooseMailAction(page, 'Forward');await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Fwd: Planning notes');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toContainText('Meeting context');await page.getByRole('button',{name:'Send email',exact:true}).click();expect((await stored(page)).sent).toEqual([]);
 await page.getByRole('textbox',{name:'To',exact:true}).fill('forward@example.test');await page.getByRole('button',{name:'Send email',exact:true}).click();const data=await stored(page);expect(data.sent[0].to).toEqual(['forward@example.test']);expect(Buffer.from(data.sent[0].atts[0].dataBase64,'base64')).toEqual(bytes);expect(data.mails[0].replied).toBeUndefined();
});

test('sending a separate message preserves an earlier saved draft',async({page})=>{
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('saved@example.test');await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Retain this draft');await retainedMailDraft(page,'save');await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'To',exact:true}).fill('other@example.test');await page.getByRole('textbox',{name:'Subject',exact:true}).fill('Separate message');await page.getByRole('button',{name:'Send email',exact:true}).click();
 expect((await stored(page)).localDrafts.map((d:any)=>d.subject)).toEqual(['Retain this draft']);await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await openSavedMailDraft(page);await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Retain this draft');
});

test('multiple drafts retain identity and discarding one keeps the other',async({page})=>{
 for(const subject of ['First draft','Second draft']){await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'Subject',exact:true}).fill(subject);await retainedMailDraft(page,'save');await page.getByRole('button',{name:'Back from draft',exact:true}).click();}
 const before=await stored(page);expect(before.localDrafts).toHaveLength(2);expect(new Set(before.localDrafts.map((d:any)=>d.localDraftId)).size).toBe(2);
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await openSavedMailDraft(page,'First draft');await retainedMailDraft(page,'discard');await page.getByRole('dialog',{name:'Discard this draft?'}).getByRole('button',{name:'Yes',exact:true}).click();
 expect((await stored(page)).localDrafts.map((d:any)=>d.subject)).toEqual(['Second draft']);await openSavedMailDraft(page);await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Second draft');
});
test('an older draft receives an identity on restore and saving it does not create a duplicate',async({page})=>{
 await page.evaluate(()=>{const key='alpha.dev.app.inbox',data=JSON.parse(localStorage.getItem(key)!);data.localDrafts=[{to:['legacy@example.test'],subject:'Legacy draft',body:'Before identities'}];localStorage.setItem(key,JSON.stringify(data));});await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await openSavedMailDraft(page);const id=(await stored(page)).localDrafts[0].localDraftId;expect(typeof id).toBe('string');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Updated legacy');await retainedMailDraft(page,'save');const drafts=(await stored(page)).localDrafts;expect(drafts).toHaveLength(1);expect(drafts[0]).toMatchObject({localDraftId:id,body:'Updated legacy'});
});


test('Inbox options visibly opens and Refresh preserves the local mailbox',async({page})=>{
 const before=await stored(page);
 await page.getByLabel('Mail options',{exact:true}).click();
 const menu=page.getByRole('menu');await expect(menu).toBeVisible();
 const refresh=menu.getByRole('menuitem',{name:'Refresh',exact:true});await expect(refresh).toBeVisible();
 expect((await menu.boundingBox())!.height).toBeGreaterThan(40);
 await refresh.click();await expect(menu).toBeHidden();
 expect(await stored(page)).toEqual(before);
 await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toBeVisible();
});

async function mailMenu(page:any,name:string){await page.getByLabel('Mail options',{exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
test('preview selection confirms only selected email changes and survives reload',async({page})=>{
 await mailMenu(page,'Select emails');
 await page.getByRole('checkbox',{name:/Sender One, Planning notes/}).click();
 await expect(page.getByRole('heading',{name:'1 selected',exact:true})).toBeVisible();
 await mailMenu(page,'Move to Trash');const review=page.getByRole('dialog',{name:'Move to Trash 1 email?',exact:true});
 await review.getByRole('button',{name:'No',exact:true}).click();expect((await stored(page)).mails[0].del).toBeUndefined();
 await mailMenu(page,'Move to Trash');await review.getByRole('button',{name:'Yes',exact:true}).click();
 const rows=(await stored(page)).mails;expect(rows[0].del).toBe(true);expect(rows[1]).toMatchObject({id:'two',unread:true});
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toHaveCount(0);await expect(page.getByRole('button',{name:/Sender Two, Travel details/})).toBeVisible();
});
test('preview select all marks read then finishes selection without deleting peers',async({page})=>{
 await mailMenu(page,'Select emails');await mailMenu(page,'Select all');await expect(page.getByRole('heading',{name:'2 selected',exact:true})).toBeVisible();
 await mailMenu(page,'Mark as read');await page.getByRole('dialog',{name:'Mark as read 2 emails?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 expect((await stored(page)).mails.map((row:any)=>row.unread)).toEqual([false,false]);
 await mailMenu(page,'Select emails');await mailMenu(page,'Finish selection');await expect(page.getByRole('checkbox')).toHaveCount(0);await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toBeVisible();
});
test('preview draft selection deletes only the confirmed saved draft',async({page})=>{
 for(const subject of ['Keep draft peer','Delete draft target']){await page.getByRole('button',{name:'Compose',exact:true}).click();await page.getByRole('textbox',{name:'Subject',exact:true}).fill(subject);await page.getByRole('button',{name:'Back from draft',exact:true}).click();}
 await page.getByRole('button',{name:'Drafts',exact:true}).click();await mailMenu(page,'Select drafts');await page.getByRole('checkbox',{name:'Draft, Delete draft target',exact:true}).click();await mailMenu(page,'Delete drafts');
 const review=page.getByRole('dialog',{name:'Delete 1 draft?',exact:true});await review.getByRole('button',{name:'No',exact:true}).click();expect((await stored(page)).localDrafts).toHaveLength(2);
 await mailMenu(page,'Delete drafts');await review.getByRole('button',{name:'Yes',exact:true}).click();
 expect((await stored(page)).localDrafts.map((row:any)=>row.subject)).toEqual(['Keep draft peer']);expect((await stored(page)).mails).toHaveLength(2);
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Drafts',exact:true}).click();await expect(page.getByRole('button',{name:'Draft, Keep draft peer',exact:true})).toBeVisible();await expect(page.getByText('Delete draft target',{exact:true})).toHaveCount(0);
});
test('preview batch storage refusal retains rows and allows one successful retry',async({page})=>{
 await mailMenu(page,'Select emails');await page.getByRole('checkbox',{name:/Sender One, Planning notes/}).click();await mailMenu(page,'Move to Trash');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).restoreSelectionStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='alpha.dev.app.inbox')throw Error('Mailbox storage unavailable');return original.call(this,key,value);};});
 const review=page.getByRole('dialog',{name:'Move to Trash 1 email?',exact:true});await review.getByRole('button',{name:'Yes',exact:true}).click();expect((await stored(page)).mails[0].del).toBeUndefined();await expect(review).toBeVisible();
 await page.evaluate(()=>(window as any).restoreSelectionStorage());await review.getByRole('button',{name:'Yes',exact:true}).click();expect((await stored(page)).mails[0].del).toBe(true);expect((await stored(page)).mails[1].del).toBeUndefined();
});
test('preview changing folder retires a selection and returning starts clean',async({page})=>{
 await mailMenu(page,'Select emails');await page.getByRole('checkbox',{name:/Sender One, Planning notes/}).click();await page.getByRole('button',{name:'Sent',exact:true}).click();await expect(page.getByRole('checkbox')).toHaveCount(0);await page.getByRole('button',{name:'Sent',exact:true}).click();await mailMenu(page,'Select emails');await expect(page.getByRole('heading',{name:'0 selected',exact:true})).toBeVisible();expect((await stored(page)).mails[0].del).toBeUndefined();
});

test('preview Archive and Trash recover selected emails without losing the other message',async({page})=>{
 await mailMenu(page,'Select emails');await page.getByRole('checkbox',{name:/Sender One, Planning notes/}).click();await mailMenu(page,'Archive');await page.getByRole('dialog',{name:'Archive 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 await page.getByRole('button',{name:'Archive',exact:true}).click();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toBeVisible();
 await mailMenu(page,'Select emails');await mailMenu(page,'Select all');await mailMenu(page,'Move to Inbox');await page.getByRole('dialog',{name:'Move to Inbox 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 await page.getByRole('button',{name:'All',exact:true}).click();await mailMenu(page,'Select emails');await page.getByRole('checkbox',{name:/Sender One, Planning notes/}).click();await mailMenu(page,'Move to Trash');await page.getByRole('dialog',{name:'Move to Trash 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 await page.getByRole('button',{name:'Trash',exact:true}).click();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toBeVisible();await mailMenu(page,'Select emails');await mailMenu(page,'Select all');await mailMenu(page,'Restore');await page.getByRole('dialog',{name:'Restore 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 const saved=await stored(page);expect(saved.mails[0]).toMatchObject({arch:false,del:false});expect(saved.mails[1]).toMatchObject({id:'two',unread:true});
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await expect(page.getByRole('button',{name:/Sender One, Planning notes/})).toBeVisible();await expect(page.getByRole('button',{name:/Sender Two, Travel details/})).toBeVisible();
});

test('preview sent-mail recovery cannot change a received message with the same id',async({page})=>{
 await page.evaluate(()=>{const key='alpha.dev.app.inbox',state=JSON.parse(localStorage.getItem(key)!);state.sent=[{id:'one',sent:true,to:['recipient@example.test'],subj:'Sent target',body:'Sent bytes',acct:'personal',k:3,time:'Today'}];localStorage.setItem(key,JSON.stringify(state));});
 await page.reload();await page.getByRole('button',{name:'Inbox',exact:true}).click();await page.getByRole('button',{name:'Sent',exact:true}).click();await mailMenu(page,'Select emails');await page.getByRole('checkbox',{name:/Sent target/}).click();await mailMenu(page,'Move to Trash');await page.getByRole('dialog',{name:'Move to Trash 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 expect((await stored(page)).mails[0].del).toBeUndefined();expect((await stored(page)).sent[0].del).toBe(true);
 await page.getByRole('button',{name:'Trash',exact:true}).click();await mailMenu(page,'Select emails');await mailMenu(page,'Select all');await mailMenu(page,'Restore');await page.getByRole('dialog',{name:'Restore 1 email?',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
 expect((await stored(page)).sent[0]).toMatchObject({id:'one',del:false});expect((await stored(page)).mails[0]).toMatchObject({id:'one',unread:true});expect((await stored(page)).mails[0].del).toBeUndefined();
});
for(const width of [412,1040])test(`preview selection menu visual at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:915});await mailMenu(page,'Select emails');await mailMenu(page,'Select all');await page.getByLabel('Mail options',{exact:true}).click();
 await expect(page.getByRole('menuitem',{name:'Move to Trash',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'2 selected',exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('inbox-selection-menu.png'),fullPage:true});
 const menu=await page.getByRole('menu').boundingBox();expect(menu).not.toBeNull();expect(menu!.x).toBeGreaterThanOrEqual(0);expect(menu!.x+menu!.width).toBeLessThanOrEqual(width+1);
});
