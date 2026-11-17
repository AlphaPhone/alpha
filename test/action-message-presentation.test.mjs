import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const bundle=await build({entryPoints:['apps/app/src/runtime/action-message-presentation.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {projectActionMessages,browserNavigationSummary,succeededBrowserDestination,mapsChatText}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const notice='Review on phone';
const old='Opened an approved HTTPS destination in a new browser tab. Page loading is not verified.';
const legacySummary='Opened example.com.';
const tabCreated='Created a browser tab for example.com.';
const user={id:'user',from:'user',text:'Open example.com'};
const action={id:'action',from:'agent',text:'Open browser destination https://example.com/path',card:{proposalId:'p',title:'Completed',sub:old,done:true}};
const render=rows=>rows.map(m=>({...m,c:m.card,cGeneric:!!m.card,displayText:m.text,hasCalendarText:true}));
test('completed action projects one truthful result without changing stored history',()=>{
 const rows=[user,{id:'notice',from:'agent',text:notice},action,{id:'device-receipt:p',from:'agent',text:old,deviceReceipt:true}];const frozen=structuredClone(rows);const shown=projectActionMessages(render(rows),rows);
 assert.deepEqual(shown.map(m=>m.id),['user','action']);assert.equal(shown[1].displayText,tabCreated);assert.equal(shown[1].cGeneric,false);assert.deepEqual(rows,frozen);
});
test('pending review keeps its existing approve/cancel handlers and shows the destination once',()=>{
 const rows=[user,{...action,card:{...action.card,done:false}}];const approve=()=>{},cancel=()=>{};const projected=render(rows);projected[1]={...projected[1],cDigest:true,rows:[{open:approve},{open:cancel}]};const shown=projectActionMessages(projected,rows)[1];assert.equal(shown.hasCalendarText,false);assert.equal(shown.rows[0].who,'example.com');assert.equal(shown.rows[0].open,approve);assert.equal(shown.rows[1].open,cancel);
});
test('failures remain visible once, user quotes and unrelated later messages are preserved',()=>{
 const failed={...action,card:{...action.card,title:'Not completed',sub:'The browser is unavailable.'}};const rows=[user,failed,{id:'device-receipt:p',from:'agent',text:'The browser is unavailable.',deviceReceipt:true},{id:'next',from:'user',text:notice},{id:'later',from:'agent',text:old}];const shown=projectActionMessages(render(rows),rows);assert.deepEqual(shown.map(m=>m.id),['user','action','next','later']);assert.equal(shown[1].displayText,'The browser is unavailable.');assert.equal(shown[2].text,notice);
});
test('an unconfirmed action remains uncertain, appears once and never rewrites its stored receipt',()=>{
 const summary='The action could not reach a confirmed result.';
 const uncertain={...action,card:{...action.card,title:'Not confirmed',sub:summary}};
 const rows=[{...user,text:summary},uncertain,{id:'device-receipt:p',from:'agent',text:summary,deviceReceipt:true}];
 const frozen=structuredClone(rows),shown=projectActionMessages(render(rows),rows);
 assert.deepEqual(shown.map(m=>m.id),['user','action']);assert.equal(shown[0].text,summary);
 assert.equal(shown[1].displayText,'I couldn’t confirm the result. Check the app before trying again.');
 assert.equal(shown[1].cGeneric,false);assert.deepEqual(rows,frozen);
});
test('the current SDK uncertainty fallback gets the same safe presentation',()=>{
 const summary='Action did not reach a confirmed result. Check action history before requesting it again.';
 const rows=[{id:'current',from:'agent',text:summary,deviceReceipt:true}],frozen=structuredClone(rows);
 assert.equal(projectActionMessages(render(rows),rows)[0].displayText,'I couldn’t confirm the result. Check the app before trying again.');assert.deepEqual(rows,frozen);
});
test('standalone unconfirmed receipts get safe copy while specific results and ordinary prose remain intact',()=>{
 const generic='The action could not reach a confirmed result.',specific='Clock result is unknown. Check Clock before repeating the request.';
 const rows=[{id:'generic',from:'agent',text:generic,deviceReceipt:true},{id:'specific',from:'agent',text:specific,deviceReceipt:true},{id:'prose',from:'agent',text:generic}];
 const frozen=structuredClone(rows),shown=projectActionMessages(render(rows),rows);
 assert.equal(shown[0].displayText,'I couldn’t confirm the result. Check the app before trying again.');
 assert.equal(shown[1].displayText,specific);assert.equal(shown[2].displayText,generic);assert.deepEqual(rows,frozen);
});
test('restored verified browser receipt hides only exact protocol instruction in its turn',()=>{
 const rows=[user,{id:'n',from:'agent',text:notice},{id:'receipt',from:'agent',text:old,deviceReceipt:true,browserDestination:'https://example.com/'}];const shown=projectActionMessages(render(rows),rows);assert.deepEqual(shown.map(m=>m.id),['user','receipt']);assert.equal(shown[1].displayText,tabCreated);assert.equal(projectActionMessages(render([rows[1]]),[rows[1]]).length,1);
});
test('receipt names the created tab and refuses a malformed or non-HTTPS destination',()=>{
 assert.equal(browserNavigationSummary('https://example.com/path'),tabCreated);
 assert.throws(()=>browserNavigationSummary('http://example.com/'));
 assert.throws(()=>browserNavigationSummary('not a URL'));
});

test('a completed Browser card preserves its unsynced receipt notice',()=>{
 const pending=' Not synced yet; open action history to retry.';
 for(const summary of [tabCreated,legacySummary]){
  const rows=[user,{...action,card:{...action.card,sub:summary+pending}}];
  assert.equal(projectActionMessages(render(rows),rows)[1].displayText,tabCreated+pending);
 }
});

import {DeviceActions,actionScope} from './fixtures/device-action-policy.mjs';
async function restoredReceipt(change=()=>{}){
 const operation={type:'browser_navigate',url:'https://example.com/'};
 const proposal={id:'p',state:'done',requestMessageId:'user',attemptId:'attempt',digest:'digest',operation,providerReceipt:{outcome:'applied',operationId:'effect'}};
 const entry={scope:'scope',phase:'terminal',status:'succeeded',attemptId:'attempt',operationId:'effect',operationHash:await actionScope(JSON.stringify(operation)),summary:old,result:{operationId:'effect'},record:{operation,digest:'digest',ownerId:'owner',agentId:'agent',sessionId:'session',origin:'origin',installationId:'installation',enrollmentId:'enrollment'}};
 const owner=new DeviceActions({ownerId:'owner',agentId:'agent',origin:'origin'},{installationId:'installation',enrollmentId:'enrollment'},'scope',async()=>{}, {get:async()=>({entry})},async()=>{throw Error('No navigation during history');});
 owner.list=async()=>[proposal];
 change(proposal,entry);return owner.conversationReceipts(new Set(['user']),new AbortController().signal);
}
test('cold history reads one fully matched browser receipt without executing navigation',async()=>{
 const result=await restoredReceipt();assert.equal(result.length,1);assert.equal(result[0].summary,tabCreated);assert.equal(result[0].browserDestination,'https://example.com/');
});
test('cold history refuses uncertain, foreign, changed or contradictory browser receipts',async()=>{
 for(const change of [(p,e)=>e.status='unknown',(p,e)=>e.phase='applying',(p,e)=>e.record.ownerId='foreign',(p,e)=>e.record.enrollmentId='foreign',(p,e)=>e.record.operation={type:'browser_navigate',url:'https://other.example/'},(p,e)=>e.operationHash='wrong',(p,e)=>e.attemptId='stale',(p,e)=>p.providerReceipt.operationId='other',(p,e)=>p.providerReceipt.outcome='unconfirmed',(p,e)=>p.providerReceipt.result={},(p,e)=>p.requestMessageId='other'])assert.equal((await restoredReceipt(change)).length,0);
});

test('automatic live receipt replaces the exact protocol pause without needing an approval card',()=>{
 const rows=[user,{id:'protocol',from:'agent',text:notice},{id:'result',from:'agent',text:tabCreated,deviceReceipt:true}];const shown=projectActionMessages(render(rows),rows);assert.deepEqual(shown.map(m=>m.id),['user','result']);assert.equal(shown[1].displayText,tabCreated);
});


test('equal summaries never hide another proposal receipt or an unbound message',()=>{
 for(const following of [
  {id:'device-receipt:other',from:'agent',text:old,deviceReceipt:true},
  {id:'unbound',from:'agent',text:old},
  {id:'device-receipt:p',from:'agent',text:old},
 ]) {
  const rows=[user,action,following];
  const shown=projectActionMessages(render(rows),rows);
  assert.deepEqual(shown.map(message=>message.id),rows.map(message=>message.id));
 }
});

test('a queued proposal and its later exact receipt show one result across the request turn',()=>{
 const queued={id:'queued',from:'agent',text:'Clock action',card:{proposalId:'clock',title:'Completed',sub:'Alarm saved.',done:true}};
 const receipt={id:'device-receipt:clock',from:'agent',text:'Alarm saved.',deviceReceipt:true};
 const reply={id:'reply',from:'agent',text:'Development reply.'};
 const rows=[queued,user,reply,receipt],original=structuredClone(rows);
 const shown=projectActionMessages(render(rows),rows);
 assert.deepEqual(shown.map(message=>message.id),['queued','user','reply']);
 assert.equal(shown[0].displayText,'Alarm saved.');
 assert.deepEqual(rows,original);
});

test('cross-turn collapse retains pending, foreign, quoted, different and offscreen results',()=>{
 const queued={id:'queued',from:'agent',text:'Clock action',card:{proposalId:'clock',title:'Completed',sub:'Alarm saved.',done:true}};
 const receipt={id:'device-receipt:clock',from:'agent',text:'Alarm saved.',deviceReceipt:true};
 for(const [card,result] of [
  [{...queued,card:{...queued.card,done:false}},receipt],
  [queued,{...receipt,id:'device-receipt:another'}],
  [queued,{...receipt,from:'user'}],
  [queued,{...receipt,deviceReceipt:false}],
  [queued,{...receipt,text:'Alarm was not saved.'}],
 ]) {
  const rows=[card,user,result];
  assert.deepEqual(projectActionMessages(render(rows),rows).map(message=>message.id),rows.map(message=>message.id));
 }
 const rows=[queued,user,receipt],visible=render([user,receipt]);
 assert.deepEqual(projectActionMessages(visible,rows).map(message=>message.id),['user','device-receipt:clock']);
});

// Live 2026-10-30 tj-79465dcbc873b2 "open example.com": the direct Browser open showed the reply
// "Opening example.com." and then the device receipt "Opened example.com.". The reply is the one answer.
const browserReply={id:'reply',from:'agent',text:'Opening example.com.'};
const browserReceipt={id:'device-receipt:p',from:'agent',text:legacySummary,deviceReceipt:true,inReplyTo:'user',browserDestination:'https://example.com'};
test('a requested Browser open answered by the agent reply shows that reply once, live or restored',()=>{
 for(const rows of [[user,browserReply,browserReceipt],[user,browserReceipt,browserReply],[user,browserReply,{...browserReceipt,inReplyTo:undefined}],[user,{id:'n',from:'agent',text:notice},browserReply,browserReceipt]]){
  const frozen=structuredClone(rows);
  assert.deepEqual(projectActionMessages(render(rows),rows).map(message=>message.id),['user','reply']);
  assert.deepEqual(rows,frozen);
 }
});
test('failed, other, unanswered and offscreen-reply receipts stay visible',()=>{
 for(const rows of [
  [user,browserReply,{id:'device-receipt:p',from:'agent',text:'Approved browser navigation is unavailable. No page opened.',deviceReceipt:true}],
  [user,browserReply,{id:'device-receipt:n',from:'agent',text:'Note saved.',deviceReceipt:true}],
  [user,{...browserReply,interrupted:true},browserReceipt],
  [user,{...browserReply,text:''},browserReceipt],
  [user,browserReply,{id:'next',from:'user',text:'Thanks'},browserReceipt],
 ])assert.deepEqual(projectActionMessages(render(rows),rows).map(message=>message.id),rows.map(message=>message.id));
 const rows=[user,browserReply,browserReceipt];
 assert.deepEqual(projectActionMessages(render([user,browserReceipt]),rows).map(message=>message.id),['user','device-receipt:p']);
});
test('only a browser proposal receipt that succeeded with its exact summary names its destination',()=>{
 const card={id:'p',description:'Open browser destination https://example.com'},opened={status:'succeeded',summary:tabCreated};
 assert.equal(succeededBrowserDestination(card,opened),'https://example.com');
 assert.equal(succeededBrowserDestination(card,{...opened,summary:legacySummary}),'https://example.com');
 for(const [proposal,receipt] of [
  [card,{status:'succeeded',summary:tabCreated+' Server receipt is pending; check action history.'}],
  [card,{status:'succeeded',summary:legacySummary+' Not synced yet; open action history to retry.'}],
  [card,{status:'failed',summary:'Approved browser navigation is unavailable. No page opened.'}],
  [card,{...opened,status:'unknown'}],
  [{id:'p',description:'Open browser destination https://other.example'},opened],
  [{id:'p',description:'Open browser destination http://example.com'},opened],
  [{id:'p',description:'Save one note'},opened],
  [null,opened],[undefined,opened],
 ])assert.equal(succeededBrowserDestination(proposal,receipt),undefined);
});

// Telephony receipts are journalled and sent to the agent in words about the owner; the owner reads their own wording.
test('a telephony receipt reads in the second person on screen while the stored summary stays as the agent received it',async()=>{
 const receipts=await build({stdin:{contents:"export * from './apps/app/src/ui/telephony/telephony-receipt-text.ts';export {actionResultText} from './apps/app/src/runtime/action-message-presentation.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
 const {telephonyActionResultText,phoneDialResultText,actionResultText}=await import('data:text/javascript;base64,'+Buffer.from(receipts.outputFiles[0].text).toString('base64'));
 const statuses={'phone-call':['placed','emergency-handoff','not-found','busy','unavailable','cancelled','failed'],'contact-write':['saved','deleted','not-found','stale','unavailable','cancelled','failed','unknown'],'contact-show':['shown','not-found','unavailable'],'contact-read':['read','none-selected','unavailable'],
  'sms-compose':['drafted','submitted','sent','delivered','unknown','not-found','unavailable','cancelled','failed'],'sms-reply':['drafted','none-selected','occupied','unavailable'],
  'voicemail-delete':['deleted','none-selected','unavailable','cancelled','failed'],'messages-read':['read','none-selected','unavailable'],'voicemail-read':['read','none-selected','unavailable']};
 const summaries=[...Object.entries(statuses).flatMap(([kind,list])=>list.map(status=>telephonyActionResultText({kind,status}))),...['handed-off','cancelled','unavailable','failed'].map(status=>phoneDialResultText({kind:'phone-dial',status,handler:null,contact:false}))];
 assert.equal(new Set(summaries).size,summaries.length);
 for(const summary of summaries){const shown=actionResultText(summary);assert.doesNotMatch(shown,/\bowner\b/i,summary);assert.equal(actionResultText(shown),shown,'showing it twice changes nothing');}
 const placed=telephonyActionResultText({kind:'phone-call',status:'placed'}),dismissed=telephonyActionResultText({kind:'sms-compose',status:'cancelled'});
 assert.match(placed,/^The owner approved/);
 assert.equal(actionResultText(placed),'Calling. Alpha can’t tell whether it was answered.');
 assert.equal(actionResultText(dismissed),'You dismissed the message. Nothing was sent.');
 // The chat card and the receipt bubble show the owner's wording; the stored rows are untouched.
 const done={id:'action',from:'agent',text:'Call Priya',card:{proposalId:'p',title:'Completed',sub:placed,done:true}},bubble={id:'device-receipt:q',from:'agent',text:dismissed,deviceReceipt:true};
 const rows=[user,done,{id:'u2',from:'user',text:'text Sam'},bubble],frozen=structuredClone(rows),shown=projectActionMessages(render(rows),rows);
 assert.equal(shown.find(m=>m.id==='action').displayText,'Calling. Alpha can’t tell whether it was answered.');
 assert.equal(shown.find(m=>m.id==='device-receipt:q').displayText,'You dismissed the message. Nothing was sent.');
 assert.deepEqual(rows,frozen);
});
const mapsCard=body=>mapsChatText(`Maps\n\n[MAPSCARD]\n${JSON.stringify(body)}\n[/MAPSCARD]`).cards[0];
test('a Maps locate card takes its subject from the card fields, and from the prompt only when an older agent names none',()=>{
 const pharmacy={name:'Corner Pharmacy',latitude:37.79,longitude:-122.4,provider:'eliza-cloud',providerPlaceId:'g:p1',categories:[]};
 const nearPrompt='I need your precise location to search near you for “coffee”.';
 // The card's own query wins over the prompt's wording.
 assert.deepEqual(mapsCard({kind:'locate',intent:'place-near',prompt:nearPrompt,query:'espresso bar'}),{kind:'locate',title:'“espresso bar” near you',lines:['Map searches around this phone · Location not shared with chat'],attribution:'',mapQuery:'espresso bar',nearMe:true});
 assert.equal(mapsCard({kind:'locate',intent:'place-near',prompt:nearPrompt}).mapQuery,'coffee');
 // A resolved destination is carried whole, with the travel mode, and is never searched again by name.
 const exact=mapsCard({kind:'locate',intent:'route-origin',prompt:'I need your precise location to start the route to Corner Pharmacy.',destination:pharmacy,travelMode:'walk'});
 assert.deepEqual(exact,{kind:'locate',title:'Directions to Corner Pharmacy',lines:['Map plans the route from this phone · Location not shared with chat'],attribution:'',place:pharmacy,directionsFromHere:true,travelMode:'walk'});
 // A kind of place: search around the phone, then directions to the closest.
 const nearest=mapsCard({kind:'locate',intent:'route-origin',prompt:'I need your precise location to start the route to pharmacy.',query:'pharmacy'});
 assert.equal(nearest.mapQuery,'pharmacy');assert.equal(nearest.nearMe,true);assert.equal(nearest.directionsFromHere,true);assert.equal(nearest.place,undefined);
 // An older agent: the destination name from the prompt, searched by name.
 const old=mapsCard({kind:'locate',intent:'route-origin',prompt:'I need your precise location to start the route to Corner Pharmacy.'});
 assert.equal(old.mapQuery,'Corner Pharmacy');assert.equal(old.nearMe,undefined);assert.equal(old.directionsFromHere,true);
 // An invalid optional field is dropped and the card still reads from the prompt.
 assert.equal(mapsCard({kind:'locate',intent:'place-near',prompt:nearPrompt,query:'x'.repeat(501),travelMode:'teleport'}).mapQuery,'coffee');
 // Place and hand-off cards keep the exact place, so "Show on map" opens it under its name.
 assert.deepEqual(mapsCard({kind:'place',place:pharmacy,attribution:null}).place,pharmacy);
});
