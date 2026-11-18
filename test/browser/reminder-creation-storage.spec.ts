import {test,expect} from '@playwright/test';
import {openBrowserCalendar} from './helpers/browser-calendar';
const key='alpha.browser.reminder-creations.v1';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/');});
test('empty reads and absent discard do not initialize creation history',async({page})=>{
 expect(await page.evaluate(async()=>{const history=await import('/src/runtime/reminder-creations.ts'),{reminderCreationDocument}=await import('/src/browser/reminder-creation-document.ts');await history.reminderCreations();await history.discardUndispatchedCreation({id:'absent',request:{id:'absent',title:'Absent',body:'',at:Date.now()+3600000},state:'pending'});return (await reminderCreationDocument.capture()).snapshot??null;})).toBeNull();
});
test('two tabs retain all pending requests without scheduling reminders',async({page,context})=>{
 const other=await context.newPage();await other.goto('/');
 await Promise.all([page,other].map((tab,index)=>tab.evaluate(async index=>{const {retainReminderCreation}=await import('/src/runtime/reminder-creations.ts');for(let i=0;i<10;i++){const id=`tab-${index}-${i}`;await retainReminderCreation({id,request:{id,title:id,body:'',at:Date.now()+3600000},state:'pending'});}},index)));
 await page.reload();
 expect(await page.evaluate(async key=>{const {reminderCreations}=await import('/src/runtime/reminder-creations.ts'),{BrowserDaily}=await import('/src/browser/daily.ts');return {ids:Object.keys(await reminderCreations()).sort(),scheduled:(await new BrowserDaily().listReminders()).reminders.length,legacy:localStorage.getItem(key)};},key)).toEqual({ids:Array.from({length:2},(_,tab)=>Array.from({length:10},(_,i)=>`tab-${tab}-${i}`)).flat().sort(),scheduled:0,legacy:null});
});
test('failed commit preserves pending identity and rejects stale acknowledgement',async({page})=>{
 expect(await page.evaluate(async key=>{const {retainReminderCreation,discardUndispatchedCreation,reminderCreations}=await import('/src/runtime/reminder-creations.ts');const row={id:'retained',request:{id:'retained',title:'Retained',body:'',at:Date.now()+3600000},state:'pending' as const};await retainReminderCreation(row);const put=IDBObjectStore.prototype.put;let failed=false,stale=false;IDBObjectStore.prototype.put=function(v,k){if(k===key)throw Error('Full');return put.call(this,v,k);};try{await discardUndispatchedCreation(row);}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}try{await discardUndispatchedCreation({...row,request:{...row.request,title:'Other'}});}catch{stale=true;}return {failed,stale,retained:JSON.stringify((await reminderCreations())[row.id])===JSON.stringify(row)};},key)).toEqual({failed:true,stale:true,retained:true});
});
test('a stale recovery capture cannot erase a newer pending request',async({page})=>{
 expect(await page.evaluate(async()=>{const {reminderCreationDocument}=await import('/src/browser/reminder-creation-document.ts'),{retainReminderCreation,reminderCreations}=await import('/src/runtime/reminder-creations.ts');const before=await reminderCreationDocument.capture();await retainReminderCreation({id:'newer',request:{id:'newer',title:'Newer',body:'',at:Date.now()+3600000},state:'pending'});let rejected=false;try{await reminderCreationDocument.reset(before);}catch{rejected=true;}return {rejected,pending:Object.keys(await reminderCreations())};})).toEqual({rejected:true,pending:['newer']});
});
