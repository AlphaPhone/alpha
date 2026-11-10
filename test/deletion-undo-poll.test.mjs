// The pending-deletion status read and the browser deletion twins. The component runs with
// stand-in React hooks and a controlled deletions port and timer; no renderer, journal or
// provider is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {build,buildSync} from 'esbuild';

const stubs={
 '../prototype/note-origin-adapter':'export const forgetNoteOrigin = async () => {}; export const savedNoteOrigin = () => false;',
 './connection-ui':'export const connectionController = { getSnapshot: () => ({session: null}), subscribe: () => () => {} };',
 'react':'export const useEffect = effect => { globalThis.harness.cleanup = effect(); }; export const useRef = current => ({current}); export const useState = value => [value, () => {}];',
 './deletions':'export const deletions = { pending: () => globalThis.harness.pending() }; export const refreshDeletionViews = () => {};',
 '../browser/screen-locked':'export const browserScreenLocked = () => false;',
 './deletion-window':'export const UNDO_TOO_LATE = ""; export const undoConfirmed = () => false;',
 './deletion-undo.css':'',
 'react/jsx-runtime':'export const jsx = () => null, jsxs = jsx, Fragment = null;',
};
const bundled=(await build({entryPoints:[resolve('apps/app/src/runtime/deletion-undo.tsx')],bundle:true,write:false,format:'iife',globalName:'Undo',platform:'browser',plugins:[{name:'ports',setup(builder){
 builder.onResolve({filter:/.*/},args=>{if(args.kind==='entry-point')return;if(!(args.path in stubs))throw new Error(`Unreviewed dependency ${args.path}`);return {path:args.path,namespace:'port'};});
 builder.onLoad({filter:/.*/,namespace:'port'},args=>({contents:stubs[args.path],loader:'ts'}));
}}]})).outputFiles[0].text;
function mount(rows,hidden=false){
 const timers=new Map();let id=0,reads=0;const listeners={};
 const harness={pending:async()=>{reads++;const rows=harness.rows;await harness.gate;if(harness.fail)throw Error('offline');return {deletions:rows,deletedOrigins:[]};},rows,fail:false,gate:undefined};
 const document={hidden,addEventListener:(name,listener)=>{listeners[name]=listener;},removeEventListener(){}};
 const context=vm.createContext({harness,document,window:{addEventListener:(name,listener)=>{listeners[name]=listener;},removeEventListener(){}},console,
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>{timers.delete(key);}});
 vm.runInContext(bundled,context);
 context.Undo.DeletionUndo();
 const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
 return {harness,document,listeners,timers,settle,api:context.Undo,reads:()=>reads,delays:()=>[...timers.values()].map(timer=>timer.ms),fire:async()=>{const [[key,timer]]=[...timers];timers.delete(key);timer.fn();await settle();}};
}
const queued={kind:'calendar',id:'d1',phase:'queued',target:{}};

test('the delay follows what is pending: close while a deletion waits, slow otherwise, none while hidden',()=>{
 const {api}=mount([]);
 assert.equal(api.deletionPollDelay({hidden:false,pending:true,failures:0}),api.DELETION_POLL_ACTIVE);
 assert.equal(api.deletionPollDelay({hidden:false,pending:false,failures:0}),api.DELETION_POLL_IDLE);
 assert.equal(api.deletionPollDelay({hidden:true,pending:true,failures:0}),undefined);
 assert.equal(api.deletionPollDelay({hidden:false,pending:false,failures:1}),api.DELETION_POLL_ACTIVE,'a read that just failed is retried soon');
 assert.equal(api.deletionPollDelay({hidden:false,pending:false,failures:3}),api.DELETION_POLL_IDLE,'a failing source is not polled closely for ever');
 assert.equal(api.DELETION_POLL_ACTIVE,500);assert.ok(api.DELETION_POLL_IDLE>=5000);
});

test('with nothing pending the status is read on change events and a slow fallback only',async()=>{
 const view=mount([]);await view.settle();
 assert.equal(view.reads(),1);assert.deepEqual(view.delays(),[view.api.DELETION_POLL_IDLE],'one slow timer, no 500 ms interval');
 view.harness.rows=[queued];view.listeners['alpha:deletions-changed']();await view.settle();
 assert.equal(view.reads(),2,'a staged deletion is read at once');assert.deepEqual(view.delays(),[view.api.DELETION_POLL_ACTIVE],'and then followed closely');
 await view.fire();assert.equal(view.reads(),3);assert.deepEqual(view.delays(),[view.api.DELETION_POLL_ACTIVE]);
 view.harness.rows=[{...queued,phase:'deleted'}];await view.fire();
 assert.deepEqual(view.delays(),[view.api.DELETION_POLL_IDLE],'a settled deletion returns to the slow fallback');
 view.harness.cleanup();assert.equal(view.timers.size,0,'unmounting leaves no timer');
});

