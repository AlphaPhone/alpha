import {choosePhotoAction} from './helpers/owned-photo';
import {test,expect,type Page} from '@playwright/test';
import {photosBridge} from './helpers/photos-bridge';
import {savedInboxAttachments,savedInboxDrafts} from './inbox-draft-navigation';
import {installTelephonyFixture} from '../../scripts/fixtures/native-telephony';
const dialog=(page:Page)=>page.getByRole('dialog',{name:'Attach to email',exact:true});
const owner:[string,string,string,string]=['production','file-owner','','file-grant'];
/** `before` runs in Inbox before Photos opens, for example to leave an unfinished email there. */
async function setup(page:Page,holdRead=false,before?:(page:Page)=>Promise<void>){
 // Start from Home: Inbox must load its reviewed draft target before Photos hands it a source.
 await photosBridge(page,'full',false);
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const {Component}=await import('/src/prototype/model.js');
  // Synthetic restartable native-slot stand-in; browser production intentionally has no Inbox secret slots.
  const {secureConnectionStore:s}=await import('/src/runtime/native-connection.ts');
  s.read=async(key:string)=>structuredClone(JSON.parse(sessionStorage.getItem('file-email-slots')||'{}')[key]??null) as any;
  s.compareExchange=async(key:string,prior:unknown,next:unknown)=>{const slots=JSON.parse(sessionStorage.getItem('file-email-slots')||'{}');if(JSON.stringify(slots[key]??null)!==JSON.stringify(prior))return {status:'conflict'} as any;slots[key]=next;sessionStorage.setItem('file-email-slots',JSON.stringify(slots));return {status:'saved'} as any;};
  const {registerPlugin}=await import('/src/platform-plugins.ts');
  const f=(window as any).fileEmail={writes:0,shell:null as any};
  const write=async()=>{f.writes++;throw Error('No provider writes allowed');};
  const client={gmailAccounts:async()=>[{connectionId:'file-grant',label:'owner@example.invalid',connected:true,grantedCapabilities:['google.gmail.triage']}],gmailInboxCapabilities:async()=>({send:false,providerDrafts:false,mailboxMutations:false}),gmailSearch:async()=>({messages:[],syncedAt:'1'}),gmailPrepareOperation:write,gmailDispatchOperation:write};
  c.getCloudClient=()=>({client,sessionId:'file-session'} as any);
  const snapshot={...c.getSnapshot(),cloudAccount:{environment:'production',userId:'file-owner',sessionId:'file-session',credentialId:'fixture'}} as any;c.getSnapshot=()=>snapshot;
  const original=Component.prototype.renderVals;Component.prototype.renderVals=function(){f.shell=this;return original.call(this);};

 });
 await page.getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.getByRole('button',{name:'Compose',exact:true})).toBeEnabled();

 await before?.(page);
 await expect.poll(()=>page.evaluate(async()=>{const {VIEWS}=await import('/src/prototype/model.js');return VIEWS.inbox.fileEmailTarget().ready;})).toBe(true);
 await page.evaluate(()=>(window as any).fileEmail.shell.openView('photos',{}));
 await page.getByRole('button',{name:/^Photo, /}).click();
 expect(await page.evaluate(()=>(window as any).mediaFixture.calls.filter((c:any)=>c.method==='readPhotoSelected').length)).toBe(0);
 if(holdRead)await page.evaluate(()=>{
  const w=window as any, original=w.Capacitor.nativePromise;
  w.Capacitor.nativePromise=async(plugin:string,method:string,input:unknown)=>{
   const result=await original(plugin,method,input);
   if(plugin==='AlphaMailAttachments'&&method==='readPhotoSelected'&&!w.fileEmail.releaseAttachment)
    await new Promise<void>(resolve=>w.fileEmail.releaseAttachment=resolve);
   return result;
  };
 });
 if(holdRead)await choosePhotoAction(page,'Email');
 else {
  await choosePhotoAction(page,'Share');
  await page.getByRole('dialog',{name:'Share',exact:true}).getByRole('button',{name:'Email',exact:true}).click();
 }
 if(holdRead)await expect.poll(()=>page.evaluate(()=>typeof (window as any).fileEmail.releaseAttachment)).toBe('function');
}
test('Photos Email puts the selected source directly in an unsent draft',async({page},info)=>{
 await setup(page);
 await expect(dialog(page)).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove source.png',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('photo-email-draft.png')});
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveCount(0);
 const saved=await savedInboxAttachments(page,owner);
 expect(saved[0]).toEqual({name:'source.png',mimeType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7l8AAAAASUVORK5CYII='});
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
 expect(await page.evaluate(()=>(window as any).mediaFixture.calls.filter((c:any)=>c.method==='readPhotoSelected').length)).toBe(2);
});
for(const change of ['revision','access','owner'])test(`Photos Email refuses changed ${change}`,async({page})=>{
 await setup(page,true);
 await page.evaluate(async change=>{const f=(window as any).mediaFixture;if(change==='revision')f.row.mutationRevision='changed';else if(change==='access')f.scope='denied';else {const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');const old=c.getCloudClient()!;c.getCloudClient=()=>({...old,sessionId:'other-owner'});}},change);
 await page.evaluate(()=>(window as any).fileEmail.releaseAttachment());
 await expect(page.getByText(/changed|unavailable/i).first()).toBeVisible();
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
 await expect(page.getByRole('button',{name:'Remove source.png',exact:true})).toHaveCount(0);
});

test('Photos Email starts a new draft and leaves an unfinished email as it was',async({page})=>{
 await setup(page,false,async page=>{
  await page.getByRole('button',{name:'Compose',exact:true}).click();
  await page.getByRole('textbox',{name:'Message',exact:true}).fill('Unfinished note');
 });
 await expect(page.getByRole('button',{name:'Remove source.png',exact:true})).toBeVisible();
 await expect(page.getByRole('list',{name:'Attachments',exact:true}).getByRole('listitem')).toHaveCount(1);
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('');
 const shape=async()=>(await savedInboxDrafts(page,owner)).map(draft=>[draft.body,(draft.attachments??[]).map(file=>file.name)]);
 expect(await shape()).toEqual([['Unfinished note',[]]]);
 await page.getByRole('button',{name:'Back from draft',exact:true}).click();
 expect(await shape()).toEqual([['Unfinished note',[]],['',['source.png']]]);
 expect(await page.evaluate(()=>(window as any).fileEmail.writes)).toBe(0);
});

/** Photos with the telephony bridge; `size` is the listed picture's byte count, unknown when omitted. */
async function photoWithMessages(page:Page,size?:number){
 await page.addInitScript(installTelephonyFixture,{mms:true});
 await page.addInitScript(size=>{(window as any).__photoSize=size;},size);
 await photosBridge(page,'full',true,false,false,()=>{const w=window as any;if(typeof w.__photoSize==='number')w.mediaFixture.row.size=w.__photoSize;});
 await page.getByRole('button',{name:/^Photo, /}).click();
 await choosePhotoAction(page,'Share');
}
test('Photos Share opens an addressed-by-owner picture draft in Messages',async({page})=>{
 await photoWithMessages(page,68);
 await page.getByRole('dialog',{name:'Share',exact:true}).getByRole('button',{name:'Messages',exact:true}).click();
 await expect(page.getByRole('button',{name:/Remove picture-1\.png/})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'To',exact:true})).toHaveValue('');
 expect(await page.evaluate(()=>(window as any).telephonyInputs.filter(([method]:[string])=>method==='sendMms'||method==='sendSms'))).toEqual([]);
});
for(const [label,size] of [['an unknown size',undefined],['a size over 1 MB',1024*1024+1]] as const)test(`Photos Share does not offer Messages for a picture of ${label}`,async({page})=>{
 await photoWithMessages(page,size);
 const share=page.getByRole('dialog',{name:'Share',exact:true});
 await expect(share.getByRole('button',{name:'Email',exact:true}).or(share.getByRole('button',{name:'Share',exact:true})).first()).toBeVisible();
 await expect(share.getByRole('button',{name:'Messages',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).telephonyInputs.filter(([method]:[string])=>method==='sendMms'||method==='sendSms'))).toEqual([]);
});
