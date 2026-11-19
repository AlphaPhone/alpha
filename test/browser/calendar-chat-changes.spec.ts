import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';
import {test,expect,type Page} from '@playwright/test';

// Real renderer, pairing, connection controller, chat and Calendar; a synthetic agent whose CALENDAR action
// changes the built-in calendar at once and answers with a calendar.event effect receipt, as plugin-calendar does.
async function connect(page:Page){
 await page.addInitScript(()=>{
  const w=window as any,store=new Map();
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  const agentId='12345678-1234-4234-8234-123456789abc';
  const calendar={provider:'eliza',side:'owner',grantId:'eliza-calendar',connectorAccountId:'fixture-account',accountEmail:null,calendarId:'primary',summary:'Fixture Calendar',description:null,primary:true,accessRole:'owner',backgroundColor:null,foregroundColor:null,timeZone:'UTC',selected:true,includeInFeed:true,selectionVersion:0};
  const events:any[]=[];
  const fixture=w.calendarChatFixture={feedReads:0,unexpected:[] as string[]};
  // The built-in calendar's read routes, as the agent's CalendarService answers them.
  w.calendarChatRecords=(target:string)=>{
   const url=new URL(target,location.origin),path=url.pathname,ok=(data:any)=>data;
   if(path==='/api/lifeops/calendar/feed'){fixture.feedReads++;return ok({calendarId:'primary',events,source:'cache',state:'complete',sources:[],timeMin:url.searchParams.get('timeMin'),timeMax:url.searchParams.get('timeMax'),syncedAt:new Date().toISOString()});}
   if(path==='/api/lifeops/calendar/calendars')return ok({calendars:[calendar]});
   if(path==='/api/lifeops/calendar/next-context')return ok({event:null,readScope:{selection:'next_event',timeMin:new Date().toISOString(),timeMax:new Date(Date.now()+86400000).toISOString(),exhaustive:false},calendarFeedState:'complete',calendarSources:[],startsAt:null,startsInMinutes:null,attendeeCount:0,attendeeNames:[],location:null,conferenceLink:null,preparationChecklist:[],linkedMailState:'unavailable',linkedMailError:null,linkedMail:[]});
   if(path==='/api/notes/state')return ok({success:true,data:{notes:[],trash:[],revision:0}});
   throw Error('Unexpected Calendar fixture route '+path);
  };
  const at=(hour:number)=>new Date(new Date().setHours(hour,0,0,0)).toISOString();
  const event=(title:string,hour:number,version:number)=>({id:'chat-event',externalId:'chat-event',agentId,provider:calendar.provider,side:calendar.side,grantId:calendar.grantId,connectorAccountId:calendar.connectorAccountId,calendarId:calendar.calendarId,title,description:'',location:'',status:'confirmed',startAt:at(hour),endAt:at(hour+1),isAllDay:false,timezone:'UTC',htmlLink:null,conferenceLink:null,organizer:null,attendees:[],metadata:{etag:`"chat-event-v${version}"`},syncedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  const receipt=(operation:string)=>({receiptId:crypto.randomUUID(),operation,resource:{kind:'calendar.event',id:'chat-event'},artifacts:[],idempotency:{key:null,replayed:false},observedAt:new Date().toISOString(),outcome:'applied',commit:{kind:'durable',id:crypto.randomUUID(),committedAt:new Date().toISOString()}});
  w.Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureCompareExchange','secureRemove'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin!=='AlphaConnection')throw Error('Unexpected native call');
   if(method==='secureRead')return {value:store.get(input.slot)??null};if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return {status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return {status:'saved'};}
   if(method==='secureWrite'){store.set(input.slot,input.value);return {};}if(method==='secureRemove'){store.delete(input.slot);return {};}if(method==='cancel')return {};
   const url=new URL(input.url),path=url.pathname,ok=(data:any)=>({status:200,data});
   if(path==='/api/auth/status')return ok({required:true,authenticated:false,pairingEnabled:true,bootstrapRequired:false,instanceId:'calendar-chat-fixture',expiresAt:Date.now()+60000});
   if(path==='/api/auth/pair')return ok({token:'synthetic-session',identityId:'owner',access:'owner',instanceId:'calendar-chat-fixture'});
   if(path==='/api/auth/me')return ok({identity:{id:'owner',displayName:'Fixture owner',kind:'owner'},session:{id:'synthetic-session',kind:'machine',expiresAt:Date.now()+600000},access:{role:'OWNER',mode:'session'}});
   if(path==='/api/agents')return ok({agents:[{id:agentId,name:'Calendar chat fixture',status:'running'}]});
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'fixture-conversation',title:'Calendar chat fixture'}});
   if(path==='/api/conversations')return ok({conversations:[]});
   if(path==='/api/conversations/fixture-conversation/messages'&&input.method==='POST'){
    // The owner's words follow the client's screen observation.
    const said=String(JSON.parse(input.body).text).split('\n').pop()!,ids={messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),agentName:'Calendar chat fixture'};
    const changed=(text:string,operation:string)=>ok({...ids,text,actionResults:[{actionName:'CALENDAR',success:true,text,effectReceipts:[receipt(operation)]}]});
    if(/^add/i.test(said)){events.push(event('Lunch with Sam',12,1));return changed('Added “Lunch with Sam” to your calendar.','calendar.event.create');}
    if(/^move/i.test(said)){events[0]=event('Late lunch with Sam',15,2);return changed('Updated “Late lunch with Sam”.','calendar.event.update');}
    if(/^delete/i.test(said)){events.length=0;return changed('Deleted “Late lunch with Sam” from your calendar.','calendar.event.delete');}
    return ok({...ids,text:'Nothing changed.'});
   }
   if(path==='/api/client-devices/register')return {status:404,data:{}};
   // View reports and the workflow engine belong to routes this agent does not have.
   if(!/^\/api\/(views\/[a-z-]+\/navigate|workflow\/status)$/.test(path))fixture.unexpected.push(input.method+' '+path);
   throw Error('Unexpected fixture route '+path);
  }};
 });
 await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);await page.getByText('Local development agent',{exact:true}).click();
 const local=page.locator('.alpha-connection details').filter({has:page.getByText('Local development agent',{exact:true})});await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');await local.getByLabel('Pairing code',{exact:true}).fill('fixture-code');await local.getByRole('button',{name:'Connect local agent',exact:true}).click();await expect(page.locator('.alpha-connection-scrim')).toHaveCount(0);
 // Calendar reads its records from the resident agent only. This paired development agent stands in for it:
 // the same session and identity, with the record port answered by the fixture's calendar.
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx');
  const request=async(path:string,method:string,_body:unknown,signal:AbortSignal)=>{signal.throwIfAborted();if(method!=='GET')throw Error('The Calendar chat fixture admits no record write');return (window as any).calendarChatRecords(path);};
  c.getAppRecordClient=()=>{const session=c.getSnapshot().session;return session?{sessionId:session.sessionId,scope:undefined,identity:session,current:()=>c.getSnapshot().session===session,request} as any:null;};
 });
 await returnToApps(page);
}
async function say(page:Page,text:string){
 // An app view offers Type; Home shows the composer itself.
 const type=page.getByRole('button',{name:'Type',exact:true});if(await type.isVisible())await type.click();
 const composer=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();await composer.fill(text);await composer.press('Enter');
}
const fixture=(page:Page)=>page.evaluate(()=>(window as any).calendarChatFixture as {feedReads:number;unexpected:string[]});