test('a hidden page schedules no read and resumes when shown',async()=>{
 const view=mount([queued],true);await view.settle();
 assert.equal(view.reads(),0);assert.equal(view.timers.size,0,'nothing is scheduled while hidden');
 view.document.hidden=false;view.listeners.visibilitychange();await view.settle();
 assert.equal(view.reads(),1);assert.deepEqual(view.delays(),[view.api.DELETION_POLL_ACTIVE]);
 view.document.hidden=true;await view.fire();
 assert.equal(view.reads(),1);assert.equal(view.timers.size,0,'hiding again stops the schedule');
});

test('a change announced during a read is not missed until the slow fallback',async()=>{
 const view=mount([]);await view.settle();
 let open;view.harness.gate=new Promise(resolve=>{open=resolve;});
 view.listeners['alpha:deletions-changed']();await view.settle();assert.equal(view.reads(),2);
 view.harness.rows=[queued];view.harness.gate=undefined;view.listeners['alpha:deletions-changed']();await view.settle();
 assert.equal(view.reads(),2,'reads stay one at a time');
 open();await view.settle();
 assert.equal(view.reads(),3,'the announced change is read as soon as the earlier read ends');
 assert.deepEqual(view.delays(),[view.api.DELETION_POLL_ACTIVE]);
});

const load=entry=>import('data:text/javascript;base64,'+Buffer.from(buildSync({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',loader:{'.css':'empty'},define:{'import.meta.env':'{}'}}).outputFiles[0].text).toString('base64'));
test('a second Undo of an undone deletion returns the same receipt in both browser twins',async()=>{
 const calendar=await load('apps/app/src/browser/calendar-deletions.ts'),reminders=await load('apps/app/src/browser/reminder-deletions.ts');
 const event={id:'event',calendarId:'local',title:'Kept',body:'',location:'',begin:Date.UTC(2026,0,1,9),end:Date.UTC(2026,0,1,10),revision:'r1',timeZone:'UTC'};
 const events={sourceRevision:'s1',events:[event]};
 calendar.stageCalendarDeletion(events,event,'event','owner','delete');
 const first=calendar.undoCalendarDeletion(events,'delete',()=>true),again=calendar.undoCalendarDeletion(events,'delete',()=>true);
 assert.equal(first.phase,'undone');assert.deepEqual(again,first);assert.equal(events.events.length,1);
 assert.throws(()=>calendar.undoCalendarDeletion(events,'delete',()=>false),/owner changed/,'the owner check still applies');
 const data={sourceRevision:'s1',reminders:[{id:'r',revision:'r1',title:'Kept',body:'',at:1500,dueAt:1500,occurrenceId:'o',status:'scheduled',mode:'inexact',createdAt:1}]};
 reminders.stageReminderDeletion(data,data.reminders[0],'owner','delete');
 const undone=reminders.undoReminderDeletion(data,'delete',()=>true),repeated=reminders.undoReminderDeletion(data,'delete',()=>true);
 assert.equal(undone.phase,'undone');assert.deepEqual(repeated,undone);assert.equal(data.reminders[0].pendingDeletion,undefined);assert.equal(data.reminders[0].status,'scheduled');
});

test('deletion phases are the ones a journal stores; block reasons are not phases',()=>{
 const source=readFileSync('apps/app/src/runtime/deletion-window.ts','utf8');
 const union=name=>[...source.match(new RegExp(`export type ${name}=([^;]+);`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
 assert.deepEqual(union('DeletePhase'),['queued','paused','dispatching','undone','deleted','conflict','unknown']);
 assert.deepEqual(union('DeletionBlock'),['owner-changed','permission-required']);
 for(const file of ['apps/app/src/browser/calendar-deletions.ts','apps/app/src/browser/reminder-deletions.ts'])assert.match(readFileSync(file,'utf8'),/blocked\?:DeletionBlock/,file);
});
