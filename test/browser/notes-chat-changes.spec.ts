import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';

// Real renderer, pairing, connection controller, chat, Notes controller and editor. The agent is
// synthetic: its NOTES action commits each change in the fixture's canonical store and answers with
// the effect receipt plugin-notes attaches (notes.note.<op>; a folder move is an update). The
// canonical app-record transport is the fixture's too, bound to the paired session, as in
// canonical-notes-filter.spec.ts. Not an agent, model or device run.
const at='2026-11-17T09:00:00.000Z';
async function connect(page:Page){
 await page.addInitScript(at=>{
  const w=window as any,store=new Map();
  // The phone's own folder list (runtime/notes-folders.ts); the agent stores only each note's folderId.
  localStorage.setItem('alpha.browser.notes-folders:v1:device',JSON.stringify({version:1,folders:[{id:'f-travel',name:'Travel',createdAt:1}]}));
  const f=w.notesChat={bodies:[] as any[],saves:[] as any[],state:{revision:1,trash:[] as any[],notes:[
   {id:'pack',title:'Packing list',body:'\nPassport',color:'yellow',createdAt:at,updatedAt:at},
   {id:'old',title:'Old plan',body:'\nCancelled',color:'yellow',createdAt:at,updatedAt:at},
  ] as any[]}};
  const receipt=(op:string,id:string)=>({receiptId:crypto.randomUUID(),operation:'notes.note.'+op,resource:{kind:'notes.note',id,version:String(f.state.revision)},artifacts:[],idempotency:{key:null,replayed:false},observedAt:at,outcome:'applied',commit:{kind:'durable',id,committedAt:at}});
  const pack=()=>f.state.notes.find((note:any)=>note.id==='pack');
  const changes:Record<string,()=>unknown[]>={
   create:()=>{f.state.notes.push({id:'new',title:'Trip ideas',body:'\nLisbon',color:'yellow',createdAt:at,updatedAt:at});f.state.revision++;return [receipt('create','new')];},
   update:()=>{pack().body='\nPassport\nCharger';f.state.revision++;return [receipt('update','pack')];},
   move:()=>{pack().format={kind:'text',data:{folderId:'f-travel'}};f.state.revision++;return [receipt('update','pack')];},
   delete:()=>{f.state.trash.push({note:f.state.notes.splice(f.state.notes.indexOf(pack()),1)[0],deletedAt:at});f.state.revision++;return [receipt('delete','pack')];},
   restore:()=>{f.state.notes.push(f.state.trash.pop().note);f.state.revision++;return [receipt('restore','pack')];},
  };
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  w.Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureCompareExchange','secureRemove'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin!=='AlphaConnection')throw Error('Unexpected native call');
   if(method==='secureRead')return {value:store.get(input.slot)??null};if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return {status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return {status:'saved'};}
   if(method==='secureWrite'){store.set(input.slot,input.value);return {};}if(method==='secureRemove'){store.delete(input.slot);return {};}if(method==='cancel')return {};
   const path=new URL(input.url).pathname,ok=(data:any)=>({status:200,data});
   if(path==='/api/auth/status')return ok({required:true,authenticated:false,pairingEnabled:true,bootstrapRequired:false,instanceId:'notes-chat-fixture',expiresAt:Date.now()+60000});
   if(path==='/api/auth/pair')return ok({token:'synthetic-session',identityId:'owner',access:'owner',instanceId:'notes-chat-fixture'});
   if(path==='/api/auth/me')return ok({identity:{id:'owner',displayName:'Fixture owner',kind:'owner'},session:{id:'synthetic-session',kind:'machine',expiresAt:Date.now()+600000},access:{role:'OWNER',mode:'session'}});
   if(path==='/api/agents')return ok({agents:[{id:'12345678-1234-4234-8234-123456789abc',name:'Notes chat fixture',status:'running'}]});
   if(path==='/api/client-devices/register')return {status:404,data:{}};
   if(path==='/api/workflow/status')return ok({});
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'fixture-conversation',title:'Notes chat fixture'}});
   if(path==='/api/conversations')return ok({conversations:[]});
   if(path==='/api/conversations/fixture-conversation/messages'&&input.method==='POST'){
    const body=JSON.parse(input.body);f.bodies.push(body);
    const steps=Object.keys(changes).filter(step=>new RegExp('\\b'+step+'\\b','i').test(body.text));
    return ok({messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),agentName:'Notes chat fixture',text:'Done: '+steps.join(', ')+'.',actionResults:steps.map(step=>({success:true,effectReceipts:changes[step]()}))});
   }
   throw Error('Unexpected fixture route '+path);
  }};
 },at);
 await page.goto('/');
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx'),f=(window as any).notesChat;
  c.getAppRecordClient=()=>{
   const session=c.getSnapshot().session;
   return session?{sessionId:session.sessionId,identity:session,current:()=>c.getSnapshot().session===session,request:async(path:string,method:string,body:any)=>{
    if(path==='/api/notes/state'&&method==='GET')return {success:true,data:structuredClone(f.state)};
    if(path!=='/api/views/notes/interact'||body?.capability!=='update-note'||body.params.expectedRevision!==f.state.revision)throw Error('Unexpected canonical Notes fixture request');
    f.saves.push(structuredClone(body.params));
    const note=f.state.notes.find((row:any)=>row.id===body.params.id),split=body.params.content.indexOf('\n');
    Object.assign(note,{title:split<0?body.params.content:body.params.content.slice(0,split),body:split<0?'':body.params.content.slice(split),...(body.params.format?{format:body.params.format}:{})});f.state.revision++;
    return {requestId:crypto.randomUUID(),success:true,result:{success:true,text:'Completed',state:structuredClone(f.state),data:{note:structuredClone(note)}}};
   }} as any:null;
  };
 });
 await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);await page.getByText('Local development agent',{exact:true}).click();
 const local=page.locator('.alpha-connection details').filter({has:page.getByText('Local development agent',{exact:true})});await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');await local.getByLabel('Pairing code',{exact:true}).fill('fixture-code');await local.getByRole('button',{name:'Connect local agent',exact:true}).click();await expect(page.locator('.alpha-connection-scrim')).toHaveCount(0);
 await returnToApps(page);
}
async function say(page:Page,text:string,reply:string){
 const type=page.getByRole('button',{name:'Type',exact:true});if(await type.isVisible())await type.click();
 const composer=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();await composer.fill(text);await composer.press('Enter');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:reply})).toHaveCount(1);
}
const fixture=(page:Page)=>page.evaluate(()=>(window as any).notesChat);