test('the open Calendar follows an event the agent adds, changes and deletes from chat',async({page})=>{
 test.slow();
 // The conversation exists before Calendar opens, as it does once an owner has talked to their agent.
 await connect(page);await say(page,'Hello');await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Nothing changed.'})).toBeVisible();
 await page.getByRole('button',{name:'Minimize chat',exact:true}).press('Enter');await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.getByText('No events',{exact:true})).toBeVisible();
 const minimize=async()=>{const button=page.getByRole('button',{name:'Minimize chat',exact:true});await button.press('Enter');await expect(button).toBeHidden();};
 const reads=async()=>(await fixture(page)).feedReads;

 let before=await reads();
 await say(page,'Add lunch with Sam at noon');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Added “Lunch with Sam” to your calendar.'})).toBeVisible();
 await expect.poll(reads).toBeGreaterThan(before);
 await minimize();await expect(page.getByRole('button',{name:/^Lunch with Sam,/})).toBeVisible();

 before=await reads();
 await say(page,'Move it to 3 and call it Late lunch with Sam');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Updated “Late lunch with Sam”.'})).toBeVisible();
 await expect.poll(reads).toBeGreaterThan(before);
 await minimize();await expect(page.getByRole('button',{name:/^Late lunch with Sam,/})).toBeVisible();
 await expect(page.getByRole('button',{name:/^Lunch with Sam,/})).toHaveCount(0);

 before=await reads();
 await say(page,'Delete it');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Deleted “Late lunch with Sam” from your calendar.'})).toBeVisible();
 await expect.poll(reads).toBeGreaterThan(before);
 await minimize();await expect(page.getByText('No events',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Late lunch with Sam/})).toHaveCount(0);
 expect((await fixture(page)).unexpected).toEqual([]);
});
