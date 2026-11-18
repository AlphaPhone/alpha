import {chooseMailAction} from '../test/browser/helpers/mail-actions.ts';
/** Real rendered Inbox controls, synthetic Cloud/storage boundary; never real mail. */
import assert from 'node:assert/strict';
import type { CloudServiceSession, ConnectionSnapshot } from '../apps/app/src/runtime/connection-ui.tsx';
import type { inboxLocalStore } from '../apps/app/src/runtime/inbox-local-store.ts';
import type { LocalMailDraft } from '../apps/app/src/ui/mailbox/drafts-controller.ts';
import { playwright } from './fixtures/playwright.ts';
import { inboxMemoryStore } from './fixtures/inbox-memory.ts';
declare global {
 interface Window {
  fixtureRead: typeof inboxLocalStore.read;
  fixtureCAS: typeof inboxLocalStore.compareExchange;
  fixtureOriginalCAS: typeof inboxLocalStore.compareExchange;
  releaseDraftSave?: () => void;
  inboxFixture: {calls: string[]; account: string; session: string; owner: string; snapshot: ConnectionSnapshot & { cloudAccount: CloudServiceSession }};
 }
}
const url=process.env.ALPHA_INBOX_TEST_URL||'http://127.0.0.1:5197';
if(new URL(url).hostname!=='127.0.0.1')throw Error('Local Vite required');
const {chromium}=playwright(import.meta.url),browser=await chromium.launch({headless:true});
const slots=new Map<string, unknown>();let writes=0;
const store=inboxMemoryStore(slots);
type DraftShelf = {owner: string; items: {draft: LocalMailDraft; toQ: string}[]};
function savedShelf(value: unknown): DraftShelf {
 assert.ok(value && typeof value === 'object' && 'items' in value && Array.isArray(value.items));
 return value as DraftShelf;
}
try{
 const page=await browser.newPage({viewport:{width:412,height:915},reducedMotion:'reduce'});page.setDefaultTimeout(10000);await page.addInitScript(()=>{localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));localStorage.setItem('alpha.startup-permissions.v1',JSON.stringify({dismissed:true,attempted:{}}));localStorage.setItem('alpha:startup-permission-walkthrough:v1',JSON.stringify({version:1,status:'completed',step:4}));});
 await page.exposeFunction('fixtureRead',store.read);
 await page.exposeFunction('fixtureCAS',(...args: Parameters<typeof store.compareExchange>)=>{writes++;return store.compareExchange(...args);});
 async function setup(){await page.goto(url);await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {inboxLocalStore:s}=await import('/src/runtime/inbox-local-store.ts');
  s.read=slot=>window.fixtureRead(slot);s.compareExchange=(...args)=>window.fixtureCAS(...args);
  const {CloudProtocol} = await import('/src/runtime/cloud-protocol.ts');
  const cloudAccount: CloudServiceSession = {environment:'production',userId:'fixture-owner',sessionId:'fixture-cloud',credentialId:'fixture-only'};
  window.inboxFixture={calls:[],account:'a',session:cloudAccount.sessionId,owner:cloudAccount.userId,snapshot:{...c.getSnapshot(),cloudAccount}};
  const mail={id:'fixture-message',threadId:'fixture-thread',from:'Synthetic sender',fromEmail:'sender@example.invalid',to:['owner@example.invalid'],subject:'Reply fixture',snippet:'Synthetic',receivedAt:'2026-09-30T00:00:00Z',unread:false};
  const unexpected = async () => { throw Error('Unexpected Cloud operation in synthetic Inbox fixture'); };
  const client = new CloudProtocol('production', unexpected, {read: async () => null, write: unexpected, clear: unexpected}, unexpected);
  client.gmailAccounts=async()=>{window.inboxFixture.calls.push('accounts');const id=window.inboxFixture.account;return [{connectionId:id,label:'Fixture '+id,configured:true,connected:true,reason:'fixture',grantedCapabilities:['google.gmail.triage']}];};
  client.gmailSearch=async()=>{window.inboxFixture.calls.push('search');return {messages:[mail],syncedAt:'fixture-revision',nextPageToken:null,supportsSpamTrash:false};};
  client.gmailRead=async()=>{window.inboxFixture.calls.push('read');return {message:mail,bodyText:'Synthetic message body',historyId:null,links:[],attachments:[]};};
  c.getCloudClient=()=>({client,sessionId:window.inboxFixture.session,credentialId:cloudAccount.credentialId});
  c.getSnapshot=()=>window.inboxFixture.snapshot;
 });await page.getByRole('button',{name:'Inbox',exact:true}).and(page.locator('[data-mobile-shell-tile]')).click();await page.getByRole('button',{name:'Refresh inbox',exact:true}).waitFor();}
 const button = (name:string)=>page.getByRole('button',{name,exact:true});
 const message = page.getByRole('textbox',{name:'Message',exact:true});
 const closeDraft = async()=>{await button('Back from draft').click();await message.waitFor({state:'hidden'});};
 const draftBySubject = (subject:string)=>[...slots.values()].flatMap(value=>savedShelf(value).items).find(row=>row.draft.subject===subject)?.draft;
 const switchAccount=(account: string, session: string)=>page.evaluate(({account,session})=>{
  const fixture=window.inboxFixture;
  fixture.account=account;fixture.session=session;
  fixture.snapshot={...fixture.snapshot,cloudAccount:{...fixture.snapshot.cloudAccount,sessionId:session}};
  window.dispatchEvent(new Event('alpha:google-accounts-changed'));
 }, {account,session});
 const openDrafts = async()=>{
  if(await button('Back to inbox').isVisible()) await button('Back to inbox').click();
  if(await page.getByRole('heading',{name:'Drafts',exact:true}).count()) return;
  await button('Other mail folders').click();
  await page.getByRole('menuitemradio',{name:'Drafts',exact:true}).click();
 };
 const reopenLocalDraft=async(subject:string)=>{
  await openDrafts();
  await button('Local draft, '+subject).click();
  await message.waitFor();
 };
 const subject='Private fixture draft',body='Exact local body\nsecond line',reply='Re: Reply fixture';
 await setup();
 await button('Compose').click();
 const to=page.getByRole('textbox',{name:'To',exact:true});
 await to.fill('literal@example.invalid');await to.press('Enter');
 await page.getByRole('textbox',{name:'Subject',exact:true}).fill(subject);
 await message.fill(body);
 assert.equal(await button('Send email').isDisabled(),true);
 assert.equal(await button('Save draft').count(),0);
 assert.equal(await button('Discard draft').count(),0);
 await closeDraft();
 assert.equal(slots.size,1);
 assert.equal(draftBySubject(subject)?.body,body);

 await setup();await reopenLocalDraft(subject);
 assert.equal(await message.inputValue(),body);
 await closeDraft();
 await switchAccount('b','fixture-cloud-b');
 await button('Refresh inbox').waitFor();await button('Compose').click();
 await page.getByText('From Fixture b',{exact:true}).waitFor();
 assert.equal(await message.inputValue(),'');
 await closeDraft();
 assert.equal(slots.size,1,'closing an empty message in B keeps the draft in A');
 assert.equal(draftBySubject(subject)?.body,body);

 await switchAccount('a','fixture-cloud');
 await button('Inbox').click();
 await button('Synthetic sender, Reply fixture').click();
 await chooseMailAction(page,'Reply');
 await message.fill('Reply draft only');
 await closeDraft();
 assert.deepEqual(draftBySubject(reply)?.reply,{messageId:'fixture-message',threadId:'fixture-thread'});

 await reopenLocalDraft(reply);
 await message.fill('Keep edits after storage failure');
 await page.evaluate(async()=>{
  const {inboxLocalStore:s}=await import('/src/runtime/inbox-local-store.ts');
  window.fixtureOriginalCAS=s.compareExchange;
  s.compareExchange=async()=>{throw Error('Synthetic unavailable');};
 });
 await button('Back from draft').click();
 await page.getByText('Synthetic unavailable',{exact:true}).first().waitFor();
 assert.equal(await message.inputValue(),'Keep edits after storage failure');
 assert.equal(draftBySubject(reply)?.body,'Reply draft only');
 await page.evaluate(async()=>{
  (await import('/src/runtime/inbox-local-store.ts')).inboxLocalStore.compareExchange=window.fixtureOriginalCAS;
 });
 await closeDraft();
 assert.equal(draftBySubject(reply)?.body,'Keep edits after storage failure');

 await reopenLocalDraft(reply);
 const [key,old]=[...slots.entries()][0];
 const competing=savedShelf(old);
 slots.set(key,{...competing,items:competing.items.map(row=>row.draft.subject===reply
  ?{...row,draft:{...row.draft,revision:'other-window-revision',body:'Other window committed'}}:row)});
 await message.fill('Stale window edit');
 await button('Back from draft').click();
 await page.getByText(/Drafts changed in another window/).first().waitFor();
 assert.equal(draftBySubject(reply)?.body,'Other window committed');
 assert.equal(await message.inputValue(),'Stale window edit');

 await setup();await reopenLocalDraft(reply);
 await message.fill('Original owner late save');
 await page.evaluate(async()=>{
  const {inboxLocalStore:s}=await import('/src/runtime/inbox-local-store.ts');
  const original=s.compareExchange;
  s.compareExchange=async(...args)=>{
   await new Promise<void>(resolve=>window.releaseDraftSave=resolve);
   return original(...args);
  };
 });
 await button('Back from draft').click();
 await page.waitForFunction(()=>!!window.releaseDraftSave);
 await page.evaluate(async()=>{
  const f=window.inboxFixture;
  f.session='replacement-session';f.owner='replacement-owner';
  f.snapshot={...f.snapshot,cloudAccount:{...f.snapshot.cloudAccount,userId:'replacement-owner',sessionId:'replacement-session'}};
  (await import('/src/runtime/connection-ui.tsx')).connectionController.close();
 });
 await button('Refresh inbox').waitFor();await button('Compose').click();
 assert.equal(await message.inputValue(),'');
 await message.fill('Replacement owner unsaved');
 await page.evaluate(()=>{if(!window.releaseDraftSave)throw Error('Expected a pending draft save');window.releaseDraftSave();});
 await page.waitForFunction(async key=>{
  const shelf=await window.fixtureRead<DraftShelf>(key);
  return shelf?.items.some(row=>row.draft.body==='Original owner late save');
 },key);
 assert.equal(await message.inputValue(),'Replacement owner unsaved');
 assert.equal(slots.size,1);
 assert.ok(savedShelf(slots.get(key)).owner.includes('fixture-owner'));
 assert.equal(draftBySubject(reply)?.body,'Original owner late save');
 assert.ok((await page.evaluate(()=>window.inboxFixture.calls)).every(call=>['accounts','read','search'].includes(call)));
 assert.ok(writes>=4);
 console.log('PASS rendered Inbox save on Back, exact reload, account isolation, reply identity, storage failure and retry, concurrent edits and delayed save. No provider writes.');
}finally{await browser.close();}