test('Notes follows each note change a chat reply reports: create, update, move, delete and restore',async({page})=>{
 await connect(page);
 await page.getByRole('button',{name:'Notes',exact:true}).click();
 const row=(id:string)=>page.locator(`[data-alpha-subview="notes-list"] button.notes-row[data-alpha-note-id="${id}"]`),body=page.getByRole('textbox',{name:'Note',exact:true});
 await expect(row('pack')).toHaveCount(1);await expect(row('new')).toHaveCount(0);
 await say(page,'Create a note with trip ideas','Done: create.');
 await expect(row('new')).toContainText('Trip ideas');

 // Every message tells the agent the phone's folder names and time zone, so it can move a note by folder name.
 const sent=(await fixture(page)).bodies[0].metadata;
 expect(sent.notesFolders).toEqual([{id:'f-travel',name:'Travel'}]);
 expect(sent.uiTimeZone).toBe(await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone));

 // The open note shows an update, and keeps the folder a move put it in when the owner then edits it.
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await row('pack').click();await expect(body).toHaveValue('Passport');
 await say(page,'Update my packing list, then move it to Travel','Done: update, move.');
 await expect(body).toHaveValue('Passport\nCharger');
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await body.fill('Passport\nCharger\nAdapter');await page.getByRole('button',{name:'Back to notes',exact:true}).click();
 await expect.poll(async()=>(await fixture(page)).saves.length).toBe(1);
 expect((await fixture(page)).saves[0].format?.data?.folderId).toBe('f-travel');

 // A note deleted from chat while it is open closes, leaves the list and waits in Recently deleted; a restore returns it.
 await row('pack').click();await expect(body).toHaveValue('Passport\nCharger\nAdapter');
 await say(page,'Delete the packing list','Done: delete.');
 await expect(body).toHaveCount(0);await expect(row('pack')).toHaveCount(0);await expect(row('old')).toHaveCount(1);
 await expect.poll(async()=>(await fixture(page)).state.trash.map((entry:any)=>entry.note.id)).toEqual(['pack']);
 await expect(page.getByRole('button',{name:'Recently deleted',exact:true})).toHaveCount(0);
 await say(page,'Restore it','Done: restore.');
 await expect(row('pack')).toContainText('Packing list');await expect(page.getByRole('button',{name:'Recently deleted',exact:true})).toHaveCount(0);
});
